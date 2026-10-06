<!--
  Etykieta statusu. <Badge tone="neutral|success|warning|danger">Opublikowana</Badge>
-->
<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' }>(), { tone: 'neutral' })
</script>

<template>
  <span class="adm-badge" :class="`adm-badge--${tone}`"><slot /></span>
</template>
