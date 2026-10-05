<script setup lang="ts">
import { personSchema } from '~/content/site'

const { lightStyle, onPointerMove } = usePointerLight()

useHead({
  script: [
    {
      type: 'application/ld+json',
      textContent: JSON.stringify(personSchema),
    },
  ],
})

const focusActiveView = () => {
  document.querySelector<HTMLElement>('.view')?.focus({ preventScroll: true })
}
</script>

<template>
  <main
    class="site-stage"
    :style="lightStyle"
    @pointermove="onPointerMove"
  >
    <div class="ambient-light" aria-hidden="true" />

    <NuxtPage
      :transition="{ name: 'view', mode: 'out-in', onAfterEnter: focusActiveView }"
    />

    <IntroReveal />

    <ClientOnly>
      <ConsentBanner />
    </ClientOnly>
  </main>
</template>
