/** Mały router: metoda + wzorzec ścieżki z parametrami `:nazwa`. */
import type { Ctx } from './context'

export type Handler = (ctx: Ctx) => Response | Promise<Response>
export type Access = 'public' | 'session'

interface Route { method: string, pattern: RegExp, keys: string[], handler: Handler, access: Access }

export class Router {
  private routes: Route[] = []

  add(method: string, path: string, handler: Handler, access: Access = 'session'): this {
    const keys: string[] = []
    const source = path.split('/').map((part) => {
      if (!part.startsWith(':')) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      keys.push(part.slice(1))
      return '([^/]+)'
    }).join('/')
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler, access })
    return this
  }

  /** null: brak ścieżki; 'method': ścieżka istnieje, ale nie dla tej metody. */
  match(method: string, pathname: string): { route: Route, params: Record<string, string> } | 'method' | null {
    let pathMatched = false
    for (const route of this.routes) {
      const found = route.pattern.exec(pathname)
      if (!found) continue
      pathMatched = true
      if (route.method !== method && !(route.method === 'GET' && method === 'HEAD')) continue
      const params: Record<string, string> = {}
      route.keys.forEach((key, index) => {
        try {
          params[key] = decodeURIComponent(found[index + 1]!)
        }
        catch {
          params[key] = ''
        }
      })
      return { route, params }
    }
    return pathMatched ? 'method' : null
  }
}
