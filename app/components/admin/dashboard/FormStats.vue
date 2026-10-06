<!--
  Pulpit: ile osób poprosiło o ofertę warsztatu i o ebook (anonimowy licznik z offer-worker, bez adresów).
-->
<script setup lang="ts">
import type { StatsResponse } from '@demrise/cms-core'
import { onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage } from '~/admin/format'

const stats = ref<StatsResponse | null>(null)
const error = ref('')

const ROWS = [
  { key: 'offer', label: 'Oferta warsztatu' },
  { key: 'ebook', label: 'Ebook' },
] as const

onMounted(async () => {
  try {
    stats.value = await cmsApi.get<StatsResponse>('/api/stats')
  }
  catch (e) {
    error.value = errorMessage(e)
  }
})
</script>

<template>
  <section class="adm-card adm-stack" aria-labelledby="dash-forms">
    <h2 id="dash-forms">Zapytania ze strony</h2>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">Nie wczytano licznika: {{ error }}</p>
    <p v-else-if="!stats" class="adm-muted" role="status">Wczytywanie…</p>
    <div v-else class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr><th scope="col">Formularz</th><th scope="col">7 dni</th><th scope="col">30 dni</th><th scope="col">Łącznie</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in ROWS" :key="row.key">
            <th scope="row">{{ row.label }}</th>
            <td>{{ stats.forms[row.key].days7 }}</td>
            <td>{{ stats.forms[row.key].days30 }}</td>
            <td>{{ stats.forms[row.key].total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="adm-muted">Liczone są wysłane maile, bez adresów. Kto prosił, widać w powiadomieniach na skrzynce.</p>
  </section>
</template>
