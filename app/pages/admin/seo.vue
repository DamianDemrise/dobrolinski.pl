<!--
  SEO wszystkich stron (wersja robocza): długość tytułu i opisu, adres kanoniczny, noindex,
  obraz podglądu linku, status ok/do uzupełnienia (jak seoStatus w API). Edycja w edytorze
  strony na zakładce SEO (/admin/edit/<id>?tab=seo).
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { Entity, EntitySummary, PageDocument } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage, STATUS_LABELS } from '~/admin/format'
import { lengthCheck, SEO_LIMITS } from '~/admin/seo'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'SEO · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

interface Row { summary: EntitySummary, doc: PageDocument }
const rows = ref<Row[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const list = await cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=page')
    const full = await Promise.all(list.items.map(s => cmsApi.get<Entity<'page'>>(`/api/entities/${encodeURIComponent(s.id)}`)))
    rows.value = list.items.map((summary, i) => ({ summary, doc: full[i]!.draft as PageDocument }))
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
})

const incomplete = computed(() => rows.value.filter(r => r.summary.seoStatus !== 'ok').length)
const TONE = { ok: 'success', short: 'warning', long: 'danger', empty: 'danger' } as const
</script>

<template>
  <Shell title="SEO">
    <p class="adm-muted">
      Wersje robocze stron. Zalecane długości: tytuł {{ SEO_LIMITS.title.min }}–{{ SEO_LIMITS.title.max }} znaków,
      opis {{ SEO_LIMITS.description.min }}–{{ SEO_LIMITS.description.max }} znaków.
      „Uzupełnione” = tytuł, opis i adres kanoniczny wpisane.
    </p>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <template v-else>
      <p v-if="incomplete" class="adm-alert adm-alert--warning" role="status">Do uzupełnienia: {{ incomplete }} {{ incomplete === 1 ? 'strona' : 'strony' }}.</p>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th scope="col">Strona</th>
              <th scope="col">Tytuł (title)</th>
              <th scope="col">Opis (description)</th>
              <th scope="col">Kanoniczny</th>
              <th scope="col">Indeksowanie</th>
              <th scope="col">Obraz podglądu</th>
              <th scope="col">Status</th>
              <th scope="col"><span class="adm-sr">Akcje</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ summary, doc } in rows" :key="summary.id">
              <td>
                <strong>{{ summary.title }}</strong>
                <div class="adm-muted">/{{ summary.slug }}</div>
                <Badge :tone="STATUS_LABELS[summary.status].tone">{{ STATUS_LABELS[summary.status].label }}</Badge>
              </td>
              <td class="adm-seo-cell">
                <div>{{ doc.seo?.title || '—' }}</div>
                <Badge :tone="TONE[lengthCheck('title', doc.seo?.title).state]">{{ lengthCheck('title', doc.seo?.title).label }}</Badge>
              </td>
              <td class="adm-seo-cell">
                <div class="adm-clamp">{{ doc.seo?.description || '—' }}</div>
                <Badge :tone="TONE[lengthCheck('description', doc.seo?.description).state]">{{ lengthCheck('description', doc.seo?.description).label }}</Badge>
              </td>
              <td class="adm-break">{{ doc.seo?.canonical || '—' }}</td>
              <td>
                <Badge :tone="doc.seo?.noindex ? 'danger' : 'success'">{{ doc.seo?.noindex ? 'noindex (ukryta)' : 'indeksowana' }}</Badge>
              </td>
              <td>
                <Badge :tone="doc.seo?.ogImage ? 'success' : 'warning'">{{ doc.seo?.ogImage ? 'jest' : 'brak' }}</Badge>
              </td>
              <td>
                <Badge :tone="summary.seoStatus === 'ok' ? 'success' : 'warning'">{{ summary.seoStatus === 'ok' ? 'Uzupełnione' : 'Do uzupełnienia' }}</Badge>
              </td>
              <td>
                <NuxtLink class="adm-btn adm-btn--primary adm-btn--sm" :to="`/admin/edit/${encodeURIComponent(summary.id)}?tab=seo`">Edytuj SEO<span class="adm-sr"> strony {{ summary.title }}</span></NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </Shell>
</template>
