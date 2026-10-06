<!--
  Pulpit: czy wszystko, co opublikowane w CMS, jest już na dobrolinski.pl, i przycisk „Wypchnij na stronę”.
  Bez GITHUB_TOKEN w Workerze przycisk prowadzi do GitHub Actions (Run workflow).
-->
<script setup lang="ts">
import type { DeployResponse, RebuildStatus } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { REBUILD_MESSAGES, rebuildTone, runLabel } from '~/admin/deploy'
import { errorMessage, formatDate, plural } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'

const session = useCmsSession()
const deploy = ref<DeployResponse | null>(null)
const error = ref('')
const pushing = ref(false)
const pushed = ref<RebuildStatus | null>(null)

const canPublish = computed(() => session.can('CONTENT_PUBLISH'))
const pendingCount = computed(() => deploy.value?.pending?.length ?? 0)
const last = computed(() => (deploy.value?.lastRun ? runLabel(deploy.value.lastRun) : null))

async function load() {
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
  try {
    pushed.value = (await cmsApi.post<{ rebuild: RebuildStatus }>('/api/rebuild')).rebuild
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    pushing.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="adm-card adm-stack" aria-labelledby="dash-deploy">
    <h2 id="dash-deploy">Strona publiczna</h2>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="!deploy" class="adm-muted" role="status">Wczytywanie…</p>
    <template v-else>
      <p v-if="deploy.pending === null" class="adm-alert adm-alert--warning" role="status">Nie udało się sprawdzić stanu w GitHubie. Treść w CMS jest bezpieczna.</p>
      <p v-else-if="pendingCount === 0" class="adm-alert adm-alert--neutral" role="status">Wszystko, co opublikowane, jest już na stronie.</p>
      <div v-else class="adm-stack">
        <p class="adm-alert adm-alert--warning" role="status">Do wypchnięcia: {{ plural(pendingCount, ['publikacja', 'publikacje', 'publikacji']) }}. Na stronie jeszcze ich nie widać.</p>
        <ul class="adm-list">
          <li v-for="item in deploy.pending" :key="item.id">{{ item.title }} <span class="adm-muted">· {{ formatDate(item.publishedAt) }}</span></li>
        </ul>
      </div>
      <dl class="adm-dl">
        <dt>Ostatnie wypchnięcie</dt>
        <dd>
          <template v-if="deploy.lastRun && last">
            <Badge :tone="last.tone">{{ last.text }}</Badge>
            <a :href="deploy.lastRun.url" target="_blank" rel="noopener"> {{ formatDate(deploy.lastRun.createdAt) }}<span class="adm-sr"> (nowa karta)</span></a>
          </template>
          <span v-else class="adm-muted">brak danych</span>
        </dd>
      </dl>
      <div v-if="canPublish" class="adm-row">
        <Button v-if="deploy.canTrigger" variant="primary" :loading="pushing" @click="push">Wypchnij na stronę</Button>
        <a v-else-if="deploy.actionsUrl" class="adm-btn adm-btn--primary" :href="deploy.actionsUrl" target="_blank" rel="noopener">Wypchnij na stronę (GitHub)<span class="adm-sr"> (nowa karta)</span></a>
        <Button variant="ghost" size="sm" @click="load">Odśwież stan</Button>
      </div>
      <p v-if="canPublish && !deploy.canTrigger" class="adm-muted">W GitHubie kliknij „Run workflow” → „Run workflow”. Strona odświeży się po ~1–2 min.</p>
      <p v-if="pushed" class="adm-alert" :class="rebuildTone(pushed)" role="status">{{ REBUILD_MESSAGES[pushed] }}</p>
    </template>
  </section>
</template>
