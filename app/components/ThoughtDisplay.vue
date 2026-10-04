<script setup lang="ts">
defineProps<{ thought: string }>()
</script>

<template>
  <div class="thought-wrap" aria-live="polite" aria-atomic="true">
    <Transition name="thought" mode="out-in">
      <p :key="thought" class="thought">
        {{ thought }}
      </p>
    </Transition>
  </div>
</template>
