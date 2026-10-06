<script setup lang="ts">
import { useCmsGlobals } from '@demrise/cms-runtime/context'

const globals = useCmsGlobals()
const consent = computed(() => globals.value.site.consent)
const { decide, panelOpen } = useAnalyticsConsent()
</script>

<template>
  <Transition name="consent">
    <section
      v-if="panelOpen"
      class="consent"
      role="region"
      :aria-label="consent.label"
    >
      <p class="consent__text">{{ consent.text }}</p>
      <div class="consent__actions">
        <button type="button" class="consent__button" @click="decide('denied')">
          {{ consent.reject }}
        </button>
        <button
          type="button"
          class="consent__button consent__button--primary"
          @click="decide('granted')"
        >
          {{ consent.accept }}
        </button>
      </div>
    </section>
    <button
      v-else
      type="button"
      class="consent-toggle"
      @click="panelOpen = true"
    >
      {{ consent.reopen }}
    </button>
  </Transition>
</template>
