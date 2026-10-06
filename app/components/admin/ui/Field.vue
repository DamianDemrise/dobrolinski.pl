<!--
  Opakowanie pola formularza: etykieta + kontrolka + pomoc + błąd, z poprawnymi for/id.
  <Field label="E-mail" :help :error :id="opcjonalnie">
    <template #default="{ id, describedBy, invalid }">
      <input :id="id" :aria-describedby="describedBy" :aria-invalid="invalid" class="adm-input">
    </template>
    <template #aside>12/70</template>   (opcjonalnie, np. licznik znaków przy etykiecie)
  </Field>
-->
<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{ label: string, help?: string, error?: string, id?: string }>()
const autoId = useId()
const controlId = computed(() => props.id ?? `f-${autoId}`)
const helpId = computed(() => `${controlId.value}-help`)
const errorId = computed(() => `${controlId.value}-error`)
const describedBy = computed(() => [props.help ? helpId.value : '', props.error ? errorId.value : ''].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="adm-field">
    <label class="adm-field__label" :for="controlId">
      <span>{{ label }}</span>
      <slot name="aside" />
    </label>
    <slot :id="controlId" :described-by="describedBy" :invalid="error ? true : undefined" />
    <p v-if="help" :id="helpId" class="adm-field__help">{{ help }}</p>
    <p v-if="error" :id="errorId" class="adm-field__error" role="alert">{{ error }}</p>
  </div>
</template>
