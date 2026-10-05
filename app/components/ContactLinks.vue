<script setup lang="ts">
import { siteContent } from '~/content/site'
</script>

<template>
  <address class="contact">
    <a :href="`mailto:${siteContent.email}`" data-track="mail" data-track-place="home">{{ siteContent.email }}</a>
    <span class="contact__separator" aria-hidden="true">·</span>
    <a :href="siteContent.phoneHref" data-track="phone" data-track-place="home">{{ siteContent.phoneDisplay }}</a>
  </address>
</template>
