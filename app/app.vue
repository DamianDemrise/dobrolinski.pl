<script setup lang="ts">
import { personSchema } from '~~/cms/derive'
import { useCmsGlobals } from '@demrise/cms-runtime/context'

const { lightStyle, onPointerMove } = usePointerLight()
const globals = useCmsGlobals()
// Panel CMS (tylko build CMS_ADMIN=1) renderuje własny układ, bez warstw strony publicznej.
const currentRoute = useRouter().currentRoute
const isAdmin = computed(() => /^\/admin(\/|$)/.test(currentRoute.value.path))

useHead(() => isAdmin.value ? {} : ({
  script: [
    {
      type: 'application/ld+json',
      textContent: JSON.stringify(personSchema(globals.value.site)),
    },
  ],
}))

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
  <NuxtPage v-if="isAdmin" />
  <main
    v-else
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
