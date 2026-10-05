import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Postęp przewijania kontenera (0–1), liczony najwyżej raz na klatkę. */
export function useScrollProgress(root: Ref<HTMLElement | null>) {
  const progress = ref(0)
  let frame: number | undefined

  const measure = () => {
    frame = undefined
    const el = root.value
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    progress.value = max > 0 ? Math.min(1, el.scrollTop / max) : 0
  }

  const onScroll = () => {
    if (frame === undefined) frame = requestAnimationFrame(measure)
  }

  onMounted(() => root.value?.addEventListener('scroll', onScroll, { passive: true }))
  onBeforeUnmount(() => {
    root.value?.removeEventListener('scroll', onScroll)
    if (frame !== undefined) cancelAnimationFrame(frame)
  })

  return progress
}
