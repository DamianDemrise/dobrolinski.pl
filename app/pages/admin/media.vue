<!--
  Biblioteka mediów: siatka/lista z wyszukiwaniem (nazwa, ALT), upload wielu plików (MEDIA_UPLOAD),
  panel szczegółów: ALT i nazwa pliku (PATCH), podmiana pliku (to samo id, wszystkie użycia
  pokazują nowy obraz), użycia z linkami do edycji, kopiowanie adresu i usuwanie (MEDIA_DELETE;
  409 in_use → lista użyć i świadome drugie potwierdzenie ?force=1).
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { EntityKind, EntitySummary, MediaItem, MediaListResponse, MediaUsage } from '@demrise/cms-core'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { cmsApi, CmsApiError } from '~/admin/api'
import { entityEditPath } from '~/admin/entities'
import { errorMessage, formatBytes, formatDate } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import { useAdminToast } from '~/admin/toast'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'
import Field from '~/components/admin/ui/Field.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Media · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif'
const VIEW_KEY = 'cms:media-view'

const session = useCmsSession()
const toast = useAdminToast()
const items = ref<MediaItem[]>([])
const entities = ref<Record<string, { kind: EntityKind, title: string }>>({})
const loading = ref(true)
const error = ref('')
const query = ref('')
const view = ref<'grid' | 'list'>('grid')
const selectedId = ref<string | null>(null)

const canUpload = computed(() => session.can('MEDIA_UPLOAD'))
const canDelete = computed(() => session.can('MEDIA_DELETE'))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? items.value.filter(i => i.filename.toLowerCase().includes(q) || i.alt.toLowerCase().includes(q)) : items.value
})
const selected = computed(() => items.value.find(i => i.id === selectedId.value) ?? null)
const dims = (item: MediaItem) => (item.width && item.height ? `${item.width}×${item.height}` : '—')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [media, all] = await Promise.all([
      cmsApi.get<MediaListResponse>('/api/media'),
      cmsApi.get<{ items: EntitySummary[] }>('/api/entities').catch(() => ({ items: [] as EntitySummary[] })),
    ])
    items.value = media.items
    entities.value = Object.fromEntries(all.items.map(e => [e.id, { kind: e.kind, title: e.title }]))
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  try {
    if (localStorage.getItem(VIEW_KEY) === 'list') view.value = 'list'
  }
  catch { /* tylko wygoda */ }
  void load()
})
watch(view, (v) => {
  try {
    localStorage.setItem(VIEW_KEY, v)
  }
  catch { /* tylko wygoda */ }
})

const replaceItem = (item: MediaItem) => {
  items.value = items.value.map(i => (i.id === item.id ? item : i))
}

/* ---------- Upload wielu plików ---------- */
interface UploadRow { key: number, name: string, size: number, status: 'pending' | 'uploading' | 'done' | 'error', message: string }
const uploads = ref<UploadRow[]>([])
const uploadInput = ref<HTMLInputElement | null>(null)
let uploadSeq = 0
const uploading = computed(() => uploads.value.some(u => u.status === 'pending' || u.status === 'uploading'))
const uploadProgress = computed(() => {
  const done = uploads.value.filter(u => u.status === 'done' || u.status === 'error').length
  return `${done}/${uploads.value.length}`
})

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (!files.length) return
  const rows = files.map(file => ({ key: ++uploadSeq, name: file.name, size: file.size, status: 'pending' as const, message: '' }))
  uploads.value = [...uploads.value.filter(u => u.status !== 'done'), ...rows]
  // Po kolei: limit Workera i czytelny postęp.
  for (const [i, file] of files.entries()) {
    const row = uploads.value.find(u => u.key === rows[i]!.key)!
    row.status = 'uploading'
    const form = new FormData()
    form.append('file', file)
    try {
      const item = await cmsApi.upload<MediaItem>('/api/media', form)
      items.value = [item, ...items.value]
      row.status = 'done'
      row.message = `${dims(item)} · ${formatBytes(item.size)}`
      if (files.length === 1) selectedId.value = item.id
    }
    catch (e) {
      row.status = 'error'
      row.message = errorMessage(e)
    }
  }
  const failed = rows.filter(r => uploads.value.find(u => u.key === r.key)?.status === 'error').length
  if (failed) toast.show(`Nie dodano ${failed} z ${rows.length} plików`, 'danger')
  else toast.show(rows.length === 1 ? 'Plik dodany do biblioteki' : `Dodano ${rows.length} pliki`, 'success')
}

const UPLOAD_LABELS: Record<UploadRow['status'], string> = { pending: 'w kolejce', uploading: 'wysyłanie…', done: 'dodano', error: 'błąd' }

/* ---------- Szczegóły ---------- */
const alt = ref('')
const filename = ref('')
const saving = ref(false)
const usages = ref<MediaUsage[] | null>(null)
const usageError = ref('')
const replaceInput = ref<HTMLInputElement | null>(null)
const replacing = ref(false)

watch(selected, (item, previous) => {
  if (!item) return
  if (item.id !== previous?.id) {
    usages.value = null
    usageError.value = ''
    void loadUsages(item.id)
  }
  alt.value = item.alt
  filename.value = item.filename
}, { immediate: true })

async function loadUsages(id: string) {
  try {
    const result = await cmsApi.get<{ usages: MediaUsage[] }>(`/api/media/${encodeURIComponent(id)}/usage`)
    if (selectedId.value === id) usages.value = result.usages
  }
  catch (e) {
    usageError.value = errorMessage(e)
  }
}

const dirty = computed(() => !!selected.value && (alt.value.trim() !== selected.value.alt || filename.value.trim() !== selected.value.filename))

async function saveDetails() {
  const item = selected.value
  if (!item) return
  saving.value = true
  try {
    const body: Record<string, string> = {}
    if (alt.value.trim() !== item.alt) body.alt = alt.value.trim()
    if (filename.value.trim() !== item.filename) body.filename = filename.value.trim()
    const updated = await cmsApi.patch<MediaItem>(`/api/media/${encodeURIComponent(item.id)}`, body)
    replaceItem(updated)
    toast.show(updated.filename !== filename.value.trim() ? `Zapisano (nazwa po oczyszczeniu: ${updated.filename})` : 'Zapisano', 'success')
  }
  catch (e) {
    toast.show(`Nie zapisano: ${errorMessage(e)}`, 'danger')
  }
  finally {
    saving.value = false
  }
}

async function onReplace(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const item = selected.value
  if (!file || !item) return
  replacing.value = true
  const form = new FormData()
  form.append('file', file)
  try {
    const updated = await cmsApi.upload<MediaItem>(`/api/media/${encodeURIComponent(item.id)}/replace`, form)
    // Ten sam adres pliku: wymuszenie odświeżenia miniatury w panelu.
    replaceItem({ ...updated, url: `${updated.url}?v=${Date.now()}` })
    toast.show('Plik podmieniony. Wszystkie użycia pokazują nowy obraz (strona publiczna po przebudowie).', 'success')
  }
  catch (e) {
    toast.show(`Nie podmieniono pliku: ${errorMessage(e)}`, 'danger')
  }
  finally {
    replacing.value = false
  }
}

const absoluteUrl = (item: MediaItem) => `${location.origin}${item.url.replace(/\?v=\d+$/, '')}`

async function copyUrl(item: MediaItem) {
  const url = absoluteUrl(item)
  try {
    await navigator.clipboard.writeText(url)
    toast.show('Adres skopiowany', 'success')
  }
  catch {
    toast.show(`Nie udało się skopiować. Adres: ${url}`, 'warning', 0)
  }
}

const usageLink = (u: MediaUsage) => entityEditPath(entities.value[u.entityId]?.kind, u.entityId)
const usageWhere = (u: MediaUsage) => (u.path.startsWith('published') ? 'wersja opublikowana' : 'wersja robocza')

/* ---------- Usuwanie ---------- */
const deleteOpen = ref(false)
const deleteUsages = ref<MediaUsage[] | null>(null)
const forceConfirmed = ref(false)
const forceBox = ref<HTMLInputElement | null>(null)
const deleting = ref(false)

function askDelete() {
  deleteUsages.value = null
  forceConfirmed.value = false
  deleteOpen.value = true
}

async function doDelete(force: boolean) {
  const item = selected.value
  if (!item) return
  deleting.value = true
  try {
    await cmsApi.delete(`/api/media/${encodeURIComponent(item.id)}${force ? '?force=1' : ''}`)
    items.value = items.value.filter(i => i.id !== item.id)
    selectedId.value = null
    deleteOpen.value = false
    toast.show(`Usunięto ${item.filename}`, 'success')
  }
  catch (e) {
    if (e instanceof CmsApiError && e.status === 409 && e.code === 'in_use') {
      deleteUsages.value = ((e.body as { usages?: MediaUsage[] } | null)?.usages) ?? []
      // Przycisk „Usuń” znika: fokus na potwierdzenie, żeby nie wypadł z dialogu.
      await nextTick()
      forceBox.value?.focus()
    }
    else toast.show(`Nie usunięto: ${errorMessage(e)}`, 'danger')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <Shell title="Media">
    <div class="adm-row" role="search">
      <label class="adm-sr" for="media-q">Szukaj w mediach</label>
      <input id="media-q" v-model="query" class="adm-input" style="max-width: 320px" type="search" placeholder="Szukaj po nazwie lub ALT">
      <div class="adm-row" role="group" aria-label="Widok">
        <Button size="sm" :aria-pressed="view === 'grid'" @click="view = 'grid'">Siatka</Button>
        <Button size="sm" :aria-pressed="view === 'list'" @click="view = 'list'">Lista</Button>
      </div>
      <span class="adm-entitybar__spacer" />
      <template v-if="canUpload">
        <input ref="uploadInput" class="adm-sr" type="file" multiple :accept="ACCEPT" tabindex="-1" aria-hidden="true" @change="onFiles">
        <Button variant="primary" :loading="uploading" @click="uploadInput?.click()">Dodaj pliki</Button>
      </template>
    </div>
    <p class="adm-muted">JPG, PNG, WebP, AVIF albo GIF, do 5 MB. SVG nie jest przyjmowany (bezpieczeństwo).</p>

    <section v-if="uploads.length" class="adm-card adm-stack" aria-labelledby="upl-h">
      <div class="adm-row" style="justify-content: space-between">
        <h2 id="upl-h">Wysyłanie plików <span class="adm-muted">({{ uploadProgress }})</span></h2>
        <Button v-if="!uploading" size="sm" variant="ghost" @click="uploads = []">Wyczyść</Button>
      </div>
      <ul class="adm-uploads" aria-live="polite">
        <li v-for="u in uploads" :key="u.key">
          <span class="adm-uploads__name">{{ u.name }}</span>
          <span class="adm-muted">{{ formatBytes(u.size) }}</span>
          <Badge :tone="u.status === 'done' ? 'success' : u.status === 'error' ? 'danger' : 'neutral'">{{ UPLOAD_LABELS[u.status] }}</Badge>
          <span v-if="u.message" :class="u.status === 'error' ? 'adm-field__error' : 'adm-muted'">{{ u.message }}</span>
        </li>
      </ul>
    </section>

    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <div v-else class="adm-split adm-split--detail">
      <div>
        <p v-if="!filtered.length" class="adm-muted">Brak plików{{ query ? ' dla tego wyszukiwania' : '' }}.</p>
        <ul v-else-if="view === 'grid'" class="adm-media-grid adm-media-grid--page" aria-label="Pliki">
          <li v-for="item in filtered" :key="item.id">
            <button type="button" class="adm-media-item" :aria-pressed="selectedId === item.id" @click="selectedId = item.id">
              <img :src="item.url" :alt="item.alt" loading="lazy">
              <span class="adm-media-item__name">{{ item.filename }}</span>
              <span class="adm-muted">{{ dims(item) }} · {{ formatBytes(item.size) }}</span>
              <span class="adm-muted">{{ formatDate(item.createdAt) }}</span>
              <Badge v-if="!item.alt" tone="warning">Bez ALT</Badge>
            </button>
          </li>
        </ul>
        <div v-else class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th scope="col"><span class="adm-sr">Podgląd</span></th>
                <th scope="col">Plik</th>
                <th scope="col">Wymiary</th>
                <th scope="col">Rozmiar</th>
                <th scope="col">Dodano</th>
                <th scope="col"><span class="adm-sr">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filtered" :key="item.id" :aria-current="selectedId === item.id">
                <td><img class="adm-thumb" :src="item.url" :alt="item.alt" loading="lazy"></td>
                <td>
                  <strong>{{ item.filename }}</strong>
                  <div class="adm-muted">{{ item.alt || 'Bez ALT' }}</div>
                </td>
                <td>{{ dims(item) }}</td>
                <td>{{ formatBytes(item.size) }}</td>
                <td>{{ formatDate(item.createdAt) }}</td>
                <td><Button size="sm" :aria-pressed="selectedId === item.id" @click="selectedId = item.id">Szczegóły<span class="adm-sr"> {{ item.filename }}</span></Button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside v-if="selected" class="adm-card adm-stack adm-detail" aria-labelledby="media-detail-h">
        <div class="adm-row" style="justify-content: space-between">
          <h2 id="media-detail-h">Szczegóły pliku</h2>
          <Button size="sm" variant="ghost" aria-label="Zamknij szczegóły" @click="selectedId = null">✕</Button>
        </div>
        <div class="adm-image__preview adm-detail__preview">
          <img :src="selected.url" :alt="selected.alt">
        </div>
        <dl class="adm-dl">
          <dt>Wymiary</dt><dd>{{ dims(selected) }} px</dd>
          <dt>Rozmiar</dt><dd>{{ formatBytes(selected.size) }} · {{ selected.mime }}</dd>
          <dt>Dodano</dt><dd>{{ formatDate(selected.createdAt) }}</dd>
          <dt>Adres</dt><dd class="adm-break">{{ selected.url.replace(/\?v=\d+$/, '') }}</dd>
        </dl>
        <Button size="sm" @click="copyUrl(selected)">Kopiuj adres</Button>

        <form class="adm-stack" @submit.prevent="saveDetails">
          <Field label="Tekst alternatywny (ALT)" help="Opisz, co widać na obrazie. Pusty ALT tylko dla grafik dekoracyjnych.">
            <template #default="{ id, describedBy }">
              <input :id="id" v-model="alt" class="adm-input" type="text" maxlength="300" :readonly="!canUpload" :aria-describedby="describedBy">
            </template>
          </Field>
          <Field label="Nazwa pliku" help="Małe litery, cyfry, „-” i „.”; rozszerzenie zostaje zgodne z typem pliku.">
            <template #default="{ id, describedBy }">
              <input :id="id" v-model="filename" class="adm-input" type="text" maxlength="200" :readonly="!canUpload" :aria-describedby="describedBy">
            </template>
          </Field>
          <div v-if="canUpload" class="adm-row">
            <Button type="submit" variant="primary" size="sm" :disabled="!dirty" :loading="saving">Zapisz</Button>
            <input ref="replaceInput" class="adm-sr" type="file" :accept="ACCEPT" tabindex="-1" aria-hidden="true" @change="onReplace">
            <Button size="sm" :loading="replacing" @click="replaceInput?.click()">Podmień plik</Button>
          </div>
        </form>

        <section aria-labelledby="media-usage-h" class="adm-stack" style="gap: 6px">
          <h3 id="media-usage-h">Użycia</h3>
          <p v-if="usageError" class="adm-field__error">{{ usageError }}</p>
          <p v-else-if="usages === null" class="adm-muted" role="status">Sprawdzanie…</p>
          <p v-else-if="!usages.length" class="adm-muted">Plik nie jest nigdzie używany.</p>
          <ul v-else class="adm-usages">
            <li v-for="u in usages" :key="`${u.entityId}-${u.path}`">
              <NuxtLink :to="usageLink(u)">{{ u.entityTitle }}</NuxtLink>
              <span class="adm-muted"> · {{ usageWhere(u) }} · {{ u.path.replace(/^(draft|published)\.?/, '') || 'cała treść' }}</span>
            </li>
          </ul>
        </section>

        <div v-if="canDelete">
          <Button variant="danger" size="sm" @click="askDelete">Usuń plik</Button>
        </div>
      </aside>
    </div>

    <Dialog v-model:open="deleteOpen" :title="deleteUsages ? 'Plik jest używany' : 'Usunąć plik?'">
      <div v-if="!deleteUsages" class="adm-stack">
        <p>Plik „{{ selected?.filename }}” zostanie trwale usunięty z biblioteki.</p>
      </div>
      <div v-else class="adm-stack">
        <p class="adm-alert adm-alert--warning" role="alert">Ten plik jest używany w {{ deleteUsages.length }} {{ deleteUsages.length === 1 ? 'miejscu' : 'miejscach' }}. Po usunięciu te miejsca pokażą brakujący obraz.</p>
        <ul class="adm-usages">
          <li v-for="u in deleteUsages" :key="`${u.entityId}-${u.path}`">
            <NuxtLink :to="usageLink(u)">{{ u.entityTitle }}</NuxtLink>
            <span class="adm-muted"> · {{ usageWhere(u) }} · {{ u.path.replace(/^(draft|published)\.?/, '') }}</span>
          </li>
        </ul>
        <label class="adm-check">
          <input ref="forceBox" v-model="forceConfirmed" type="checkbox">
          <span>Rozumiem, usuń mimo użyć</span>
        </label>
      </div>
      <template #footer>
        <Button @click="deleteOpen = false">Anuluj</Button>
        <Button v-if="!deleteUsages" variant="danger" :loading="deleting" @click="doDelete(false)">Usuń</Button>
        <Button v-else variant="danger" :disabled="!forceConfirmed" :loading="deleting" @click="doDelete(true)">Usuń mimo użyć</Button>
      </template>
    </Dialog>
  </Shell>
</template>
