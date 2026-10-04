<script setup lang="ts">
import { siteContent } from '~/content/site'
</script>

<template>
  <address class="contact">
    <a :href="`mailto:${siteContent.email}`">{{ siteContent.email }}</a>
    <span class="contact__separator" aria-hidden="true">·</span>
    <a :href="siteContent.phoneHref">{{ siteContent.phoneDisplay }}</a>
  </address>
</template>
