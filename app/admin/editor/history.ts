/**
 * Historia undo/redo stanów edytora (pamięć sesji, bez frameworka).
 *
 *   const h = new EditHistory(initial, { limit: 100, coalesceMs: 1500 })
 *   h.push(next, 'page:lead')   // ten sam klucz w oknie coalesceMs = jeden krok (pisanie)
 *   h.undo() / h.redo()         // zwraca stan do przywrócenia albo undefined
 *
 * Stany są traktowane jako niemutowalne (rdzeń zwraca nowe obiekty), historia ich nie kopiuje.
 */
export interface HistoryOptions {
  /** Najwięcej kroków wstecz (domyślnie 100). */
  limit?: number
  /** Okno łączenia kolejnych zmian z tym samym kluczem (ms, domyślnie 1500). */
  coalesceMs?: number
  now?: () => number
}

export class EditHistory<T> {
  private past: T[] = []
  private future: T[] = []
  private lastKey: string | null = null
  private lastAt = 0
  private readonly limit: number
  private readonly coalesceMs: number
  private readonly now: () => number

  constructor(private current: T, options: HistoryOptions = {}) {
    this.limit = options.limit ?? 100
    this.coalesceMs = options.coalesceMs ?? 1500
    this.now = options.now ?? (() => Date.now())
  }

  get present(): T {
    return this.current
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  get size(): { past: number, future: number } {
    return { past: this.past.length, future: this.future.length }
  }

  /** Nowy stan. `coalesceKey`: kolejne zmiany tego samego pola łączą się w jeden krok. */
  push(next: T, coalesceKey?: string): void {
    const at = this.now()
    const coalesce = coalesceKey !== undefined && coalesceKey === this.lastKey && at - this.lastAt <= this.coalesceMs && this.past.length > 0
    if (!coalesce) {
      this.past.push(this.current)
      if (this.past.length > this.limit) this.past.splice(0, this.past.length - this.limit)
    }
    this.current = next
    this.future = []
    this.lastKey = coalesceKey ?? null
    this.lastAt = at
  }

  undo(): T | undefined {
    const previous = this.past.pop()
    if (previous === undefined) return undefined
    this.future.push(this.current)
    this.current = previous
    this.lastKey = null
    return previous
  }

  redo(): T | undefined {
    const next = this.future.pop()
    if (next === undefined) return undefined
    this.past.push(this.current)
    this.current = next
    this.lastKey = null
    return next
  }

  /** Zastępuje stan bez nowego kroku (np. po wczytaniu wersji z serwera). Czyści historię. */
  reset(state: T): void {
    this.current = state
    this.past = []
    this.future = []
    this.lastKey = null
  }

  /** Przerywa łączenie (np. po zatwierdzeniu edycji pola). */
  breakCoalescing(): void {
    this.lastKey = null
  }
}
