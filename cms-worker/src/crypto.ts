/** Losowe identyfikatory i skróty. Sekrety (token, id sesji) trzymamy w bazie tylko jako SHA-256. */

export function randomToken(bytes = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  let binary = ''
  for (const byte of buffer) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomId(prefix: string, bytes = 10): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return `${prefix}_${Array.from(buffer, b => b.toString(16).padStart(2, '0')).join('')}`
}

export async function sha256Hex(value: string | ArrayBuffer | Uint8Array): Promise<string> {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
