<!--
  Historia wersji encji (strona, treść globalna, komponent, tokeny): lista rewizji z serwera,
  podgląd różnic względem bieżącej wersji roboczej (diffValues z rdzenia) i przywrócenie
  (kopiuje rewizję do draftu; historia zostaje).
  <RevisionsDrawer v-model:open :entity-id :current="dane robocze" :can-restore :restore="(revisionId) => Promise" />
-->
<script setup lang="ts">
import type { Revision, RevisionSummary } from '@demrise/cms-core'
import { diffValues } from '@demrise/cms-core'
import { computed, ref, watch } from 'vue'
import { cmsApi } from '~/admin/api'
import { useCmsSession } from '~/admin/session'
import { errorMessage, formatDate } from '~/admin/format'
import { useAdminToast } from '~/admin/toast'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

const props = defineProps<{
  entityId: string
  current: unknown
  canRestore: boolean
  restore: (revisionId: string) => Promise<void>
}>()
const session = useCmsSession()
const open = defineModel<boolean>('open', { required: true })
const toast = useAdminToast()

const KIND: Record<Revision['kind'], { label: string, tone: 'success' | 'neutral' | 'warning' }> = {
  publish: { label: 'Publikacja', tone: 'success' },
  checkpoint: { label: 'Autozapis', tone: 'neutral' },
  restore: { label: 'Przywrócenie', tone: 'warning' },
}

const items = ref<RevisionSummary[]>([])
const loading = ref(false)
const error = ref('')
const shown = ref<Revision | null>(null)
const restoring = ref<RevisionSummary | null>(null)
const busy = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = (await cmsApi.get<{ items: RevisionSummary[] }>(`/api/entities/${encodeURIComponent(props.entityId)}/revisions`)).items
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
}
watch(open, (value) => {
  if (value) {
    shown.value = null
    void load()
  }
}, { immediate: true })

async function show(item: RevisionSummary) {
  try {
    shown.value = await cmsApi.get<Revision>(`/api/revisions/${encodeURIComponent(item.id)}`)
  }
  catch (e) {
    toast.show(errorMessage(e), 'danger')
  }
}

const diff = computed(() => (shown.value ? diffValues(shown.value.data, props.current) : []))
const text = (value: unknown) => (value === undefined ? '(brak)' : typeof value === 'string' ? value || '(pusty tekst)' : JSON.stringify(value))

const restoreOpen = computed({ get: () => restoring.value !== null, set: (v) => { if (!v) restoring.value = null } })
async function confirmRestore() {
  const item = restoring.value
  if (!item) return
  busy.value = true
  try {
    await props.restore(item.id)
    toast.show(`Przywrócono wersję ${item.version} do wersji roboczej`, 'success')
    restoring.value = null
    shown.value = null
    await load()
  }
  catch (e) {
    toast.show(`Nie przywrócono: ${errorMessage(e)}`, 'danger')
  }
  finally {
    busy.value = false
  }
}

const userName = (id: string | null) => (id && id === session.user.value?.id ? session.user.value.name : id ?? '—')
</script>

<template>
  <Dialog v-model:open="open" title="Historia wersji" drawer>
    <div class="adm-stack">
      <p class="adm-muted">Rewizje powstają przy publikacji, przywróceniu i co kilka minut autozapisu. Przywrócenie zmienia tylko wersję roboczą.</p>
      <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
      <div v-else class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th scope="col">Wersja</th><th scope="col">Rodzaj</th><th scope="col">Data</th><th scope="col">Kto</th><th scope="col"><span class="adm-sr">Akcje</span></th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" :aria-current="shown?.id === item.id">
              <td>v{{ item.version }}</td>
              <td><Badge :tone="KIND[item.kind].tone">{{ KIND[item.kind].label }}</Badge></td>
              <td>{{ formatDate(item.createdAt) }}</td>
              <td>{{ userName(item.createdBy) }}</td>
              <td>
                <div class="adm-row" style="justify-content: flex-end">
                  <Button size="sm" @click="show(item)">Pokaż<span class="adm-sr"> wersję {{ item.version }}</span></Button>
                  <Button v-if="canRestore" size="sm" variant="secondary" @click="restoring = item">Przywróć<span class="adm-sr"> wersję {{ item.version }}</span></Button>
                </div>
              </td>
            </tr>
            <tr v-if="!items.length"><td colspan="5" class="adm-muted">Brak rewizji.</td></tr>
          </tbody>
        </table>
      </div>

      <section v-if="shown" aria-labelledby="rev-diff">
        <h3 id="rev-diff">Wersja {{ shown.version }} → bieżąca wersja robocza ({{ diff.length }} {{ diff.length === 1 ? 'zmiana' : 'zmian' }})</h3>
        <p v-if="!diff.length" class="adm-muted">Bez różnic.</p>
        <div class="diff" style="margin-top: 8px">
          <div v-for="d in diff.slice(0, 200)" :key="d.path" class="diff__item">
            <div class="diff__path">{{ d.path }}</div>
            <div><span class="adm-sr">Przed: </span><del class="diff__before">{{ text(d.before) }}</del></div>
            <div><span class="adm-sr">Teraz: </span><ins class="diff__after" style="text-decoration: none">{{ text(d.after) }}</ins></div>
          </div>
        </div>
      </section>
    </div>

    <Dialog v-model:open="restoreOpen" title="Przywrócić wersję?">
      <p>Wersja {{ restoring?.version }} ({{ formatDate(restoring?.createdAt) }}) zastąpi bieżącą wersję roboczą. Strona publiczna się nie zmieni do publikacji. Historia wersji zostaje.</p>
      <template #footer>
        <Button @click="restoring = null">Anuluj</Button>
        <Button variant="primary" :loading="busy" @click="confirmRestore">Przywróć</Button>
      </template>
    </Dialog>
  </Dialog>
</template>
