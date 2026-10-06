<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { WorkshopOfferCopy } from '~~/cms/types'
import { useCmsGlobals } from '@demrise/cms-runtime/context'
import { vCms } from '@demrise/cms-runtime/directive'
import type { OfferFormProduct } from '~/composables/useOfferForm'

/** Teksty formularza; `note` opcjonalne, bo ebook podaje zgodę przez slot `note`. */
type OfferFormCopy = Omit<WorkshopOfferCopy, 'note'> & { note?: WorkshopOfferCopy['note'] }

const props = withDefaults(defineProps<{
  offer: OfferFormCopy
  /** Co wysyła formularz; oferta nie dopisuje pola `product` do żądania. */
  product?: OfferFormProduct
  /** Ścieżka tekstów w props bloku (v-cms): 'offer' w finale warsztatu, '' gdy teksty są w korzeniu bloku. */
  cmsPath?: string
}>(), { product: 'offer', cmsPath: 'offer' })

const globals = useCmsGlobals()
const site = computed(() => globals.value.site)
const { enabled, email, website, state, fieldError, markShown, submit } = useOfferForm(props.product)
const field = (key: string) => (props.cmsPath ? `${props.cmsPath}.${key}` : key)

const root = ref<HTMLElement | null>(null)
const doneHeading = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  markShown()
  if (!root.value) return
  // Formularz montuje się po useReveal (ClientOnly), więc sam pokazuje się przy wejściu,
  // a offer_form_view liczy raz, gdy jest widoczny co najmniej w połowie.
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) root.value?.classList.add('is-visible')
      if (entry.intersectionRatio >= 0.5) {
        trackOffer('offer_form_view', props.product)
        observer?.disconnect()
      }
    }
  }, { threshold: [0.05, 0.5] })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Po sukcesie formularz znika, więc fokus przechodzi na komunikat.
watch(state, async (value) => {
  if (value !== 'sent') return
  await nextTick()
  doneHeading.value?.focus()
})

const errorText = () => fieldError.value ? props.offer.errors[fieldError.value] : ''
</script>

<template>
  <div v-if="enabled" ref="root" class="workshop-offer reveal">
    <div v-if="state === 'sent'" class="workshop-offer__done">
      <p ref="doneHeading" class="workshop-offer__title" tabindex="-1">{{ offer.success.title }}</p>
      <p class="workshop-offer__text">{{ offer.success.text }}</p>
      <p class="workshop-offer__note">{{ offer.success.hint }}</p>
    </div>

    <template v-else>
      <h3 v-cms="field('title')" class="workshop-offer__title">{{ offer.title }}</h3>
      <p class="workshop-offer__text">
        <template v-for="(line, i) in offer.lines" :key="line">
          <span v-cms="field(`lines.${i}`)" class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>

      <form class="workshop-offer__form" novalidate @submit.prevent="submit">
        <label v-cms="field('label')" class="workshop-offer__label" for="offer-email">{{ offer.label }}</label>
        <div class="workshop-offer__row">
          <input
            id="offer-email"
            v-model="email"
            class="workshop-offer__input"
            type="email"
            name="email"
            autocomplete="email"
            inputmode="email"
            autocapitalize="off"
            spellcheck="false"
            maxlength="254"
            :placeholder="offer.placeholder"
            required
            :aria-invalid="fieldError ? 'true' : undefined"
            :aria-describedby="fieldError ? 'offer-email-error' : 'offer-email-note'"
            :disabled="state === 'sending'"
            @input="fieldError = null"
          >
          <button class="workshop-offer__submit" type="submit" :disabled="state === 'sending'" :aria-busy="state === 'sending'">
            <template v-if="state === 'sending'">{{ offer.sending }}</template>
            <template v-else>{{ offer.submit }} <span aria-hidden="true">→</span></template>
          </button>
        </div>

        <!-- Pułapka na boty: człowiek tego pola nie widzi i nie wypełnia. -->
        <div class="workshop-offer__trap" aria-hidden="true">
          <label for="offer-website">Strona</label>
          <input id="offer-website" v-model="website" type="text" name="website" tabindex="-1" autocomplete="off">
        </div>
      </form>

      <p id="offer-email-note" class="workshop-offer__note">
        <slot name="note">
          {{ offer.note?.text }}
          <NuxtLink :to="site.legal.privacyHref">{{ offer.note?.link }}</NuxtLink>.
        </slot>
      </p>
    </template>

    <div class="workshop-offer__status" role="status" aria-live="polite">
      <p v-if="fieldError" id="offer-email-error" class="workshop-offer__error">{{ errorText() }}</p>
      <p v-else-if="state === 'error'" class="workshop-offer__error">
        {{ offer.errors.failed }}
        <span class="workshop-line">
          {{ offer.errors.failedHint }}
          <a :href="`mailto:${site.email}`" data-track="email_click" :data-track-place="`${product}-error`">{{ site.email }}</a>
        </span>
      </p>
    </div>
  </div>
</template>
