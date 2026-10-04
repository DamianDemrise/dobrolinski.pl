<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { personSchema } from '~/content/site'

const experience = useSiteExperience()
const {
  activeArea,
  closeWorkshop,
  leaveArea,
  openWorkshop,
  previewArea,
  thought,
  toggleArea,
  view,
} = experience
const { lightStyle, onPointerMove } = usePointerLight()

useHead({
  script: [
    {
      type: 'application/ld+json',
      textContent: JSON.stringify(personSchema),
    },
  ],
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && view.value === 'workshop') {
    closeWorkshop()
  }
}

const focusActiveView = () => {
  document.querySelector<HTMLElement>('.view')?.focus({ preventScroll: true })
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
<noscript>
  <iframe
    src="https://www.googletagmanager.com/ns.html?id=GTM-TR8MDG8W"
    height="0"
    width="0"
    style="display:none;visibility:hidden"
  ></iframe>
</noscript>

    class="site-stage"
    :style="lightStyle"
    @pointermove="onPointerMove"
  >
    <div class="ambient-light" aria-hidden="true" />

    <Transition name="view" mode="out-in" @after-enter="focusActiveView">
      <HomeView
        v-if="view === 'home'"
        key="home"
        :active-area="activeArea"
        :thought="thought"
        @activate-area="toggleArea"
        @leave-area="leaveArea"
        @open-workshop="openWorkshop"
        @preview-area="previewArea"
      />
      <WorkshopView v-else key="workshop" @close="closeWorkshop" />
    </Transition>

    <IntroReveal />
  </main>
</template>
