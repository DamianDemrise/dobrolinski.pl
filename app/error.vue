<script setup lang="ts">
defineProps<{ error: { statusCode?: number } }>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <main class="error-page">
    <p class="error-page__code">{{ error.statusCode || 404 }}</p>
    <h1>Tej strony tu nie ma.</h1>
    <button type="button" @click="handleError">Wróć do początku →</button>
  </main>
</template>
