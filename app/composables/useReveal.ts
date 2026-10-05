import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Pokazuje elementy `.reveal` wewnątrz kontenera, gdy wchodzą w widok.
 * Bez JS, bez IntersectionObserver albo przy reduced motion wszystko jest widoczne od razu.
 */
export function useReveal(root: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    const container = root.value
    if (!container) return
    const targets = [...container.querySelectorAll<HTMLElement>('.reveal')]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || !('IntersectionObserver' in window)) return

    // Elementy chowamy dopiero teraz: bez JS treść zostaje widoczna.
    // Te, które już są w widoku, pokazujemy od razu, bez mrugnięcia.
    const viewport = container.getBoundingClientRect()
    targets
      .filter(el => el.getBoundingClientRect().top < viewport.bottom)
      .forEach(el => el.classList.add('is-visible'))
    container.classList.add('reveal-ready')

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    }, { root: container, rootMargin: '0px 0px -12% 0px', threshold: 0.05 })

    targets
      .filter(el => !el.classList.contains('is-visible'))
      .forEach(el => observer!.observe(el))
  })

  onBeforeUnmount(() => observer?.disconnect())
}
