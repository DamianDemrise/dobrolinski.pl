import type { MaybeRefOrGetter } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, toValue } from 'vue'
import type { AreaItem } from '~~/cms/types'

export function useSiteExperience(areas: MaybeRefOrGetter<readonly AreaItem[]>, thoughts: MaybeRefOrGetter<readonly string[]>) {
  const thoughtIndex = ref(0)
  const activeArea = ref<string | null>(null)
  const pinnedArea = ref<string | null>(null)
  let rotationTimer: ReturnType<typeof setInterval> | undefined

  const thought = computed(() => {
    const area = toValue(areas).find(item => item.slug === activeArea.value)
    const list = toValue(thoughts)
    return area?.thought ?? list[thoughtIndex.value] ?? list[0] ?? ''
  })

  const previewArea = (slug: string) => {
    activeArea.value = slug
  }

  const leaveArea = () => {
    activeArea.value = pinnedArea.value
  }

  const toggleArea = (slug: string) => {
    pinnedArea.value = pinnedArea.value === slug ? null : slug
    activeArea.value = pinnedArea.value
  }

  onMounted(() => {
    rotationTimer = setInterval(() => {
      const count = toValue(thoughts).length
      if (!activeArea.value && !document.hidden && count) {
        thoughtIndex.value = (thoughtIndex.value + 1) % count
      }
    }, 7200)
  })

  onBeforeUnmount(() => {
    if (rotationTimer) clearInterval(rotationTimer)
  })

  return {
    activeArea,
    leaveArea,
    previewArea,
    thought,
    toggleArea,
  }
}
