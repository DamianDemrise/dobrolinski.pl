<!-- Pole 'link': etykieta + adres (walidacja isSafeUrl z rdzenia). -->
<script setup lang="ts">
import type { LinkValue } from '@demrise/cms-core'
import { isSafeUrl } from '@demrise/cms-core'
import { computed } from 'vue'

const props = defineProps<{ id: string, value: LinkValue | undefined, disabled: boolean, describedBy?: string }>()
const emit = defineEmits<{ update: [value: LinkValue] }>()

const link = computed<LinkValue>(() => props.value ?? { label: '', href: '' })
const hrefError = computed(() => (link.value.href !== '' && !isSafeUrl(link.value.href) ? 'Dozwolone: https://…, /ścieżka, #kotwica, mailto:, tel:' : ''))
</script>

<template>
  <div class="adm-stack" style="gap: 6px" role="group" :aria-describedby="describedBy">
    <input
      :id="id"
      class="adm-input"
      type="text"
      :value="link.label"
      :readonly="disabled"
      aria-label="Tekst linku"
      placeholder="Tekst linku"
      @input="emit('update', { ...link, label: ($event.target as HTMLInputElement).value })"
    >
    <input
      :id="`${id}-href`"
      class="adm-input"
      type="text"
      inputmode="url"
      :value="link.href"
      :readonly="disabled"
      aria-label="Adres linku"
      placeholder="https://… albo /ścieżka"
      :aria-invalid="hrefError ? 'true' : undefined"
      @input="emit('update', { ...link, href: ($event.target as HTMLInputElement).value.trim() })"
    >
    <p v-if="hrefError" class="adm-field__error" role="alert">{{ hrefError }}</p>
  </div>
</template>
