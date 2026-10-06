/**
 * Kopia niezapisanych zmian w sessionStorage (tylko wygoda: ta karta, ten użytkownik).
 * Źródłem prawdy jest zawsze draft na serwerze; kopia służy do odzyskania po awarii karty.
 */
export interface DraftBackup { baseRev: number, data: unknown, savedAt: string }

const key = (id: string) => `cms:backup:${id}`

export function writeBackup(id: string, value: { baseRev: number, data: unknown }): void {
  try {
    sessionStorage.setItem(key(id), JSON.stringify({ ...value, savedAt: new Date().toISOString() }))
  }
  catch { /* pełny albo zablokowany storage: bez kopii */ }
}

export function readBackup(id: string): DraftBackup | null {
  try {
    const text = sessionStorage.getItem(key(id))
    if (!text) return null
    const parsed = JSON.parse(text) as DraftBackup
    return typeof parsed?.baseRev === 'number' ? parsed : null
  }
  catch {
    return null
  }
}

export function clearBackup(id: string): void {
  try {
    sessionStorage.removeItem(key(id))
  }
  catch { /* bez znaczenia */ }
}
