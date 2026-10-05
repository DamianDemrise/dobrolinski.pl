<script setup lang="ts">
defineEmits<{ open: [] }>()
</script>

<template>
  <button class="current-project" type="button" @click="$emit('open')">
    <span class="current-project__label">Teraz</span>
    <span class="current-project__line" aria-hidden="true" />
    <span>01 / Warsztat: Człowiek</span>
    <span class="current-project__arrow" aria-hidden="true">→</span>
  </button>
</template>
