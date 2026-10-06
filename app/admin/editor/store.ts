/**
 * Stan edytora wizualnego jednej strony: encja strony + globale (draft, autosave osobno
 * per encja), komponenty i tokeny (podgląd), zaznaczenie, urządzenie, tryb, undo/redo.
 * Wszystkie zmiany idą przez commitPage/commitGlobal → historia + autosave.
 */
import type { ComponentDocument, Device, Entity, EntitySummary, GlobalDocument, PageDocument, PublishResponse, SaveDraftResponse, TokensDocument } from '@demrise/cms-core'
import { CmsError, deepEqual, setAtPath, updateBlockProps } from '@demrise/cms-core'
import { computed, markRaw, reactive } from 'vue'
import { siteSchema } from '~~/cms/schema'
import { cmsApi } from '../api'
import { errorMessage } from '../format'
import { useCmsSession } from '../session'
import { useAdminToast } from '../toast'
import type { AutosaveStatus } from './autosave'
import { AutosaveQueue } from './autosave'
import { clearBackup, readBackup, writeBackup } from './backup'
import { EditHistory } from './history'
import type { CanvasTarget, EditMode, FrameState } from './protocol'
import { levelAllowed } from './protocol'
import { resolvedProps, resolveTarget } from './targets'

export const schema = siteSchema

export interface EntityState<T> {
  id: string
  kind: Entity['kind']
  slug: string
  title: string
  data: T
  published: T | null
  draftRev: number
  updatedAt: string
  status: AutosaveStatus
}

interface Snapshot { page: PageDocument, globals: Record<string, GlobalDocument> }

const MODE_KEY = 'cms:editor-mode'

/**
 * Dokumenty trzymamy jako surowe obiekty (markRaw): zmieniamy je zawsze przez podmianę całości
 * (rdzeń jest niemutujący), a rdzeń używa structuredClone, który nie przyjmuje proxy Vue.
 */
const raw = <T>(value: T): T => (value !== null && typeof value === 'object' ? markRaw(value as object) as T : value)

function toState<T>(entity: Entity): EntityState<T> {
  return {
    id: entity.id,
    kind: entity.kind,
    slug: entity.slug,
    title: entity.title,
    data: raw(entity.draft as T),
    published: raw(entity.published as T | null),
    draftRev: entity.draftRev,
    updatedAt: entity.updatedAt,
    status: 'saved',
  }
}

export function createEditorStore(pageId: string) {
  const session = useCmsSession()
  const toast = useAdminToast()
  const queues = new Map<string, AutosaveQueue<unknown>>()
  let history: EditHistory<Snapshot> | null = null

  const state = reactive({
    loading: true,
    loadError: '',
    page: null as EntityState<PageDocument> | null,
    /** Globale po slugu ('site', 'workshop'). */
    globals: {} as Record<string, EntityState<GlobalDocument>>,
    /** Komponenty globalne po id i po slugu (ref instancji może wskazywać jedno albo drugie). */
    components: {} as Record<string, ComponentDocument>,
    componentIds: {} as Record<string, string>,
    tokens: null as TokensDocument | null,
    selection: null as CanvasTarget | null,
    device: 'desktop' as Device,
    mode: 'safe' as EditMode,
    showHidden: true,
    canUndo: false,
    canRedo: false,
    conflict: null as { id: string, server: Entity } | null,
    /** Kopie niezapisanych zmian z sessionStorage (po zamknięciu karty / awarii). */
    backups: [] as { id: string, data: unknown }[],
  })

  const canEdit = computed(() => session.can('CONTENT_EDIT'))
  const maxMode = computed<EditMode>(() => session.mode.value)

  const entityById = (id: string): EntityState<unknown> | undefined =>
    (state.page?.id === id ? state.page : Object.values(state.globals).find(g => g.id === id)) as EntityState<unknown> | undefined

  const snapshot = (): Snapshot => ({
    page: state.page!.data,
    globals: Object.fromEntries(Object.entries(state.globals).map(([slug, g]) => [slug, g.data])),
  })

  const syncHistoryFlags = () => {
    state.canUndo = history?.canUndo ?? false
    state.canRedo = history?.canRedo ?? false
  }

  function queueFor(entity: EntityState<unknown>): AutosaveQueue<unknown> {
    let queue = queues.get(entity.id)
    if (queue) return queue
    queue = new AutosaveQueue<unknown>({
      baseRev: entity.draftRev,
      save: (data, baseRev) => cmsApi.put<SaveDraftResponse>(`/api/entities/${encodeURIComponent(entity.id)}/draft`, { baseRev, data }),
      onStatus: (status) => {
        const target = entityById(entity.id)
        if (target) target.status = status
      },
      onSaved: (result) => {
        const target = entityById(entity.id)
        if (target) {
          target.draftRev = result.draftRev
          target.updatedAt = result.updatedAt
        }
        if (!queue!.hasUnsaved) clearBackup(entity.id)
      },
      onConflict: (body) => {
        const server = (body as { entity?: Entity } | null)?.entity
        if (server) state.conflict = { id: entity.id, server }
        else toast.show('Konflikt wersji: odśwież edytor', 'danger')
      },
      onError: error => toast.show(`Nie zapisano zmian: ${errorMessage(error)}`, 'danger'),
    })
    queues.set(entity.id, queue)
    return queue
  }

  function schedule(entity: EntityState<unknown>) {
    queueFor(entity).schedule(entity.data)
    writeBackup(entity.id, { baseRev: queueFor(entity).baseRev, data: entity.data })
  }

  /* ---------- Zmiany ---------- */

  function commitPage(next: PageDocument, coalesceKey?: string) {
    if (!state.page || next === state.page.data) return
    state.page.data = raw(next)
    schedule(state.page as EntityState<unknown>)
    history?.push(snapshot(), coalesceKey)
    syncHistoryFlags()
  }

  function commitGlobal(slug: string, next: GlobalDocument, coalesceKey?: string) {
    const entity = state.globals[slug]
    if (!entity || next === entity.data) return
    entity.data = raw(next)
    schedule(entity as EntityState<unknown>)
    history?.push(snapshot(), coalesceKey)
    syncHistoryFlags()
  }

  /** Operacja na dokumencie strony z rdzenia (move, hide, duplicate…); CmsError → toast. */
  function pageOp(op: (doc: PageDocument) => PageDocument, success?: string): boolean {
    if (!state.page) return false
    if (!canEdit.value) {
      toast.show('Brak uprawnień do edycji treści', 'warning')
      return false
    }
    try {
      commitPage(op(state.page.data))
      if (success) toast.show(success, 'success')
      return true
    }
    catch (error) {
      toast.show(errorMessage(error), 'danger')
      return false
    }
  }

  const siteView = () => ({ globals: snapshot().globals, components: state.components })

  /**
   * Zmiana wartości pola wskazanego celem (canvas albo inspektor). Dla instancji komponentu
   * globalnego zapis trafia do overrides, tylko dla pól z `exposed` (cały klucz najwyższego poziomu).
   */
  function setField(target: CanvasTarget, path: string, value: unknown, coalesce = true): boolean {
    if (!state.page) return false
    const full: CanvasTarget = target.kind === 'global' ? { ...target, field: path } : { ...target, field: path }
    const resolved = resolveTarget(full, state.page.data, siteView(), schema, { mode: state.mode, canEdit: canEdit.value })
    const seoLock = resolved.field?.tab === 'seo' && !session.can('SEO_EDIT')
    if (resolved.lock || seoLock) {
      toast.show(resolved.lock ?? 'Brak uprawnień SEO', 'warning')
      return false
    }
    if (deepEqual(resolved.value, value)) return true
    const key = coalesce ? `${target.kind === 'global' ? target.global : target.blockId}:${path}` : undefined
    try {
      if (target.kind === 'global') {
        commitGlobal(target.global, setAtPath(state.globals[target.global]!.data, path, value), key)
        return true
      }
      const block = resolved.block!
      if (block.type === 'global') {
        const top = path.split('.')[0]!
        const rest = path.slice(top.length + 1)
        const current = resolvedProps(block, state.components)[top]
        commitPage(updateBlockProps(state.page.data, block.id, top, rest ? setAtPath(current, rest, value) : value), key)
      }
      else {
        commitPage(updateBlockProps(state.page.data, block.id, path, value), key)
      }
      return true
    }
    catch (error) {
      toast.show(errorMessage(error), 'danger')
      return false
    }
  }

  function setSeo(path: string, value: unknown) {
    if (!state.page) return
    if (!session.can('SEO_EDIT')) return void toast.show('Brak uprawnienia SEO_EDIT', 'warning')
    const field = schema.seoFields.find(f => f.key === path.split('.')[0])
    if (field && !levelAllowed(field.level, state.mode)) return
    commitPage({ ...state.page.data, seo: setAtPath(state.page.data.seo, path, value) }, `seo:${path}`)
  }

  /* ---------- Undo / redo ---------- */

  function restoreSnapshot(snap: Snapshot) {
    if (state.page && snap.page !== state.page.data) {
      state.page.data = snap.page
      schedule(state.page as EntityState<unknown>)
    }
    for (const [slug, data] of Object.entries(snap.globals)) {
      const entity = state.globals[slug]
      if (entity && entity.data !== data) {
        entity.data = data
        schedule(entity as EntityState<unknown>)
      }
    }
    syncHistoryFlags()
  }

  const undo = () => {
    const snap = history?.undo()
    if (snap) restoreSnapshot(snap)
  }
  const redo = () => {
    const snap = history?.redo()
    if (snap) restoreSnapshot(snap)
  }
  const breakCoalescing = () => history?.breakCoalescing()

  /* ---------- Wczytanie i serwer ---------- */

  async function load() {
    state.loading = true
    state.loadError = ''
    try {
      const entity = await cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(pageId)}`)
      if (entity.kind !== 'page') throw new CmsError('not_page', 'Ta encja nie jest stroną')
      const lists = await Promise.all((['global', 'component', 'tokens'] as const).map(kind =>
        cmsApi.get<{ items: EntitySummary[] }>(`/api/entities?kind=${kind}`)))
      const summaries = lists.flatMap(l => l.items)
      const full = await Promise.all(summaries.map(s => cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(s.id)}`)))

      state.page = toState<PageDocument>(entity)
      state.globals = {}
      state.components = {}
      state.componentIds = {}
      for (const e of full) {
        if (e.kind === 'global') state.globals[e.slug] = toState<GlobalDocument>(e)
        else if (e.kind === 'component') {
          const doc = raw(e.draft as ComponentDocument)
          state.components[e.id] = doc
          state.components[e.slug] = doc
          state.componentIds[e.id] = e.id
          state.componentIds[e.slug] = e.id
        }
        else if (e.kind === 'tokens' && !state.tokens) state.tokens = raw(e.draft as TokensDocument)
      }
      history = new EditHistory<Snapshot>(snapshot(), { limit: 100, coalesceMs: 1500 })
      syncHistoryFlags()

      state.backups = []
      for (const e of [state.page, ...Object.values(state.globals)] as EntityState<unknown>[]) {
        const backup = readBackup(e.id)
        if (backup && backup.baseRev === e.draftRev && !deepEqual(backup.data, e.data)) state.backups.push({ id: e.id, data: backup.data })
        else if (backup) clearBackup(e.id)
      }

      try {
        const saved = localStorage.getItem(MODE_KEY) as EditMode | null
        if (saved && levelAllowed(saved, maxMode.value)) state.mode = saved
      }
      catch { /* brak storage: tryb SAFE */ }
    }
    catch (error) {
      state.loadError = errorMessage(error)
    }
    finally {
      state.loading = false
    }
  }

  function setMode(mode: EditMode) {
    if (!levelAllowed(mode, maxMode.value)) return
    state.mode = mode
    try {
      localStorage.setItem(MODE_KEY, mode)
    }
    catch { /* tylko wygoda */ }
  }

  function applyBackup(id: string, accept: boolean) {
    const backup = state.backups.find(b => b.id === id)
    state.backups = state.backups.filter(b => b.id !== id)
    if (!backup) return
    if (!accept) return clearBackup(id)
    if (state.page?.id === id) commitPage(backup.data as PageDocument)
    else {
      const slug = Object.keys(state.globals).find(s => state.globals[s]!.id === id)
      if (slug) commitGlobal(slug, backup.data as GlobalDocument)
    }
  }

  /** Stan z serwera zastępuje lokalny (po konflikcie, odrzuceniu zmian, przywróceniu rewizji). */
  function applyServer(server: Entity) {
    const entity = entityById(server.id)
    if (!entity) return
    entity.data = raw(server.draft)
    entity.published = raw(server.published)
    entity.draftRev = server.draftRev
    entity.updatedAt = server.updatedAt
    entity.title = server.title
    queueFor(entity).reset(server.draftRev)
    clearBackup(server.id)
    history?.push(snapshot())
    history?.breakCoalescing()
    syncHistoryFlags()
  }

  async function reloadEntity(id: string) {
    applyServer(await cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(id)}`))
  }

  function resolveConflict(choice: 'reload' | 'overwrite') {
    const conflict = state.conflict
    state.conflict = null
    if (!conflict) return
    const entity = entityById(conflict.id)
    if (!entity) return
    if (choice === 'reload') applyServer(conflict.server)
    else {
      entity.draftRev = conflict.server.draftRev
      queueFor(entity).overwrite(conflict.server.draftRev)
    }
  }

  async function flushAll(ids?: string[]) {
    const targets = [...queues.entries()].filter(([id]) => !ids || ids.includes(id))
    await Promise.all(targets.map(([, q]) => q.flush()))
  }

  /** Publikacja jednej encji: najpierw zapis zaległych zmian, potem POST publish z bieżącą rewizją. */
  async function publishEntity(id: string): Promise<PublishResponse> {
    const entity = entityById(id)
    if (!entity) throw new CmsError('not_found', 'Brak encji')
    const queue = queueFor(entity)
    await queue.flush()
    const result = await cmsApi.post<PublishResponse>(`/api/entities/${encodeURIComponent(id)}/publish`, { expectedRev: queue.baseRev })
    entity.published = entity.data
    return result
  }

  /** Odrzucenie zmian strony: draft = opublikowana wersja (serwer), wynik trafia do historii. */
  async function discardPage() {
    const page = state.page
    if (!page) return
    const queue = queueFor(page as EntityState<unknown>)
    await queue.flush().catch(() => {})
    await cmsApi.post<SaveDraftResponse>(`/api/entities/${encodeURIComponent(page.id)}/discard`, { expectedRev: queue.baseRev })
    await reloadEntity(page.id)
  }

  /** Przywrócenie rewizji do draftu (serwer tworzy rewizję 'restore', historia zostaje). */
  async function restoreRevision(revisionId: string, entityId: string) {
    const entity = entityById(entityId)
    if (!entity) return
    const queue = queueFor(entity)
    await queue.flush().catch(() => {})
    await cmsApi.post<SaveDraftResponse>(`/api/revisions/${encodeURIComponent(revisionId)}/restore`, { baseRev: queue.baseRev })
    await reloadEntity(entityId)
  }

  const isDirty = (e: EntityState<unknown>) => e.published === null || !deepEqual(e.data, e.published)
  const dirtyGlobals = computed(() => Object.values(state.globals).filter(g => isDirty(g as EntityState<unknown>)))
  const pageDirty = computed(() => (state.page ? isDirty(state.page as EntityState<unknown>) : false))

  const saveStatus = computed<AutosaveStatus>(() => {
    const statuses = [state.page, ...Object.values(state.globals)].filter(Boolean).map(e => e!.status)
    for (const s of ['conflict', 'error', 'offline', 'saving', 'dirty'] as const) if (statuses.includes(s)) return s
    return 'saved'
  })
  const hasUnsaved = () => [...queues.values()].some(q => q.hasUnsaved || q.isInFlight)

  const frameState = computed<FrameState | null>(() => {
    if (!state.page || !state.tokens) return null
    return {
      page: state.page.data,
      site: { globals: snapshot().globals, components: state.components, tokens: state.tokens },
      showHidden: state.showHidden,
      device: state.device,
      mode: state.mode,
      canEdit: canEdit.value,
      selection: state.selection,
    }
  })

  function retryOffline() {
    for (const q of queues.values()) q.retryNow()
  }

  function dispose() {
    for (const q of queues.values()) q.dispose()
    queues.clear()
  }

  return {
    state,
    session,
    canEdit,
    maxMode,
    dirtyGlobals,
    pageDirty,
    saveStatus,
    frameState,
    load,
    setMode,
    setField,
    setSeo,
    pageOp,
    commitPage,
    undo,
    redo,
    breakCoalescing,
    applyBackup,
    applyServer,
    reloadEntity,
    resolveConflict,
    flushAll,
    publishEntity,
    discardPage,
    restoreRevision,
    hasUnsaved,
    retryOffline,
    dispose,
    queueFor: (id: string) => {
      const entity = entityById(id)
      return entity ? queueFor(entity) : undefined
    },
  }
}

export type EditorStore = ReturnType<typeof createEditorStore>
