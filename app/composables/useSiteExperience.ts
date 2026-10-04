import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AreaSlug } from '~/content/site'
import { siteContent } from '~/content/site'

export function useSiteExperience() {
  const view = ref<'home' | 'workshop'>('home')
  const thoughtIndex = ref(0)
  const activeArea = ref<AreaSlug | null>(null)
  const pinnedArea = ref<AreaSlug | null>(null)
  let rotationTimer: ReturnType<typeof setInterval> | undefined

  const thought = computed(() => {
    const area = siteContent.areas.find(item => item.slug === activeArea.value)
    return area?.thought ?? siteContent.thoughts[thoughtIndex.value] ?? siteContent.thoughts[0]
  })

  const previewArea = (slug: AreaSlug) => {
    activeArea.value = slug
  }

  const leaveArea = () => {
    activeArea.value = pinnedArea.value
  }

  const toggleArea = (slug: AreaSlug) => {
    pinnedArea.value = pinnedArea.value === slug ? null : slug
    activeArea.value = pinnedArea.value
  }

  const openWorkshop = () => {
    view.value = 'workshop'
    pinnedArea.value = null
    activeArea.value = null
  }

  const closeWorkshop = () => {
    view.value = 'home'
  }

  onMounted(() => {
    rotationTimer = setInterval(() => {
      if (view.value === 'home' && !activeArea.value && !document.hidden) {
        thoughtIndex.value = (thoughtIndex.value + 1) % siteContent.thoughts.length
      }
    }, 7200)
  })

  onBeforeUnmount(() => {
    if (rotationTimer) clearInterval(rotationTimer)
  })

  return {
    activeArea,
    closeWorkshop,
    leaveArea,
    openWorkshop,
    previewArea,
    thought,
    toggleArea,
    view,
  }
}
