import type { KVStore } from '../src/config.ts'

/** KV w pamięci do testów i lokalnego serwera; respektuje expirationTtl. */
export function memoryKV(clock: () => number = Date.now): KVStore & { size: () => number, putBinary: (key: string, value: Uint8Array) => void } {
  const data = new Map<string, { value: string | Uint8Array, expires: number }>()
  async function get(key: string): Promise<string | null>
  async function get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  async function get(key: string, type?: 'arrayBuffer'): Promise<string | ArrayBuffer | null> {
    const entry = data.get(key)
    if (!entry) return null
    if (entry.expires <= clock()) {
      data.delete(key)
      return null
    }
    if (type === 'arrayBuffer') {
      const bytes = typeof entry.value === 'string' ? new TextEncoder().encode(entry.value) : entry.value
      return bytes.slice().buffer as ArrayBuffer
    }
    return typeof entry.value === 'string' ? entry.value : new TextDecoder().decode(entry.value)
  }
  return {
    get,
    async put(key, value, options) {
      data.set(key, { value, expires: clock() + (options?.expirationTtl ?? 1e9) * 1000 })
    },
    putBinary: (key, value) => data.set(key, { value, expires: Number.POSITIVE_INFINITY }),
    size: () => data.size,
  }
}
