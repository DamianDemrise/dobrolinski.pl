<!--
  Wybór obrazu z biblioteki mediów (GET /api/media) z wyszukiwaniem i uploadem (MEDIA_UPLOAD).
  <MediaPicker v-model:open="open" :current-alt @select="(img: ImageValue) => …" />
  Zwraca ImageValue { mediaId, src: item.url, alt, width, height }.
-->
<script setup lang="ts">
import type { ImageValue, MediaItem, MediaListResponse } from '@demrise/cms-core'
import { computed, ref, watch } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage, formatBytes } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import { useAdminToast } from '~/admin/toast'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

const props = defineProps<{ currentAlt?: string }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ select: [value: ImageValue] }>()

const session = useCmsSession()
const toast = useAdminToast()
const items = ref<MediaItem[]>([])
const loading = ref(false)
const error = ref('')
const query = ref('')
const selected = ref<MediaItem | null>(null)
const alt = ref('')
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? items.value.filter(i => i.filename.toLowerCase().includes(q) || i.alt.toLowerCase().includes(q)) : items.value
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = (await cmsApi.get<MediaListResponse>('/api/media')).items
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (!value) return
  selected.value = null
  alt.value = props.currentAlt ?? ''
  void load()
}, { immediate: true })

function choose(item: MediaItem) {
  selected.value = item
  alt.value = item.alt || props.currentAlt || ''
}

async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  if (alt.value.trim()) form.append('alt', alt.value.trim())
  uploading.value = true
  try {
    const item = await cmsApi.upload<MediaItem>('/api/media', form)
    items.value = [item, ...items.value]
    choose(item)
    toast.show('Plik dodany do biblioteki', 'success')
  }
  catch (e) {
    toast.show(`Nie udało się dodać pliku: ${errorMessage(e)}`, 'danger')
  }
  finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function confirm() {
  const item = selected.value
  if (!item) return
  const value: ImageValue = { mediaId: item.id, src: item.url, alt: alt.value.trim() }
  if (item.width) value.width = item.width
  if (item.height) value.height = item.height
  emit('select', value)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open" title="Biblioteka mediów" wide>
    <div class="adm-stack">
      <div class="adm-row">
        <label class="adm-sr" for="media-search">Szukaj</label>
        <input id="media-search" v-model="query" class="adm-input" style="max-width: 320px" type="search" placeholder="Szukaj po nazwie lub ALT">
        <template v-if="session.can('MEDIA_UPLOAD')">
          <input ref="fileInput" class="adm-sr" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" tabindex="-1" aria-hidden="true" @change="upload">
          <Button :loading="uploading" @click="fileInput?.click()">Dodaj plik</Button>
        </template>
      </div>
      <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
      <p v-else-if="!filtered.length" class="adm-muted">Brak plików{{ query ? ' dla tego wyszukiwania' : '' }}.</p>
      <ul v-else class="adm-media-grid" aria-label="Pliki">
        <li v-for="item in filtered" :key="item.id">
          <button
            type="button"
            class="adm-media-item"
            :aria-pressed="selected?.id === item.id"
            @click="choose(item)"
            @dblclick="choose(item); confirm()"
          >
            <img :src="item.url" :alt="item.alt" loading="lazy">
            <span class="adm-media-item__name">{{ item.filename }}</span>
            <span class="adm-muted">{{ item.width && item.height ? `${item.width}×${item.height}` : '?' }} · {{ formatBytes(item.size) }}</span>
          </button>
        </li>
      </ul>
      <div class="adm-field">
        <label class="adm-field__label" for="media-alt">Tekst alternatywny (ALT)</label>
        <input id="media-alt" v-model="alt" class="adm-input" type="text" maxlength="300">
        <p class="adm-field__help">Opisz, co widać na obrazie. Pusty ALT tylko dla grafik dekoracyjnych.</p>
      </div>
    </div>
    <template #footer>
      <Button @click="open = false">Anuluj</Button>
      <Button variant="primary" :disabled="!selected" @click="confirm">Wybierz</Button>
    </template>
  </Dialog>
</template>
