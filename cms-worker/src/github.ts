/**
 * GitHub repo strony: odczyt pliku z gałęzi, commit wielu plików naraz (Git Data API)
 * i stan workflow wdrożenia. Repo jest publiczne, więc odczyt działa też bez tokenu;
 * zapis (commit) wymaga GITHUB_TOKEN (fine-grained, Contents: Read and write, jedno repo).
 */
import type { DeployRun } from '../../packages/cms-core/src/index'
import { LIMITS, type Env } from './env'

/** Workflow, który buduje i wypycha stronę publiczną. */
export const DEPLOY_WORKFLOW = 'deploy.yml'

const validRepo = (repo: string | undefined): repo is string => Boolean(repo && /^[\w.-]+\/[\w.-]+$/.test(repo))
export const repoConfigured = (env: Env) => validRepo(env.GITHUB_REPO)
export const pushConfigured = (env: Env) => Boolean(env.GITHUB_TOKEN && validRepo(env.GITHUB_REPO))
export const branchOf = (env: Env) => (env.GITHUB_BRANCH && /^[\w./-]+$/.test(env.GITHUB_BRANCH) ? env.GITHUB_BRANCH : 'main')
export const repoUrl = (env: Env) => (validRepo(env.GITHUB_REPO) ? `https://github.com/${env.GITHUB_REPO}` : null)

export class GithubError extends Error {
  constructor(public status: number, public step: string) {
    super(`github ${step}: ${status}`)
  }
}

async function call<T>(env: Env, fetcher: typeof fetch, step: string, path: string, init: { method?: string, body?: unknown } = {}): Promise<T> {
  if (!validRepo(env.GITHUB_REPO)) throw new GithubError(0, 'repo')
  let response: Response
  try {
    response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
      method: init.method ?? 'GET',
      signal: AbortSignal.timeout(LIMITS.providerTimeoutMs),
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'demrise-cms',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  }
  catch {
    throw new GithubError(0, step)
  }
  if (!response.ok) throw new GithubError(response.status, step)
  return await response.json() as T
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, ch => ch.charCodeAt(0)))
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000))
  return btoa(binary)
}

export interface RepoFile { sha: string, text: string }

/** Plik z gałęzi produkcyjnej (sha blobu + treść). null: pliku nie ma. */
export async function readRepoFile(env: Env, fetcher: typeof fetch, path: string, ref = branchOf(env)): Promise<RepoFile | null> {
  try {
    const file = await call<{ sha: string, content?: string, encoding?: string }>(env, fetcher, 'read', `/contents/${path}?ref=${encodeURIComponent(ref)}`)
    if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new GithubError(0, 'read')
    return { sha: file.sha, text: decodeBase64Utf8(file.content) }
  }
  catch (error) {
    if (error instanceof GithubError && error.status === 404) return null
    throw error
  }
}

export interface CommitFile { path: string, content: string, encoding: 'utf-8' | 'base64' }

/**
 * Jeden commit z wieloma plikami na czubku gałęzi. `expectBlob`: commit tylko, jeśli plik
 * na gałęzi to wciąż ta wersja (nikt nie zmienił go w międzyczasie). Ref przesuwany bez force:
 * gdy gałąź uciekła, GitHub odrzuca (422) i nic nie jest nadpisane.
 */
export async function commitFiles(env: Env, fetcher: typeof fetch, message: string, files: CommitFile[], expectBlob?: { path: string, sha: string | null }): Promise<{ sha: string, url: string }> {
  const branch = branchOf(env)
  const ref = await call<{ object: { sha: string } }>(env, fetcher, 'ref', `/git/ref/heads/${branch}`)
  const head = ref.object.sha
  if (expectBlob) {
    const current = await readRepoFile(env, fetcher, expectBlob.path, head)
    if ((current?.sha ?? null) !== expectBlob.sha) throw new GithubError(409, 'moved')
  }
  const commit = await call<{ tree: { sha: string } }>(env, fetcher, 'commit', `/git/commits/${head}`)
  const tree = []
  for (const file of files) {
    const blob = await call<{ sha: string }>(env, fetcher, 'blob', '/git/blobs', { method: 'POST', body: { content: file.content, encoding: file.encoding } })
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha })
  }
  const newTree = await call<{ sha: string }>(env, fetcher, 'tree', '/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree } })
  const created = await call<{ sha: string, html_url: string }>(env, fetcher, 'create', '/git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [head] } })
  await call(env, fetcher, 'update', `/git/refs/heads/${branch}`, { method: 'PATCH', body: { sha: created.sha, force: false } })
  return { sha: created.sha, url: created.html_url }
}

interface GithubRun { status: string, conclusion: string | null, created_at: string, html_url: string }

/** Ostatnie uruchomienie workflow wdrożenia na gałęzi produkcyjnej. null: brak albo błąd GitHuba. */
export async function lastDeployRun(env: Env, fetcher: typeof fetch): Promise<DeployRun | null> {
  try {
    const data = await call<{ workflow_runs?: GithubRun[] }>(env, fetcher, 'runs', `/actions/workflows/${DEPLOY_WORKFLOW}/runs?branch=${encodeURIComponent(branchOf(env))}&per_page=1`)
    const run = data.workflow_runs?.[0]
    return run ? { status: run.status, conclusion: run.conclusion, createdAt: run.created_at, url: run.html_url } : null
  }
  catch {
    return null
  }
}
