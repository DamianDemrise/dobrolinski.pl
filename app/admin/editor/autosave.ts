/**
 * Kolejka autosave jednej encji (bez frameworka, testy: tests/admin/autosave.test.ts).
 *
 *   const q = new AutosaveQueue({ baseRev, save: (data, baseRev) => PUT…, onStatus, onConflict, onError })
 *   q.schedule(data)    // debounce (800 ms); zawsze wysyłany jest NAJNOWSZY stan
 *   await q.flush()     // zapis teraz i czekanie na koniec (np. przed publikacją)
 *   q.overwrite(rev)    // po 409: „Nadpisz moją wersją” (ponowny zapis z rewizją serwera)
 *   q.reset(rev)        // po 409: „Wczytaj aktualną wersję” (porzuca lokalne, ignoruje spóźnione odpowiedzi)
 *
 * Zasady: najwyżej jedno zapytanie w locie; odpowiedź z poprzedniej epoki (po reset) jest
 * ignorowana; błąd sieci/5xx → ponawianie z backoffem (status 'offline'); 409 → 'conflict'
 * (bez ponawiania); 4xx (403/422) → 'error' (lokalny stan zostaje, następna edycja ponawia).
 */
export type AutosaveStatus = 'saved' | 'dirty' | 'saving' | 'offline' | 'error' | 'conflict'

export interface SaveResult { draftRev: number, updatedAt: string }

export interface AutosaveOptions<T> {
  baseRev: number
  save: (data: T, baseRev: number) => Promise<SaveResult>
  debounceMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  onStatus?: (status: AutosaveStatus) => void
  onSaved?: (result: SaveResult) => void
  /** 409: `server` to treść odpowiedzi (np. { error:'conflict', entity }). */
  onConflict?: (server: unknown) => void
  onError?: (error: unknown) => void
}

/** Błąd z kodem HTTP (CmsApiError ma `status` i `body`). */
interface HttpLike { status?: unknown, body?: unknown }

export function classifySaveError(error: unknown): 'conflict' | 'retry' | 'fatal' {
  const status = (error as HttpLike | null)?.status
  if (typeof status !== 'number' || status === 0) return 'retry'
  if (status === 409) return 'conflict'
  if (status >= 500 || status === 408 || status === 429) return 'retry'
  return 'fatal'
}

type Waiter = { resolve: () => void, reject: (error: unknown) => void }

export class AutosaveQueue<T> {
  baseRev: number
  status: AutosaveStatus = 'saved'
  lastError: unknown = null

  private latest: { data: T } | null = null
  private version = 0
  private savedVersion = 0
  private epoch = 0
  private inFlight = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private waiters: Waiter[] = []
  private disposed = false

  constructor(private readonly options: AutosaveOptions<T>) {
    this.baseRev = options.baseRev
  }

  /** Niezapisane lokalne zmiany (także w trakcie zapisu albo po błędzie). */
  get hasUnsaved(): boolean {
    return this.version > this.savedVersion
  }

  get isInFlight(): boolean {
    return this.inFlight
  }

  /** Ostatni lokalny stan (np. do kopii w sessionStorage). */
  get pendingData(): T | undefined {
    return this.hasUnsaved ? this.latest?.data : undefined
  }

  schedule(data: T): void {
    if (this.disposed) return
    this.latest = { data }
    this.version++
    if (this.status !== 'conflict') this.setStatus(this.inFlight ? 'saving' : 'dirty')
    this.clearRetry()
    this.attempt = 0
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, this.options.debounceMs ?? 800)
  }

  /** Zapis teraz; rozwiązuje się, gdy wszystko jest zapisane, odrzuca przy konflikcie/błędzie. */
  flush(): Promise<void> {
    if (!this.hasUnsaved && !this.inFlight) return Promise.resolve()
    if (this.status === 'conflict' || this.status === 'error') return Promise.reject(this.lastError ?? new Error(this.status))
    const promise = new Promise<void>((resolve, reject) => this.waiters.push({ resolve, reject }))
    this.clearTimer()
    this.clearRetry()
    void this.run()
    return promise
  }

  /** Po konflikcie: zapisz lokalny stan na wersji serwera. */
  overwrite(serverRev: number): void {
    this.baseRev = serverRev
    this.setStatus('dirty')
    this.lastError = null
    void this.run()
  }

  /** Porzuca lokalne zmiany i zaczyna od wersji serwera; spóźnione odpowiedzi są ignorowane. */
  reset(serverRev: number): void {
    this.epoch++
    this.clearTimer()
    this.clearRetry()
    this.inFlight = false
    this.latest = null
    this.savedVersion = this.version
    this.baseRev = serverRev
    this.lastError = null
    this.setStatus('saved')
    this.settle(null)
  }

  /** Przeglądarka wróciła do sieci: ponów od razu. */
  retryNow(): void {
    if (this.status !== 'offline') return
    this.clearRetry()
    void this.run()
  }

  dispose(): void {
    this.disposed = true
    this.clearTimer()
    this.clearRetry()
    this.epoch++
  }

  private async run(): Promise<void> {
    if (this.disposed || this.inFlight || !this.latest || !this.hasUnsaved) {
      if (!this.inFlight && !this.hasUnsaved) this.settle(null)
      return
    }
    if (this.status === 'conflict') return
    const epoch = this.epoch
    const sentVersion = this.version
    const data = this.latest.data
    this.inFlight = true
    this.setStatus('saving')
    try {
      const result = await this.options.save(data, this.baseRev)
      if (epoch !== this.epoch) return // odpowiedź sprzed reset(): ignorujemy
      this.inFlight = false
      this.attempt = 0
      this.lastError = null
      this.baseRev = result.draftRev
      this.savedVersion = Math.max(this.savedVersion, sentVersion)
      this.options.onSaved?.(result)
      if (this.hasUnsaved) {
        // W trakcie zapisu przyszły nowe zmiany: wysyłamy najnowszy stan (debounce już minął albo trwa).
        if (this.timer === null) void this.run()
        else this.setStatus('dirty')
        return
      }
      this.setStatus('saved')
      this.settle(null)
    }
    catch (error) {
      if (epoch !== this.epoch) return
      this.inFlight = false
      this.lastError = error
      const kind = classifySaveError(error)
      if (kind === 'conflict') {
        this.setStatus('conflict')
        this.options.onConflict?.((error as HttpLike).body)
        this.settle(error)
      }
      else if (kind === 'retry') {
        this.setStatus('offline')
        const base = this.options.retryBaseMs ?? 1000
        const delay = Math.min(base * 2 ** this.attempt, this.options.retryMaxMs ?? 30_000)
        this.attempt++
        this.clearRetry()
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null
          void this.run()
        }, delay)
        // Czekający na flush() (np. publikacja) dostają błąd od razu; ponawianie trwa w tle.
        this.settle(error)
      }
      else {
        this.setStatus('error')
        this.options.onError?.(error)
        this.settle(error)
      }
    }
  }

  private settle(error: unknown): void {
    const waiters = this.waiters
    this.waiters = []
    for (const w of waiters) {
      if (error) w.reject(error)
      else w.resolve()
    }
  }

  private setStatus(status: AutosaveStatus): void {
    if (this.status === status) return
    this.status = status
    this.options.onStatus?.(status)
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }
}
