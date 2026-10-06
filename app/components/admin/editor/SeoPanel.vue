<!--
  SEO strony: pola z schema.seoFields (FieldForm), liczniki znaków, podgląd w Google i karty
  w mediach społecznościowych, obraz z biblioteki mediów. Edycja tylko z SEO_EDIT.
-->
<script setup lang="ts">
import type { ImageValue, SeoFields } from '@demrise/cms-core'
import { computed, ref } from 'vue'
import type { EditorStore } from '~/admin/editor/store'
import { schema } from '~/admin/editor/store'
import { levelAllowed } from '~/admin/editor/protocol'
import FieldForm from '~/components/admin/fields/FieldForm.vue'
import MediaPicker from '~/components/admin/fields/MediaPicker.vue'
import Button from '~/components/admin/ui/Button.vue'

const props = defineProps<{ editor: EditorStore }>()
const state = props.editor.state
const canSeo = computed(() => props.editor.session.can('SEO_EDIT'))
const seo = computed(() => state.page!.data.seo as SeoFields & { ogImageAlt?: string })
const picker = ref(false)

const RECOMMENDED: Record<string, [number, number]> = { title: [30, 60], description: [70, 160], ogTitle: [20, 70], ogDescription: [50, 200] }
const counters = computed(() => Object.entries(RECOMMENDED).map(([key, [min, max]]) => {
  const length = String((seo.value as unknown as Record<string, unknown>)[key] ?? '').length
  const field = schema.seoFields.find(f => f.key === key)
  return { key, label: field?.label ?? key, length, min, max, ok: length >= min && length <= max }
}))

const host = computed(() => {
  try {
    return new URL(seo.value.canonical).host + new URL(seo.value.canonical).pathname.replace(/\/$/, '').replace(/\//g, ' › ')
  }
  catch {
    return seo.value.canonical || 'dobrolinski.pl'
  }
})
const ogImageField = schema.seoFields.find(f => f.key === 'ogImage')
const canPickImage = computed(() => canSeo.value && props.editor.canEdit.value && levelAllowed(ogImageField?.level, state.mode))

function onPick(image: ImageValue) {
  props.editor.setSeo('ogImage', new URL(image.src, location.origin).href)
  if (image.alt) props.editor.setSeo('ogImageAlt', image.alt)
}
</script>

<template>
  <div class="adm-stack">
    <p v-if="!canSeo" class="adm-alert adm-alert--neutral">Podgląd tylko do odczytu: edycja SEO wymaga uprawnienia SEO.</p>
    <FieldForm
      :fields="schema.seoFields"
      :model-value="seo as unknown as Record<string, unknown>"
      :mode="state.mode"
      :readonly="!canSeo || !editor.canEdit.value"
      path-prefix="seo"
      @change="(path: string, value: unknown) => editor.setSeo(path, value)"
    />
    <Button v-if="canPickImage" size="sm" @click="picker = true">Wybierz obraz podglądu z biblioteki</Button>

    <section aria-labelledby="seo-len">
      <h3 id="seo-len">Długość tekstów</h3>
      <ul style="margin: 6px 0 0; padding-left: 18px">
        <li v-for="c in counters" :key="c.key">
          {{ c.label }}: <strong>{{ c.length }}</strong> znaków
          <span :style="{ color: c.ok ? 'var(--adm-success)' : 'var(--adm-warning)' }">({{ c.ok ? 'w normie' : `zalecane ${c.min}–${c.max}` }})</span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="seo-serp">
      <h3 id="seo-serp">Podgląd w Google</h3>
      <div class="serp" style="margin-top: 6px">
        <div class="serp__url">{{ host }}</div>
        <div class="serp__title">{{ seo.title.length > 60 ? `${seo.title.slice(0, 60)}…` : seo.title || 'Brak tytułu' }}</div>
        <div class="serp__desc">{{ seo.description.length > 160 ? `${seo.description.slice(0, 160)}…` : seo.description || 'Brak opisu: Google wybierze fragment strony.' }}</div>
        <p v-if="seo.noindex" class="adm-field__error">Strona ukryta przed wyszukiwarkami (noindex).</p>
      </div>
    </section>

    <section aria-labelledby="seo-social">
      <h3 id="seo-social">Podgląd udostępnienia</h3>
      <div class="social" style="margin-top: 6px">
        <img v-if="seo.ogImage" :src="seo.ogImage" :alt="seo.ogImageAlt ?? ''">
        <div class="social__body">
          <small>{{ host.split(' ')[0] }}</small>
          <div><strong>{{ seo.ogTitle || seo.title }}</strong></div>
          <div class="adm-muted">{{ seo.ogDescription || seo.description }}</div>
        </div>
      </div>
    </section>
    <MediaPicker v-model:open="picker" :current-alt="seo.ogImageAlt" @select="onPick" />
  </div>
</template>
