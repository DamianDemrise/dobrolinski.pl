<script setup lang="ts">
import CmsPageView from '~/cms/CmsPageView'
import { useCmsPage } from '~/cms/context'
import { useCmsPageHead } from '~/cms/head'

const page = useCmsPage('polityka-prywatnosci')
useCmsPageHead(page, 'website')
</script>

<template>
  <CmsPageView :page="page" />
</template>
