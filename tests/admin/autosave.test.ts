/**
 * Kolejka autosave z prawdziwym klientem API (cmsApi.put) i fałszywym fetch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cmsApi } from '../../app/admin/api'
import type { AutosaveStatus } from '../../app/admin/editor/autosave'
import { AutosaveQueue } from '../../app/admin/editor/autosave'

interface Call { body: { baseRev: number, data: unknown }, resolve: (status: number, body: unknown) => void, reject: (e: unknown) => void }

let calls: Call[] = []

function fakeFetch() {
  return vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolve, reject) => {
    calls.push({
      body: JSON.parse(String(init.body)),
      resolve: (status, body) => resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
      reject,
    })
  }))
}

const flushPromises = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

function makeQueue(baseRev = 1, extra: Partial<ConstructorParameters<typeof AutosaveQueue<unknown>>[0]> = {}) {
  const statuses: AutosaveStatus[] = []
  const queue = new AutosaveQueue<unknown>({
    baseRev,
    save: (data, rev) => cmsApi.put('/api/entities/page_home/draft', { baseRev: rev, data }),
    onStatus: s => statuses.push(s),
    debounceMs: 800,
    retryBaseMs: 1000,
    retryMaxMs: 8000,
    ...extra,
  })
  return { queue, statuses }
}

beforeEach(() => {
  calls = []
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fakeFetch())
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AutosaveQueue', () => {
  it('debounce: seria zmian = jeden zapis z najnowszym stanem', async () => {
    const { queue } = makeQueue()
    queue.schedule({ v: 1 })
    await vi.advanceTimersByTimeAsync(500)
    queue.schedule({ v: 2 })
    await vi.advanceTimersByTimeAsync(500)
    queue.schedule({ v: 3 })
    expect(calls).toHaveLength(0)
    expect(queue.status).toBe('dirty')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.body).toEqual({ baseRev: 1, data: { v: 3 } })
    calls[0]!.resolve(200, { draftRev: 2, updatedAt: 'x' })
    await flushPromises()
    expect(queue.status).toBe('saved')
    expect(queue.baseRev).toBe(2)
    expect(queue.hasUnsaved).toBe(false)
  })

  it('jedno zapytanie w locie; zmiany w trakcie idą potem jako najnowszy stan na nowej rewizji', async () => {
    const { queue } = makeQueue()
    queue.schedule('a')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls).toHaveLength(1)
    queue.schedule('b')
    queue.schedule('c')
    await vi.advanceTimersByTimeAsync(5000)
    expect(calls).toHaveLength(1) // drugi czeka na pierwszy
    calls[0]!.resolve(200, { draftRev: 2, updatedAt: 'x' })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toHaveLength(2)
    expect(calls[1]!.body).toEqual({ baseRev: 2, data: 'c' })
    calls[1]!.resolve(200, { draftRev: 3, updatedAt: 'y' })
    await flushPromises()
    expect(queue.status).toBe('saved')
    expect(queue.baseRev).toBe(3)
  })

  it('flush zapisuje od razu i czeka na koniec', async () => {
    const { queue } = makeQueue(5)
    queue.schedule('x')
    const done = queue.flush()
    await flushPromises()
    expect(calls).toHaveLength(1)
    let resolved = false
    void done.then(() => { resolved = true })
    calls[0]!.resolve(200, { draftRev: 6, updatedAt: 'x' })
    await flushPromises()
    expect(resolved).toBe(true)
    await expect(queue.flush()).resolves.toBeUndefined()
  })

  it('ignoruje spóźnioną odpowiedź po reset (wczytanie wersji z serwera)', async () => {
    const { queue } = makeQueue(1)
    queue.schedule('mine')
    await vi.advanceTimersByTimeAsync(800)
    queue.reset(10)
    calls[0]!.resolve(200, { draftRev: 2, updatedAt: 'old' })
    await flushPromises()
    expect(queue.baseRev).toBe(10)
    expect(queue.status).toBe('saved')
    queue.schedule('after')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls[1]!.body.baseRev).toBe(10)
  })

  it('409: status conflict, bez ponawiania; overwrite zapisuje na rewizji serwera', async () => {
    const onConflict = vi.fn()
    const { queue } = makeQueue(1, { onConflict })
    queue.schedule('mine')
    await vi.advanceTimersByTimeAsync(800)
    calls[0]!.resolve(409, { error: 'conflict', entity: { id: 'page_home', draftRev: 7 } })
    await flushPromises()
    expect(queue.status).toBe('conflict')
    expect(onConflict).toHaveBeenCalledWith({ error: 'conflict', entity: { id: 'page_home', draftRev: 7 } })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(1)
    await expect(queue.flush()).rejects.toBeTruthy()

    queue.overwrite(7)
    await flushPromises()
    expect(calls).toHaveLength(2)
    expect(calls[1]!.body).toEqual({ baseRev: 7, data: 'mine' })
    calls[1]!.resolve(200, { draftRev: 8, updatedAt: 'x' })
    await flushPromises()
    expect(queue.status).toBe('saved')
  })

  it('brak sieci: offline i ponawianie z rosnącym odstępem, potem zapis', async () => {
    const { queue, statuses } = makeQueue(1)
    queue.schedule('data')
    await vi.advanceTimersByTimeAsync(800)
    calls[0]!.reject(new TypeError('Failed to fetch'))
    await flushPromises()
    expect(queue.status).toBe('offline')
    expect(queue.hasUnsaved).toBe(true)

    await vi.advanceTimersByTimeAsync(999)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toHaveLength(2) // po 1 s
    calls[1]!.resolve(503, { error: 'unavailable' })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1999)
    expect(calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toHaveLength(3) // po kolejnych 2 s
    expect(calls[2]!.body).toEqual({ baseRev: 1, data: 'data' })
    calls[2]!.resolve(200, { draftRev: 2, updatedAt: 'x' })
    await flushPromises()
    expect(queue.status).toBe('saved')
    expect(statuses).toContain('offline')
  })

  it('retryNow po powrocie sieci ponawia od razu', async () => {
    const { queue } = makeQueue(1)
    queue.schedule('d')
    await vi.advanceTimersByTimeAsync(800)
    calls[0]!.reject(new TypeError('offline'))
    await flushPromises()
    queue.retryNow()
    await flushPromises()
    expect(calls).toHaveLength(2)
  })

  it('403/422: status error, lokalny stan zostaje, następna edycja ponawia', async () => {
    const onError = vi.fn()
    const { queue } = makeQueue(1, { onError })
    queue.schedule('bad')
    await vi.advanceTimersByTimeAsync(800)
    calls[0]!.resolve(422, { error: 'invalid', issues: [{ path: 'blocks.0', message: 'x' }] })
    await flushPromises()
    expect(queue.status).toBe('error')
    expect(onError).toHaveBeenCalledOnce()
    expect(queue.pendingData).toBe('bad')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(1)

    queue.schedule('good')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls[1]!.body).toEqual({ baseRev: 1, data: 'good' })
  })
})
