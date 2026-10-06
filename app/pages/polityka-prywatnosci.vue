<script setup lang="ts">
import CmsPageView from '~/cms/CmsPageView'
import { useCmsPage } from '@demrise/cms-runtime/context'
import { useCmsPageHead } from '@demrise/cms-runtime/head'

const page = useCmsPage('polityka-prywatnosci')
useCmsPageHead(page, 'website')
</script>

<template>
  <CmsPageView :page="page" />
</template>
