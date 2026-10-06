<!--
  Ustawienia (SETTINGS_MANAGE): adres strony, integracja przebudowy (GitHub), poczta,
  ręczna przebudowa strony publicznej (POST /api/rebuild, CONTENT_PUBLISH) i instrukcja GITHUB_TOKEN.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { RebuildStatus, SettingsResponse } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Ustawienia · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const session = useCmsSession()
const settings = ref<SettingsResponse | null>(null)
const loading = ref(true)
const error = ref('')
const rebuilding = ref(false)
const result = ref<{ status: RebuildStatus, at: Date } | null>(null)
const rebuildError = ref('')

const canManage = computed(() => session.can('SETTINGS_MANAGE'))
const canRebuild = computed(() => session.can('CONTENT_PUBLISH'))

const RESULT: Record<RebuildStatus, { tone: 'neutral' | 'warning' | 'danger', text: string }> = {
  triggered: { tone: 'neutral', text: 'Przebudowa uruchomiona. Strona publiczna odświeży się w ciągu ~1–2 min.' },
  manual: { tone: 'warning', text: 'Automatyczna przebudowa nie jest skonfigurowana (brak GITHUB_TOKEN). Uruchom workflow ręcznie w GitHub Actions: Actions → „Deploy Nuxt to GitHub Pages” → Run workflow.' },
  failed: { tone: 'danger', text: 'GitHub odrzucił wywołanie przebudowy. Sprawdź token (uprawnienia, ważność) albo uruchom workflow ręcznie w GitHub Actions.' },
}

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

async function rebuild() {
  rebuilding.value = true
  rebuildError.value = ''
  result.value = null
  try {
    const response = await cmsApi.post<{ rebuild: RebuildStatus }>('/api/rebuild')
    result.value = { status: response.rebuild, at: new Date() }
  }
  catch (e) {
    rebuildError.value = errorMessage(e)
  }
  finally {
    rebuilding.value = false
  }
}
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
          <dt>Przebudowa po publikacji</dt>
          <dd>
            <Badge :tone="settings.rebuild.configured ? 'success' : 'warning'">{{ settings.rebuild.configured ? 'Skonfigurowana' : 'Nieskonfigurowana' }}</Badge>
            <span class="adm-muted"> Repozytorium: {{ settings.rebuild.repo ?? '—' }}</span>
          </dd>
          <dt>Poczta (linki logowania)</dt>
          <dd><Badge :tone="settings.mailConfigured ? 'success' : 'warning'">{{ settings.mailConfigured ? 'Skonfigurowana' : 'Nieskonfigurowana' }}</Badge></dd>
        </dl>
      </section>

      <section class="adm-card adm-stack" aria-labelledby="set-rebuild">
        <h2 id="set-rebuild">Przebudowa strony</h2>
        <p class="adm-muted">Strona publiczna jest statyczna: po publikacji buduje się od nowa z opublikowanej treści (GitHub Actions). Ręczna przebudowa przydaje się, gdy automatyczna się nie uruchomiła.</p>
        <div v-if="canRebuild">
          <Button variant="primary" :loading="rebuilding" @click="rebuild">Przebuduj stronę teraz</Button>
        </div>
        <p v-else class="adm-muted">Przebudowę uruchamia osoba z uprawnieniem do publikacji.</p>
        <p v-if="result" class="adm-alert" :class="`adm-alert--${RESULT[result.status].tone}`" role="status">{{ RESULT[result.status].text }}</p>
        <p v-if="rebuildError" class="adm-alert adm-alert--danger" role="alert">Nie uruchomiono przebudowy: {{ rebuildError }}</p>
      </section>

      <section class="adm-card adm-stack" aria-labelledby="set-help">
        <h2 id="set-help">Jak włączyć automatyczną przebudowę (GITHUB_TOKEN)</h2>
        <ol class="adm-steps">
          <li>GitHub → Settings → Developer settings → Personal access tokens → <strong>Fine-grained tokens</strong> → Generate new token.</li>
          <li>Repository access: <strong>Only select repositories</strong> → <code>DamianDemrise/dobrolinski.pl</code>.</li>
          <li>Permissions → Repository permissions → <strong>Contents: Read and write</strong> (wymagane przez <code>repository_dispatch</code>). Nic więcej.</li>
          <li>W katalogu <code>cms-worker</code>: <code>npx wrangler secret put GITHUB_TOKEN</code> i wklej token. Token nie trafia do repozytorium.</li>
        </ol>
        <p class="adm-muted">Bez tokenu publikacja zapisuje treść w CMS, ale strona publiczna nie przebuduje się sama: trzeba ręcznie uruchomić workflow w GitHub Actions (Actions → „Deploy Nuxt to GitHub Pages” → Run workflow).</p>
      </section>
    </template>
  </Shell>
</template>
