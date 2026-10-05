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

// Kaskada wejścia gra tylko przy pierwszym wejściu na stronę, nie przy powrocie z podstrony.
const hasNavigated = ref(false)
useRouter().afterEach((_to, from) => {
  if (from.matched.length) hasNavigated.value = true
})

const focusActiveView = () => {
  document.querySelector<HTMLElement>('.view')?.focus({ preventScroll: true })
}
</script>

<template>
  <main
    class="site-stage"
    :class="{ 'has-navigated': hasNavigated }"
    :style="lightStyle"
    @pointermove="onPointerMove"
  >
    <div class="ambient-light" aria-hidden="true" />

    <NuxtPage
      :transition="{ name: 'view', mode: 'out-in', onAfterEnter: focusActiveView }"
    />

    <ClientOnly>
      <ConsentBanner />
    </ClientOnly>
  </main>
</template>
