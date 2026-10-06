<!--
  Ustawienia (SETTINGS_MANAGE): adres strony, wypychanie do repo (GitHub), poczta i instrukcja GITHUB_TOKEN.
  Samo wypychanie i konflikty z kodem: Panel (DeployStatus).
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { SettingsResponse } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Ustawienia · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const session = useCmsSession()
const settings = ref<SettingsResponse | null>(null)
const loading = ref(true)
const error = ref('')

const canManage = computed(() => session.can('SETTINGS_MANAGE'))

onMounted(async () => {
  if (!canManage.value) {
    loading.value = false
    return
  }
  try {
    settings.value = await cmsApi.get<SettingsResponse>('/api/settings')
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
})

</script>

<template>
  <Shell title="Ustawienia">
    <p v-if="!canManage" class="adm-alert adm-alert--warning" role="alert">Brak uprawnień do ustawień.</p>
    <p v-else-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <template v-else-if="settings">
      <section class="adm-card adm-stack" aria-labelledby="set-status">
        <h2 id="set-status">Integracje</h2>
        <dl class="adm-dl">
          <dt>Adres strony</dt>
          <dd><a :href="settings.siteUrl" target="_blank" rel="noopener">{{ settings.siteUrl }}<span class="adm-sr"> (nowa karta)</span></a></dd>
          <dt>Wypychanie do repo</dt>
          <dd>
            <Badge :tone="settings.push.configured ? 'success' : 'warning'">{{ settings.push.configured ? 'Skonfigurowana' : 'Nieskonfigurowana' }}</Badge>
            <span class="adm-muted"> Repozytorium: {{ settings.push.repo ?? '—' }}</span>
          </dd>
          <dt>Poczta (linki logowania)</dt>
          <dd><Badge :tone="settings.mailConfigured ? 'success' : 'warning'">{{ settings.mailConfigured ? 'Skonfigurowana' : 'Nieskonfigurowana' }}</Badge></dd>
        </dl>
      </section>


      <section class="adm-card adm-stack" aria-labelledby="set-help">
        <h2 id="set-help">Jak włączyć wypychanie (GITHUB_TOKEN)</h2>
        <ol class="adm-steps">
          <li>GitHub → Settings → Developer settings → Personal access tokens → <strong>Fine-grained tokens</strong> → Generate new token.</li>
          <li>Repository access: <strong>Only select repositories</strong> → <code>DamianDemrise/dobrolinski.pl</code>.</li>
          <li>Permissions → Repository permissions → <strong>Contents: Read and write</strong> (commit treści do repo). Nic więcej.</li>
          <li>W katalogu <code>cms-worker</code>: <code>npx wrangler secret put GITHUB_TOKEN</code> i wklej token. Token nie trafia do repozytorium.</li>
        </ol>
        <p class="adm-muted">Wypchnięcie robi commit opublikowanej treści do repo strony; commit uruchamia wdrożenie. Zmiany w kodzie wracają do panelu same (po pushu do repo).</p>
      </section>
    </template>
  </Shell>
</template>
