/**
 * Klient API panelu (ten sam origin co Worker). Jedyne miejsce, które rozmawia z /api.
 * Zapisy zawsze z nagłówkiem X-CMS-Request (CSRF), cookie sesji idzie automatycznie.
 */
import type { ApiError } from '@demrise/cms-core'
import { CMS_REQUEST_HEADER } from '@demrise/cms-core'

export class CmsApiError extends Error {
  constructor(
    public status: number,
    public body: ApiError | null,
  ) {
    super(body?.message || body?.error || `HTTP ${status}`)
  }

  get code(): string {
    return this.body?.error ?? `http_${this.status}`
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  body?: unknown
  /** FormData dla uploadu mediów (bez Content-Type, ustawia go przeglądarka). */
  form?: FormData
  signal?: AbortSignal
}

/** 401 z dowolnego zapytania: sesja wygasła, panel przenosi na logowanie. */
const unauthorizedHandlers = new Set<() => void>()
export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandlers.add(handler)
  return () => unauthorizedHandlers.delete(handler)
}

export async function cmsFetch<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers[CMS_REQUEST_HEADER] = '1'
  let body: BodyInit | undefined
  if (options.form) body = options.form
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    credentials: 'same-origin',
    signal: options.signal,
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    }
    catch {
      data = null
    }
  }

  if (!response.ok) {
    if (response.status === 401) unauthorizedHandlers.forEach(handler => handler())
    throw new CmsApiError(response.status, data as ApiError | null)
  }
  return data as T
}

export const cmsApi = {
  get: <T>(path: string, signal?: AbortSignal) => cmsFetch<T>('GET', path, { signal }),
  post: <T>(path: string, body?: unknown) => cmsFetch<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => cmsFetch<T>('PUT', path, { body, signal }),
  patch: <T>(path: string, body?: unknown) => cmsFetch<T>('PATCH', path, { body }),
  delete: <T>(path: string) => cmsFetch<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => cmsFetch<T>('POST', path, { form }),
}
