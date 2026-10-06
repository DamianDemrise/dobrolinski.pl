<script setup lang="ts">
import CmsPageView from '~/cms/CmsPageView'
import { useCmsPage } from '~/cms/context'
import { useCmsPageHead } from '~/cms/head'
import { hasPublishedPage } from '~/cms/published'

const SLUG = 'na-koncu-jest-czlowiek'

// Strona istnieje publicznie dopiero po publikacji w panelu (content/published.json); wcześniej 404.
if (!hasPublishedPage(SLUG)) throw createError({ statusCode: 404, statusMessage: 'Nie znaleziono', fatal: true })

const page = useCmsPage(SLUG)
useCmsPageHead(page, 'website')
</script>

<template>
  <CmsPageView :page="page" />
</template>
