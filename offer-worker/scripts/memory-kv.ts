import type { KVStore } from '../src/config.ts'

/** KV w pamięci do testów i lokalnego serwera; respektuje expirationTtl. */
export function memoryKV(clock: () => number = Date.now): KVStore & { size: () => number } {
  const data = new Map<string, { value: string, expires: number }>()
  return {
    async get(key) {
      const entry = data.get(key)
      if (!entry) return null
      if (entry.expires <= clock()) {
        data.delete(key)
        return null
      }
      return entry.value
    },
    async put(key, value, options) {
      data.set(key, { value, expires: clock() + (options?.expirationTtl ?? 1e9) * 1000 })
    },
    size: () => data.size,
  }
}
