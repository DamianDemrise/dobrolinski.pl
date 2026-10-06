<!-- Górny pasek edytora: powrót, tytuł i status, urządzenie, tryb, undo/redo, autosave, akcje. -->
<script setup lang="ts">
import type { Device } from '@demrise/cms-core'
import { computed } from 'vue'
import type { EditMode } from '~/admin/editor/protocol'
import { levelAllowed, MODE_LABELS } from '~/admin/editor/protocol'
import type { EditorStore } from '~/admin/editor/store'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'

const props = defineProps<{ editor: EditorStore }>()
const emit = defineEmits<{ publish: [], discard: [], history: [] }>()

const state = props.editor.state
const DEVICES: { id: Device, label: string }[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' },
]
const MODES: EditMode[] = ['safe', 'advanced', 'developer']
const modes = computed(() => MODES.filter(m => levelAllowed(m, props.editor.maxMode.value)))

const SAVE_LABELS = { saved: 'Zapisano', saving: 'Zapisywanie…', dirty: 'Niezapisane zmiany', error: 'Błąd zapisu', conflict: 'Błąd zapisu (konflikt)', offline: 'Offline: ponawiam…' } as const
const save = computed(() => props.editor.saveStatus.value)
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const undoHint = isMac ? '⌘Z' : 'Ctrl+Z'
const redoHint = isMac ? '⇧⌘Z' : 'Ctrl+Y'
</script>

<template>
  <header class="ed-top">
    <NuxtLink to="/admin/pages" class="adm-btn adm-btn--ghost adm-btn--sm">← Strony</NuxtLink>
    <div class="ed-top__title">
      <strong>{{ state.page?.data.title }}</strong>
      <span>/{{ state.page?.slug }}</span>
    </div>
    <Badge :tone="editor.pageDirty.value ? 'warning' : 'success'">{{ editor.pageDirty.value ? (state.page?.published ? 'Zmiany robocze' : 'Nieopublikowana') : 'Opublikowana' }}</Badge>

    <span class="ed-sep" aria-hidden="true" />
    <div class="ed-group" role="group" aria-label="Urządzenie podglądu">
      <Button v-for="d in DEVICES" :key="d.id" size="sm" variant="ghost" :aria-pressed="state.device === d.id" @click="state.device = d.id">{{ d.label }}</Button>
    </div>

    <span class="ed-sep" aria-hidden="true" />
    <label class="adm-sr" for="ed-mode">Tryb edycji</label>
    <select id="ed-mode" class="ed-mode" :value="state.mode" :disabled="modes.length < 2" @change="editor.setMode(($event.target as HTMLSelectElement).value as EditMode)">
      <option v-for="m in modes" :key="m" :value="m">{{ MODE_LABELS[m] }}</option>
    </select>

    <div class="ed-group" role="group" aria-label="Historia zmian">
      <Button size="sm" variant="ghost" :disabled="!state.canUndo" :aria-label="`Cofnij (${undoHint})`" :title="`Cofnij (${undoHint})`" @click="editor.undo()">↶ Cofnij</Button>
      <Button size="sm" variant="ghost" :disabled="!state.canRedo" :aria-label="`Ponów (${redoHint})`" :title="`Ponów (${redoHint})`" @click="editor.redo()">↷ Ponów</Button>
    </div>

    <span class="ed-save" :class="{ 'is-error': save === 'error' || save === 'conflict', 'is-offline': save === 'offline' }" role="status" aria-live="polite">{{ SAVE_LABELS[save] }}</span>

    <a class="adm-btn adm-btn--secondary adm-btn--sm" :href="`/admin/preview/${state.page?.id}`" target="_blank" rel="noopener">Podgląd<span class="adm-sr"> (nowa karta)</span></a>
    <Button size="sm" variant="secondary" @click="emit('history')">Historia</Button>
    <Button v-if="editor.canEdit.value" size="sm" variant="secondary" :disabled="!editor.pageDirty.value || !state.page?.published" @click="emit('discard')">Odrzuć zmiany</Button>
    <Button v-if="editor.session.can('CONTENT_PUBLISH')" size="sm" variant="primary" @click="emit('publish')">Opublikuj</Button>
  </header>
</template>
