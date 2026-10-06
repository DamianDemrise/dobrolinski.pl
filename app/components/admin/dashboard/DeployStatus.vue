<!--
  Pulpit: co opublikowane w CMS nie jest jeszcze na dobrolinski.pl, konflikty panel ↔ repo
  i „Wypchnij na stronę” (commit do repo strony → wdrożenie GitHub Pages).
-->
<script setup lang="ts">
import type { DeployResponse, PushResponse, ResolveChoice, SyncConflict } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { CHANGE_LABELS, runLabel } from '~/admin/deploy'
import { errorMessage, formatDate, plural } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'

const session = useCmsSession()
const deploy = ref<DeployResponse | null>(null)
const error = ref('')
const pushing = ref(false)
const resolving = ref<string | null>(null)
const pushed = ref<PushResponse | null>(null)

const canPublish = computed(() => session.can('CONTENT_PUBLISH'))
const pendingCount = computed(() => deploy.value?.pending?.length ?? 0)
const last = computed(() => (deploy.value?.lastRun ? runLabel(deploy.value.lastRun) : null))

async function load() {
  error.value = ''
  try {
    deploy.value = await cmsApi.get<DeployResponse>('/api/deploy')
  }
  catch (e) {
    error.value = errorMessage(e)
  }
}

async function push() {
  pushing.value = true
  pushed.value = null
  error.value = ''
  try {
    pushed.value = await cmsApi.post<PushResponse>('/api/push')
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    pushing.value = false
    await load()
  }
}

async function resolve(conflict: SyncConflict, choice: ResolveChoice) {
  resolving.value = conflict.key
  try {
    await cmsApi.post('/api/sync/resolve', { key: conflict.key, choice })
    await load()
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    resolving.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="adm-card adm-stack" aria-labelledby="dash-deploy">
    <h2 id="dash-deploy">Strona publiczna</h2>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-if="!deploy && !error" class="adm-muted" role="status">Wczytywanie…</p>
    <template v-if="deploy">
      <div v-if="deploy.conflicts.length" class="adm-stack">
        <p class="adm-alert adm-alert--warning" role="status">Zmiana i w panelu, i w kodzie strony. Wybierz, która wersja zostaje. Do tego czasu wypychanie jest wstrzymane.</p>
        <ul class="adm-list">
          <li v-for="conflict in deploy.conflicts" :key="conflict.key" class="adm-row">
            <strong>{{ conflict.title }}</strong>
            <Button size="sm" :loading="resolving === conflict.key" @click="resolve(conflict, 'cms')">Zostaw z panelu</Button>
            <Button size="sm" variant="ghost" :loading="resolving === conflict.key" @click="resolve(conflict, 'repo')">Weź z kodu</Button>
          </li>
        </ul>
      </div>

      <p v-if="deploy.pending === null" class="adm-alert adm-alert--warning" role="status">Nie udało się sprawdzić repo strony. Treść w CMS jest bezpieczna, spróbuj za chwilę.</p>
      <p v-else-if="pendingCount === 0" class="adm-alert adm-alert--neutral" role="status">Wszystko, co opublikowane, jest już na stronie.</p>
      <div v-else class="adm-stack">
        <p class="adm-alert adm-alert--warning" role="status">Do wypchnięcia: {{ plural(pendingCount, ['zmiana', 'zmiany', 'zmian']) }}. Na stronie jeszcze ich nie widać.</p>
        <ul class="adm-list">
          <li v-for="item in deploy.pending" :key="item.key">{{ item.title }} <span class="adm-muted">· {{ CHANGE_LABELS[item.change] }}</span></li>
        </ul>
      </div>

      <dl class="adm-dl">
        <dt>Ostatnie wdrożenie</dt>
        <dd>
          <template v-if="deploy.lastRun && last">
            <Badge :tone="last.tone">{{ last.text }}</Badge>
            <a :href="deploy.lastRun.url" target="_blank" rel="noopener"> {{ formatDate(deploy.lastRun.createdAt) }}<span class="adm-sr"> (nowa karta)</span></a>
          </template>
          <span v-else class="adm-muted">brak danych</span>
        </dd>
        <dt>Synchronizacja z kodem</dt>
        <dd>{{ formatDate(deploy.syncedAt) }}</dd>
      </dl>

      <div v-if="canPublish" class="adm-row">
        <Button variant="primary" :loading="pushing" :disabled="!deploy.canPush || !pendingCount || deploy.conflicts.length > 0" @click="push">Wypchnij na stronę</Button>
        <Button variant="ghost" size="sm" @click="load">Odśwież</Button>
      </div>
      <p v-if="canPublish && !deploy.canPush" class="adm-muted">Wypychanie nie jest skonfigurowane (brak tokenu GitHub w CMS): Ustawienia → instrukcja.</p>
      <p v-if="pushed?.status === 'pushed'" class="adm-alert adm-alert--neutral" role="status">
        Wypchnięte. Strona odświeży się w ciągu ~1–2 min.
        <a :href="pushed.commitUrl" target="_blank" rel="noopener">Zmiana w repo<span class="adm-sr"> (nowa karta)</span></a>
      </p>
      <p v-else-if="pushed?.status === 'up_to_date'" class="adm-alert adm-alert--neutral" role="status">Nic do wypchnięcia: strona jest aktualna.</p>
    </template>
  </section>
</template>
