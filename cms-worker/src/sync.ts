/**
 * Synchronizacja panel ↔ repo strony.
 *
 * - Repo (snapshot na gałęzi produkcyjnej) to opublikowana prawda strony; panel trzyma szkice,
 *   historię i użytkowników. `sync_state` pamięta wersję repo z ostatniej synchronizacji (baza).
 * - Import (repo → panel): trójstronnie. Zmiana tylko w repo trafia do panelu jako publikacja
 *   (rewizja 'import'); szkic przejmuje ją tylko, jeśli nie był ruszany. Zmiana po obu stronach
 *   = konflikt do rozstrzygnięcia w panelu. Uruchamiany: workflow po pushu, cron, pulpit.
 * - Wypchnięcie (panel → repo): najpierw import, przy konfliktach odmowa; potem jeden commit
 *   (snapshot + tokens.css + nowe media). Commit na gałęzi produkcyjnej uruchamia wdrożenie.
 */
import type { DeployResponse, PendingChange, PublishedSite, PushResponse, ResolveChoice, SyncConflict, SyncPullResponse } from '../../packages/cms-core/src/index'
import { buildPublishedSite, validateEntityData } from '../../packages/cms-core/src/index'
import { generateTokensCss } from '../../scripts/tokens-css.mjs'
import { audit } from './audit'
import type { Ctx } from './context'
import { randomId } from './crypto'
import { titleFor } from './entities'
import { bytesToBase64, commitFiles, type CommitFile, GithubError, lastDeployRun, pushConfigured, readRepoFile, repoConfigured, repoUrl } from './github'
import { requirePermission } from './guard'
import { fail, json, readJson } from './http'
import { hit } from './ratelimit'
import { toEntity, type EntityRow, type MediaRow } from './rows'
import { entriesOf, gitBlobSha, mediaRefs, parseKey, pendingChanges, same, stableJson, threeWay } from './snapshot'

interface SyncStateRow { repo_sha: string, base_json: string, conflicts_json: string, synced_at: string }

interface ImportResult { status: 'imported' | 'up_to_date' | 'initialized', applied: string[], conflicts: string[], base: PublishedSite }

const now = (ctx: Ctx) => new Date(ctx.deps.now()).toISOString()

function layout(ctx: Ctx) {
  if (!ctx.deps.repo || !repoConfigured(ctx.env)) throw fail(503, 'sync_not_configured')
  return ctx.deps.repo
}

async function loadState(ctx: Ctx): Promise<SyncStateRow | null> {
  return ctx.env.DB.prepare('SELECT repo_sha, base_json, conflicts_json, synced_at FROM sync_state WHERE id = 1').first<SyncStateRow>()
}

async function publishedRows(ctx: Ctx): Promise<EntityRow[]> {
  return (await ctx.env.DB.prepare('SELECT * FROM entities WHERE published_json IS NOT NULL').all<EntityRow>()).results
}

const localSite = async (ctx: Ctx) => buildPublishedSite((await publishedRows(ctx)).map(toEntity), new Date(ctx.deps.now()))

function parseSite(text: string): PublishedSite {
  const site = JSON.parse(text) as PublishedSite
  if (!site || typeof site !== 'object' || typeof site.pages !== 'object' || typeof site.globals !== 'object' || typeof site.components !== 'object') {
    throw fail(502, 'sync_bad_snapshot')
  }
  return site
}

/** Wiersz encji dla klucza snapshotu (component po id, reszta po rodzaju i slugu). */
async function rowFor(ctx: Ctx, key: string): Promise<EntityRow | null> {
  const ref = parseKey(key)
  if (!ref) return null
  if (ref.kind === 'component') return ctx.env.DB.prepare('SELECT * FROM entities WHERE kind = \'component\' AND id = ?').bind(ref.ident).first<EntityRow>()
  return ctx.env.DB.prepare('SELECT * FROM entities WHERE kind = ? AND slug = ?').bind(ref.kind, ref.ident).first<EntityRow>()
}

function titleOfKey(ctx: Ctx, key: string, value: unknown): string {
  const ref = parseKey(key)
  if (!ref) return key
  return titleFor(ref.kind, ref.ident, value, ctx.deps.schema, ref.kind === 'page' ? `/${ref.ident}` : ref.ident)
}

/** Przyjęcie wersji z repo dla jednego klucza (undefined = usunięte w repo: zdjęcie publikacji). */
async function applyFromRepo(ctx: Ctx, key: string, value: unknown, repoSite: PublishedSite): Promise<boolean> {
  const ref = parseKey(key)
  if (!ref) return false
  const row = await rowFor(ctx, key)
  const at = now(ctx)
  if (value === undefined) {
    if (!row || row.published_json === null) return true
    await ctx.env.DB.prepare('UPDATE entities SET published_json = NULL, published_at = NULL, published_by = NULL WHERE id = ?').bind(row.id).run()
    return true
  }
  // Treść z repo przechodzi tę samą walidację co zapis w panelu; błędna nie wchodzi.
  const issues = validateEntityData(ref.kind, value, ctx.deps.schema, { slug: ref.ident, components: repoSite.components })
  if (issues.length) {
    console.log(JSON.stringify({ event: 'import', key, status: 'invalid', issues: issues.slice(0, 5) }))
    return false
  }
  const data = JSON.stringify(value)
  let id = row?.id
  if (!row) {
    id = ref.kind === 'component' || ref.kind === 'tokens' ? ref.ident : `${ref.kind}_${ref.ident || 'home'}`
    await ctx.env.DB.prepare(
      `INSERT INTO entities (id, kind, slug, title, draft_json, draft_rev, published_json, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    ).bind(id, ref.kind, ref.kind === 'component' ? ref.ident : ref.ident, titleOfKey(ctx, key, value), data, data, at, at).run()
  }
  else {
    // Szkic przejmuje zmianę tylko, gdy nikt go nie ruszał (szkic == stara publikacja).
    const untouched = row.published_json !== null && same(JSON.parse(row.draft_json), JSON.parse(row.published_json))
    await ctx.env.DB.prepare(
      untouched
        ? 'UPDATE entities SET published_json = ?1, published_at = ?2, published_by = NULL, draft_json = ?1, draft_rev = draft_rev + 1, updated_at = ?2, updated_by = NULL WHERE id = ?3'
        : 'UPDATE entities SET published_json = ?1, published_at = ?2, published_by = NULL WHERE id = ?3',
    ).bind(data, at, row.id).run()
  }
  await ctx.env.DB.prepare(
    `INSERT INTO revisions (id, entity_id, version, kind, data_json, created_at, created_by)
     SELECT ?, ?, COALESCE(MAX(version), 0) + 1, 'import', ?, ?, NULL FROM revisions WHERE entity_id = ?`,
  ).bind(randomId('rev'), id, data, at, id).run()
  return true
}

/** Import repo → panel. Bezpieczny do wielokrotnego wywołania (bez zmian w repo nic nie robi). */
export async function importFromRepo(ctx: Ctx): Promise<ImportResult> {
  const repo = layout(ctx)
  const file = await readRepoFile(ctx.env, ctx.deps.fetch, repo.snapshotPath)
  if (!file) throw fail(502, 'sync_no_snapshot')
  const repoSite = parseSite(file.text)
  const state = await loadState(ctx)
  const at = now(ctx)

  if (!state) {
    // Pierwsza synchronizacja: stan repo staje się bazą; różnice panelu czekają na wypchnięcie.
    await ctx.env.DB.prepare('INSERT INTO sync_state (id, repo_sha, base_json, conflicts_json, synced_at) VALUES (1, ?, ?, \'[]\', ?)')
      .bind(file.sha, file.text, at).run()
    return { status: 'initialized', applied: [], conflicts: [], base: repoSite }
  }
  const known: SyncConflict[] = JSON.parse(state.conflicts_json)
  if (state.repo_sha === file.sha) return { status: 'up_to_date', applied: [], conflicts: known.map(c => c.key), base: repoSite }

  const repoEntries = entriesOf(repoSite)
  const result = threeWay(repoEntries, entriesOf(parseSite(state.base_json)), entriesOf(await localSite(ctx)))
  const applied: string[] = []
  for (const [key, value] of result.apply) {
    if (await applyFromRepo(ctx, key, value, repoSite)) applied.push(key)
  }

  // Konflikty: dotychczasowe + nowe; znikają same, gdy panel i repo znów są zgodne.
  const local = entriesOf(await localSite(ctx))
  const byKey = new Map(known.map(c => [c.key, c]))
  for (const key of result.conflicts) byKey.set(key, { key, title: titleOfKey(ctx, key, repoEntries.get(key) ?? local.get(key)), detectedAt: at })
  const conflicts = [...byKey.values()].filter(c => !same(local.get(c.key), repoEntries.get(c.key)))

  await ctx.env.DB.prepare('UPDATE sync_state SET repo_sha = ?, base_json = ?, conflicts_json = ?, synced_at = ? WHERE id = 1')
    .bind(file.sha, file.text, JSON.stringify(conflicts), at).run()
  if (applied.length || result.conflicts.length) await audit(ctx, 'import', ctx.user?.id ?? null, null, { applied, conflicts: result.conflicts, sha: file.sha })
  return { status: 'imported', applied, conflicts: conflicts.map(c => c.key), base: repoSite }
}

function githubFailure(error: unknown): never {
  if (error instanceof GithubError) {
    console.log(JSON.stringify({ event: 'sync', step: error.step, status: error.status }))
    if (error.status === 409 || error.status === 422) throw fail(409, 'sync_repo_moved')
    throw fail(502, 'sync_github_failed', { step: error.step })
  }
  throw error
}

/** Publiczne „pobierz z repo” (workflow po pushu). Treść czytana z repo, nie z requestu. */
export async function syncPull(ctx: Ctx): Promise<Response> {
  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (!(await hit(ctx, 'sync', ip, 20, 15 * 60 * 1000))) return json({ error: 'rate_limited' }, 429)
  try {
    const result = await importFromRepo(ctx)
    const body: SyncPullResponse = result.status === 'imported' ? { status: 'imported', applied: result.applied, conflicts: result.conflicts } : { status: result.status }
    return json(body)
  }
  catch (error) {
    githubFailure(error)
  }
}

async function pendingFor(ctx: Ctx, base: PublishedSite): Promise<PendingChange[]> {
  return pendingChanges(entriesOf(await localSite(ctx)), entriesOf(base), (key, value) => titleOfKey(ctx, key, value))
}

export async function getDeploy(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_EDIT')
  let pending: PendingChange[] | null = null
  try {
    pending = await pendingFor(ctx, (await importFromRepo(ctx)).base)
  }
  catch (error) {
    console.log(JSON.stringify({ event: 'deploy_status', error: error instanceof Error ? error.message : 'unknown' }))
  }
  const state = await loadState(ctx)
  const body: DeployResponse = {
    canPush: pushConfigured(ctx.env) && Boolean(ctx.deps.repo),
    lastRun: await lastDeployRun(ctx.env, ctx.deps.fetch),
    pending,
    conflicts: state ? JSON.parse(state.conflicts_json) : [],
    syncedAt: state?.synced_at ?? null,
    repoUrl: repoUrl(ctx.env),
  }
  return json(body)
}

async function mediaFiles(ctx: Ctx, mediaDir: string, local: PublishedSite, base: PublishedSite): Promise<CommitFile[]> {
  const known = mediaRefs(base)
  const files: CommitFile[] = []
  for (const [url, [id, filename]] of mediaRefs(local)) {
    if (known.has(url)) continue
    const row = await ctx.env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<MediaRow>()
    if (!row || row.filename !== filename) throw fail(409, 'sync_media_missing', { url })
    const bytes = await ctx.env.MEDIA.get(row.kv_key, 'arrayBuffer')
    if (!bytes) throw fail(409, 'sync_media_missing', { url })
    files.push({ path: `${mediaDir}/${id}/${filename}`, content: bytesToBase64(bytes), encoding: 'base64' })
  }
  return files
}

/** „Wypchnij na stronę”: commit opublikowanej treści do repo (uruchamia wdrożenie). */
export async function push(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_PUBLISH')
  const repo = layout(ctx)
  if (!pushConfigured(ctx.env)) throw fail(503, 'push_not_configured')
  try {
    const { base } = await importFromRepo(ctx)
    const state = await loadState(ctx)
    const conflicts: SyncConflict[] = state ? JSON.parse(state.conflicts_json) : []
    if (conflicts.length) throw fail(409, 'sync_conflict', { conflicts })

    const local = await localSite(ctx)
    const changes = await pendingFor(ctx, base)
    if (!changes.length) return json({ status: 'up_to_date' } satisfies PushResponse)

    const snapshot = stableJson(local)
    const files: CommitFile[] = [{ path: repo.snapshotPath, content: snapshot, encoding: 'utf-8' }]
    if (repo.tokensCss) files.push({ path: repo.tokensCss.path, content: generateTokensCss(local.tokens, repo.tokensCss.map), encoding: 'utf-8' })
    files.push(...await mediaFiles(ctx, repo.mediaDir, local, base))

    const user = ctx.user!
    const titles = changes.map(c => c.title)
    const summary = titles.length > 3 ? `${titles.slice(0, 3).join(', ')} i ${titles.length - 3} więcej` : titles.join(', ')
    const commit = await commitFiles(ctx.env, ctx.deps.fetch, `CMS: ${summary} (${user.name})`, files, { path: repo.snapshotPath, sha: state?.repo_sha ?? null })

    await ctx.env.DB.prepare('UPDATE sync_state SET repo_sha = ?, base_json = ?, synced_at = ? WHERE id = 1')
      .bind(await gitBlobSha(snapshot), snapshot, now(ctx)).run()
    await audit(ctx, 'push', user.id, null, { commit: commit.sha, keys: changes.map(c => c.key) })
    return json({ status: 'pushed', commitUrl: commit.url, changes } satisfies PushResponse)
  }
  catch (error) {
    githubFailure(error)
  }
}

/** Konflikt: 'repo' = weź wersję z repo do panelu; 'cms' = zostaw panel (wypchnięcie nadpisze repo). */
export async function resolveConflict(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_PUBLISH')
  const body = await readJson(ctx.request)
  const choice = body.choice as ResolveChoice
  if (typeof body.key !== 'string' || (choice !== 'repo' && choice !== 'cms')) throw fail(400, 'bad_request')
  const state = await loadState(ctx)
  const conflicts: SyncConflict[] = state ? JSON.parse(state.conflicts_json) : []
  if (!state || !conflicts.some(c => c.key === body.key)) throw fail(404, 'not_found')
  if (choice === 'repo') {
    const base = parseSite(state.base_json)
    if (!(await applyFromRepo(ctx, body.key, entriesOf(base).get(body.key), base))) throw fail(422, 'sync_invalid_repo_content')
  }
  await ctx.env.DB.prepare('UPDATE sync_state SET conflicts_json = ? WHERE id = 1')
    .bind(JSON.stringify(conflicts.filter(c => c.key !== body.key))).run()
  await audit(ctx, 'sync_resolve', ctx.user!.id, null, { key: body.key, choice })
  return json({ ok: true })
}

