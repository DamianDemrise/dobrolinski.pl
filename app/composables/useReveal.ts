import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Pokazuje elementy `.reveal` wewnątrz kontenera, gdy wchodzą w widok.
 * Bez IntersectionObserver albo przy reduced motion wszystko jest widoczne od razu.
 */
export function useReveal(root: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    const container = root.value
    if (!container) return
    const targets = [...container.querySelectorAll<HTMLElement>('.reveal')]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('is-visible'))
      return
    }

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    }, { root: container, rootMargin: '0px 0px -12% 0px', threshold: 0.05 })

    targets.forEach(el => observer!.observe(el))
  })

  onBeforeUnmount(() => observer?.disconnect())
}
