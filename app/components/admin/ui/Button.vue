<!--
  Przycisk panelu (prawdziwy <button>).
  <Button variant="primary|secondary|ghost|danger" size="sm|md" :loading :disabled type="button|submit" @click>Tekst</Button>
  loading: wyłącza przycisk, pokazuje wskaźnik i ustawia aria-busy.
-->
<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), { variant: 'secondary', size: 'md', loading: false, disabled: false, type: 'button' })
</script>

<template>
  <button
    :type="type"
    class="adm-btn"
    :class="[`adm-btn--${variant}`, size === 'sm' && 'adm-btn--sm']"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="adm-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
