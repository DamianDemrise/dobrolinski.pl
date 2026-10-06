<script setup lang="ts">
import CmsPageView from '~/cms/CmsPageView'
import { useCmsPage } from '~/cms/context'
import { useCmsPageHead } from '~/cms/head'

// Te same tagi są też w app.head (nuxt.config), żeby 404/200 miały head strony głównej.
const page = useCmsPage('')
useCmsPageHead(page, 'profile')
</script>

<template>
  <CmsPageView :page="page" />
</template>
