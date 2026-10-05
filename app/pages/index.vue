<script setup lang="ts">
const { activeArea, leaveArea, previewArea, thought, toggleArea } = useSiteExperience()
</script>

<template>
  <HomeView
    :active-area="activeArea"
    :thought="thought"
    @activate-area="toggleArea"
    @leave-area="leaveArea"
    @preview-area="previewArea"
  />
</template>
