/**
 * Wersja robocza jednej encji poza edytorem wizualnym (treści globalne, komponenty, wzorce, tokeny).
 * Ta sama kolejka autosave co edytor (editor/autosave.ts: debounce, jedno zapytanie w locie,
 * 409 → konflikt do decyzji, sieć → ponawianie), publikacja, odrzucenie zmian i przywracanie rewizji.
 *
 *   const draft = createEntityDraft<GlobalDocument>(entity)
 *   draft.update(next)            // stan lokalny + autosave
 *   await draft.publish()         // flush + POST publish { expectedRev }
 *   draft.dispose()               // przy zmianie encji / opuszczeniu ekranu
 */
import type { Entity, PublishResponse, SaveDraftResponse } from '@demrise/cms-core'
import { computed, markRaw, reactive } from 'vue'
import { cmsApi } from './api'
import type { AutosaveStatus } from './editor/autosave'
import { AutosaveQueue } from './editor/autosave'
import { localStatus } from './entities'
import { errorMessage } from './format'
import { useAdminToast } from './toast'

const raw = <T>(value: T): T => (value !== null && typeof value === 'object' ? markRaw(value as object) as T : value)
const path = (id: string) => `/api/entities/${encodeURIComponent(id)}`

export interface EntityDraftState<T> {
  id: string
  kind: Entity['kind']
  slug: string
  title: string
  data: T
  published: T | null
  draftRev: number
  updatedAt: string
  publishedAt: string | null
  save: AutosaveStatus
  conflict: Entity | null
}

export function createEntityDraft<T>(entity: Entity) {
  const toast = useAdminToast()
  // Dokumenty są markRaw (podmieniane w całości), więc stan nie rozpakowuje ich typów.
  const state = reactive({
    id: entity.id,
    kind: entity.kind,
    slug: entity.slug,
    title: entity.title,
    data: raw(entity.draft as T),
    published: raw(entity.published as T | null),
    draftRev: entity.draftRev,
    updatedAt: entity.updatedAt,
    publishedAt: entity.publishedAt,
    save: 'saved' as AutosaveStatus,
    conflict: null as Entity | null,
  }) as EntityDraftState<T>

  const queue = new AutosaveQueue<T>({
    baseRev: entity.draftRev,
    save: (data, baseRev) => cmsApi.put<SaveDraftResponse>(`${path(state.id)}/draft`, { baseRev, data }),
    onStatus: (status) => {
      state.save = status
    },
    onSaved: (result) => {
      state.draftRev = result.draftRev
      state.updatedAt = result.updatedAt
    },
    onConflict: (body) => {
      const server = (body as { entity?: Entity } | null)?.entity
      if (server) state.conflict = server
      else toast.show('Konflikt wersji: odśwież stronę', 'danger')
    },
    onError: error => toast.show(`Nie zapisano zmian: ${errorMessage(error)}`, 'danger'),
  })

  const status = computed(() => localStatus(state.data, state.published))

  function update(next: T) {
    state.data = raw(next)
    queue.schedule(next)
  }

  /** Stan z serwera zastępuje lokalny (konflikt, odrzucenie zmian, przywrócenie). */
  function applyServer(server: Entity) {
    state.data = raw(server.draft as T)
    state.published = raw(server.published as T | null)
    state.draftRev = server.draftRev
    state.updatedAt = server.updatedAt
    state.publishedAt = server.publishedAt
    state.title = server.title
    queue.reset(server.draftRev)
  }

  async function reload() {
    applyServer(await cmsApi.get<Entity>(path(state.id)))
  }

  function resolveConflict(choice: 'reload' | 'overwrite') {
    const server = state.conflict
    state.conflict = null
    if (!server) return
    if (choice === 'reload') applyServer(server)
    else {
      state.draftRev = server.draftRev
      queue.overwrite(server.draftRev)
    }
  }

  async function publish(): Promise<PublishResponse> {
    await queue.flush()
    const result = await cmsApi.post<PublishResponse>(`${path(state.id)}/publish`, { expectedRev: queue.baseRev })
    state.published = state.data
    state.publishedAt = result.publishedAt
    return result
  }

  async function discard() {
    await queue.flush().catch(() => {})
    await cmsApi.post<SaveDraftResponse>(`${path(state.id)}/discard`, { expectedRev: queue.baseRev })
    await reload()
  }

  async function restore(revisionId: string) {
    await queue.flush().catch(() => {})
    await cmsApi.post<SaveDraftResponse>(`/api/revisions/${encodeURIComponent(revisionId)}/restore`, { baseRev: queue.baseRev })
    await reload()
  }

  return {
    state,
    status,
    update,
    reload,
    resolveConflict,
    publish,
    discard,
    restore,
    flush: () => queue.flush(),
    hasUnsaved: () => queue.hasUnsaved || queue.isInFlight,
    retry: () => queue.retryNow(),
    dispose: () => queue.dispose(),
  }
}

export type EntityDraft<T = unknown> = ReturnType<typeof createEntityDraft<T>>
