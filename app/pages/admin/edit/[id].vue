<!--
  Edytor wizualny strony: pasek, Nawigator (lewo), Canvas (iframe, środek), Inspektor (prawo).
  Stan i autosave: app/admin/editor/store.ts. Skróty: ⌘Z/Ctrl+Z cofnij, ⇧⌘Z/Ctrl+Y ponów.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { ImageValue } from '@demrise/cms-core'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import '~/admin/admin.css'
import '~/admin/editor/editor.css'
import type { CanvasTarget } from '~/admin/editor/protocol'
import { createEditorStore } from '~/admin/editor/store'
import { errorMessage } from '~/admin/format'
import { useAdminToast } from '~/admin/toast'
import Canvas from '~/components/admin/editor/Canvas.vue'
import ConflictDialog from '~/components/admin/editor/ConflictDialog.vue'
import Inspector from '~/components/admin/editor/Inspector.vue'
import Navigator from '~/components/admin/editor/Navigator.vue'
import PublishDialog from '~/components/admin/editor/PublishDialog.vue'
import RevisionsDrawer from '~/components/admin/editor/RevisionsDrawer.vue'
import TopBar from '~/components/admin/editor/TopBar.vue'
import MediaPicker from '~/components/admin/fields/MediaPicker.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'
import Toasts from '~/components/admin/ui/Toasts.vue'

definePageMeta({ middleware: [adminAuth] })

const route = useRoute()
const editor = createEditorStore(String(route.params.id))
const state = editor.state
const toast = useAdminToast()
useHead(() => ({ title: `${state.page?.data.title ?? 'Edytor'} · DEMRISE CMS`, meta: [{ name: 'robots', content: 'noindex' }] }))

const canvas = ref<InstanceType<typeof Canvas> | null>(null)
const publishOpen = ref(false)
const historyOpen = ref(false)
const discardOpen = ref(false)
const discarding = ref(false)
const imageTarget = ref<CanvasTarget | null>(null)
const imageOpen = ref(false)

function select(target: CanvasTarget, scroll = false) {
  state.selection = target
  if (scroll) canvas.value?.scrollTo(target)
}

function onInput(target: CanvasTarget, value: string, commit: boolean) {
  if (!('field' in target) || !target.field) return
  const base: CanvasTarget = target.kind === 'global' ? { kind: 'global', global: target.global, field: '' } : { kind: 'block', blockId: target.blockId }
  editor.setField(base, target.field, value)
  if (commit) editor.breakCoalescing()
}

function onPickImage(target: CanvasTarget) {
  imageTarget.value = target
  imageOpen.value = true
}
function onImage(image: ImageValue) {
  const target = imageTarget.value
  if (!target || !('field' in target) || !target.field) return
  const base: CanvasTarget = target.kind === 'global' ? { kind: 'global', global: target.global, field: '' } : { kind: 'block', blockId: target.blockId }
  editor.setField(base, target.field, image, false)
}

async function discard() {
  discarding.value = true
  try {
    await editor.discardPage()
    toast.show('Zmiany odrzucone: wersja robocza = wersja opublikowana', 'success')
    discardOpen.value = false
  }
  catch (error) {
    toast.show(`Nie odrzucono zmian: ${errorMessage(error)}`, 'danger')
  }
  finally {
    discarding.value = false
  }
}

function isTextInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
    || (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(el.type))
}

function onKeydown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || isTextInput(event.target)) return
  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    editor.undo()
  }
  else if ((key === 'z' && event.shiftKey) || key === 'y') {
    event.preventDefault()
    editor.redo()
  }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!editor.hasUnsaved()) return
  event.preventDefault()
  event.returnValue = ''
}
const onOnline = () => editor.retryOffline()

onMounted(() => {
  void editor.load()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('online', onOnline)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('online', onOnline)
  editor.dispose()
})

onBeforeRouteLeave(() => {
  if (editor.hasUnsaved() && !window.confirm('Są niezapisane zmiany. Opuścić edytor?')) return false
})
</script>

<template>
  <div class="adm adm-root">
    <div v-if="state.loading" class="adm-content" role="status">Wczytywanie edytora…</div>
    <div v-else-if="state.loadError || !state.page" class="adm-content">
      <p class="adm-alert adm-alert--danger" role="alert">Nie udało się wczytać strony: {{ state.loadError || 'brak danych' }}</p>
      <div class="adm-row">
        <Button @click="editor.load()">Spróbuj ponownie</Button>
        <NuxtLink to="/admin/pages">Wróć do listy stron</NuxtLink>
      </div>
    </div>
    <div v-else class="ed">
      <TopBar :editor="editor" @publish="publishOpen = true" @discard="discardOpen = true" @history="historyOpen = true" />
      <div v-if="state.backups.length" class="ed-banner" role="alert">
        <span>Znaleziono niezapisane zmiany z poprzedniej sesji w tej karcie.</span>
        <template v-for="b in state.backups" :key="b.id">
          <Button size="sm" variant="primary" @click="editor.applyBackup(b.id, true)">Przywróć ({{ b.id }})</Button>
          <Button size="sm" @click="editor.applyBackup(b.id, false)">Odrzuć</Button>
        </template>
      </div>
      <div v-else-if="!editor.canEdit.value" class="ed-banner" role="status">Tryb podglądu: brak uprawnień do edycji treści.</div>
      <div v-else />
      <div class="ed-body">
        <nav class="ed-panel ed-panel--left" aria-label="Nawigator strony">
          <div class="ed-panel__head">
            <h2>Nawigator</h2>
            <label class="adm-check" style="font-size: 12px">
              <input v-model="state.showHidden" type="checkbox">
              <span>Pokaż ukryte</span>
            </label>
          </div>
          <Navigator :editor="editor" @select="select($event, true)" />
        </nav>
        <Canvas
          ref="canvas"
          :editor="editor"
          @select="select($event)"
          @input="onInput"
          @pick-image="onPickImage"
          @shortcut="$event === 'redo' ? editor.redo() : editor.undo()"
        />
        <aside class="ed-panel ed-panel--right" aria-label="Inspektor">
          <Inspector :editor="editor" :initial-tab="typeof route.query.tab === 'string' ? route.query.tab : undefined" />
        </aside>
      </div>
    </div>

    <template v-if="state.page">
      <ConflictDialog :editor="editor" />
      <PublishDialog v-model:open="publishOpen" :editor="editor" />
      <RevisionsDrawer
        v-if="historyOpen"
        v-model:open="historyOpen"
        :entity-id="state.page.id"
        :current="state.page.data"
        :can-restore="editor.canEdit.value"
        :restore="(revisionId: string) => editor.restoreRevision(revisionId, state.page!.id)"
      />
      <MediaPicker v-model:open="imageOpen" @select="onImage" />
      <Dialog v-model:open="discardOpen" title="Odrzucić zmiany?">
        <p>Wersja robocza strony wróci do wersji opublikowanej. Punkty autozapisu zostają w Historii wersji.</p>
        <template #footer>
          <Button @click="discardOpen = false">Anuluj</Button>
          <Button variant="danger" :loading="discarding" @click="discard">Odrzuć zmiany</Button>
        </template>
      </Dialog>
    </template>
    <Toasts />
  </div>
</template>
