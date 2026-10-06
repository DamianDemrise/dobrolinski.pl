/**
 * v-cms="'ścieżka.pola'": oznacza element, który pokazuje pole treści.
 *
 * Tryb publiczny (brak CMS_EDIT_CONTEXT): nic nie robi i nic nie renderuje
 * (SSR/prerender bez atrybutów, klient bez zmian w DOM).
 * Tryb edycji: ustawia atrybuty, po których edytor rozpoznaje pole na canvasie:
 *   pole bloku:   data-cms-block="<id bloku>" data-cms-field="<ścieżka w props>"
 *                 (+ data-cms-global-ref="<id komponentu>" dla instancji komponentu globalnego)
 *   pole globalu: v-cms="'globals.site.email'" → data-cms-global="site" data-cms-field="email"
 * Ścieżki w props: 'lead', 'titleLines.1', 'topics.2.textLines.0', 'offer.errors.failed'.
 */
import type { Directive, DirectiveBinding, InjectionKey } from 'vue'
import { CMS_BLOCK_SCOPE, CMS_EDIT_CONTEXT } from './context'

export type CmsFieldPath = string

const ATTRS = ['data-cms-block', 'data-cms-field', 'data-cms-global', 'data-cms-global-ref'] as const

/**
 * Odczyt wartości dostarczonej przez provide() przodków komponentu, w którym stoi dyrektywa.
 * Dyrektywy nie mogą wywołać inject(), więc czytamy łańcuch `provides` instancji.
 */
function injected<T>(instance: unknown, key: InjectionKey<T>): T | undefined {
  const provides = (instance as { $?: { provides?: Record<symbol, unknown> } } | null | undefined)?.$?.provides
  return provides ? provides[key as symbol] as T | undefined : undefined
}

/** Atrybuty dla pola albo null, gdy nie ma kontekstu edycji (tryb publiczny). */
export function cmsFieldAttrs(binding: Pick<DirectiveBinding<CmsFieldPath>, 'instance' | 'value'>): Record<string, string> | null {
  if (!injected(binding.instance, CMS_EDIT_CONTEXT)) return null
  const path = String(binding.value ?? '')
  const global = /^globals\.([^.]+)\.(.+)$/.exec(path)
  if (global) return { 'data-cms-global': global[1]!, 'data-cms-field': global[2]! }
  const scope = injected(binding.instance, CMS_BLOCK_SCOPE)
  if (!scope) return null
  const attrs: Record<string, string> = { 'data-cms-block': scope.id, 'data-cms-field': path }
  if (scope.globalRef) attrs['data-cms-global-ref'] = scope.globalRef
  return attrs
}

function apply(el: HTMLElement, binding: DirectiveBinding<CmsFieldPath>) {
  const attrs = cmsFieldAttrs(binding)
  if (!attrs) return
  for (const name of ATTRS) {
    if (attrs[name] === undefined) el.removeAttribute(name)
    else el.setAttribute(name, attrs[name])
  }
}

export const vCms: Directive<HTMLElement, CmsFieldPath> = {
  mounted: apply,
  updated: apply,
  // SSR: atrybuty tylko w trybie edycji; publicznie pusty obiekt = brak atrybutów.
  getSSRProps: binding => cmsFieldAttrs(binding) ?? {},
}
