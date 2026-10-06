<!--
  Pasek wersji roboczej encji (treść globalna, komponent, wzorzec, tokeny): status, autozapis,
  Opublikuj (CONTENT_PUBLISH + uprawnienie rodzaju), Odrzuć zmiany, Historia wersji,
  dialog konfliktu (409) i wynik przebudowy strony.
  <EntityBar :draft :can-edit :can-publish publish-note="…" @published="…" />
-->
<script setup lang="ts">
import type { RebuildStatus } from '@demrise/cms-core'
import { computed, ref } from 'vue'
import type { EntityDraft } from '~/admin/entity-draft'
import { errorMessage, formatDate, STATUS_LABELS } from '~/admin/format'
import { useAdminToast } from '~/admin/toast'
import RevisionsDrawer from '~/components/admin/editor/RevisionsDrawer.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

const props = withDefaults(defineProps<{
  draft: EntityDraft<unknown>
  canEdit: boolean
  canPublish: boolean
  /** Dodatkowa informacja w dialogu publikacji (np. co zmieni się na stronie). */
  publishNote?: string
  /** Powód blokady publikacji (np. błędy formularza). */
  publishBlocked?: string | null
  /** Nazwa w dialogach (domyślnie tytuł encji z API). */
  label?: string
}>(), { publishNote: '', publishBlocked: null, label: '' })
const emit = defineEmits<{ published: [rebuild: RebuildStatus] }>()

const toast = useAdminToast()
const state = props.draft.state
const SAVE_LABELS = { saved: 'Zapisano', saving: 'Zapisywanie…', dirty: 'Niezapisane zmiany', error: 'Błąd zapisu', conflict: 'Błąd zapisu (konflikt)', offline: 'Offline: ponawiam…' } as const
const REBUILD: Record<RebuildStatus, string> = {
  triggered: 'Strona przebuduje się w ciągu ~1–2 min.',
  manual: 'Automatyczna przebudowa nie jest skonfigurowana: uruchom ją w Ustawieniach albo w GitHub Actions (Run workflow).',
  failed: 'Nie udało się uruchomić przebudowy. Uruchom ją w Ustawieniach albo w GitHub Actions.',
}

const status = computed(() => STATUS_LABELS[props.draft.status.value])
const publishOpen = ref(false)
const discardOpen = ref(false)
const historyOpen = ref(false)
const busy = ref(false)
const rebuild = ref<RebuildStatus | null>(null)
const conflictOpen = computed({ get: () => state.conflict !== null, set: () => {} })

function openPublish() {
  rebuild.value = null
  publishOpen.value = true
}

async function publish() {
  busy.value = true
  try {
    const result = await props.draft.publish()
    rebuild.value = result.rebuild
    toast.show('Opublikowano', 'success')
    emit('published', result.rebuild)
  }
  catch (error) {
    toast.show(`Nie opublikowano: ${errorMessage(error)}`, 'danger')
  }
  finally {
    busy.value = false
  }
}

async function discard() {
  busy.value = true
  try {
    await props.draft.discard()
    toast.show('Zmiany odrzucone: wersja robocza = wersja opublikowana', 'success')
    discardOpen.value = false
  }
  catch (error) {
    toast.show(`Nie odrzucono zmian: ${errorMessage(error)}`, 'danger')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="adm-entitybar">
    <Badge :tone="status.tone">{{ status.label }}</Badge>
    <span class="adm-muted" role="status" aria-live="polite">
      {{ SAVE_LABELS[state.save] }}<template v-if="state.save === 'saved'"> · {{ formatDate(state.updatedAt) }}</template>
    </span>
    <span class="adm-entitybar__spacer" />
    <Button v-if="state.save === 'offline'" size="sm" @click="draft.retry()">Ponów zapis</Button>
    <Button size="sm" @click="historyOpen = true">Historia wersji</Button>
    <Button v-if="canEdit && state.published !== null && draft.status.value === 'changed'" size="sm" @click="discardOpen = true">Odrzuć zmiany</Button>
    <Button
      v-if="canPublish"
      size="sm"
      variant="primary"
      :disabled="!!publishBlocked || draft.status.value === 'published'"
      :title="publishBlocked ?? (draft.status.value === 'published' ? 'Brak zmian do publikacji' : undefined)"
      @click="openPublish"
    >Opublikuj</Button>

    <Dialog v-model:open="publishOpen" title="Opublikować zmiany?">
      <div class="adm-stack">
        <p>Wersja robocza „{{ label || state.title }}” stanie się wersją publiczną.</p>
        <p v-if="publishNote" class="adm-muted">{{ publishNote }}</p>
        <p v-if="rebuild" class="adm-alert" :class="rebuild === 'triggered' ? 'adm-alert--neutral' : 'adm-alert--warning'" role="status">{{ REBUILD[rebuild] }}</p>
      </div>
      <template #footer>
        <Button @click="publishOpen = false">{{ rebuild ? 'Zamknij' : 'Anuluj' }}</Button>
        <Button v-if="!rebuild" variant="primary" :loading="busy" @click="publish">Opublikuj</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="discardOpen" title="Odrzucić zmiany?">
      <p>Wersja robocza wróci do wersji opublikowanej. Punkty autozapisu zostają w Historii wersji.</p>
      <template #footer>
        <Button @click="discardOpen = false">Anuluj</Button>
        <Button variant="danger" :loading="busy" @click="discard">Odrzuć zmiany</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="conflictOpen" title="Konflikt wersji" :closable="false">
      <div class="adm-stack">
        <p>
          Ktoś inny (albo inna karta) zapisał nowszą wersję „{{ label || state.conflict?.title }}”
          {{ state.conflict ? formatDate(state.conflict.updatedAt) : '' }}. Twoje ostatnie zmiany nie zostały zapisane.
        </p>
        <p class="adm-muted">„Wczytaj aktualną wersję” porzuca Twoje niezapisane zmiany. „Nadpisz moją wersją” zastępuje zmiany drugiej osoby.</p>
      </div>
      <template #footer>
        <Button @click="draft.resolveConflict('reload')">Wczytaj aktualną wersję</Button>
        <Button variant="danger" @click="draft.resolveConflict('overwrite')">Nadpisz moją wersją</Button>
      </template>
    </Dialog>

    <RevisionsDrawer
      v-if="historyOpen"
      v-model:open="historyOpen"
      :entity-id="state.id"
      :current="state.data"
      :can-restore="canEdit"
      :restore="draft.restore"
    />
  </div>
</template>
