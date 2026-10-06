<!--
  Publikacja strony (CONTENT_PUBLISH): zapis zaległych zmian, opcjonalnie publikacja zmienionych
  treści globalnych, potem strona. Wynik z informacją o przebudowie strony publicznej.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PUBLISHED_MESSAGE } from '~/admin/deploy'
import type { EditorStore } from '~/admin/editor/store'
import { schema } from '~/admin/editor/store'
import { errorMessage } from '~/admin/format'
import { useAdminToast } from '~/admin/toast'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

const props = defineProps<{ editor: EditorStore }>()
const open = defineModel<boolean>('open', { required: true })
const toast = useAdminToast()

const globals = computed(() => props.editor.dirtyGlobals.value)
const selected = ref<Set<string>>(new Set())
const busy = ref(false)
const steps = ref<{ label: string, ok: boolean, message: string }[]>([])
const published = ref(false)

watch(open, (value) => {
  if (!value) return
  selected.value = new Set(globals.value.map(g => g.id))
  steps.value = []
  published.value = false
})

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}


async function publish() {
  busy.value = true
  steps.value = []
  published.value = false
  const queue = [
    ...globals.value.filter(g => selected.value.has(g.id)).map(g => ({ id: g.id, label: schema.globals[g.slug]?.label ?? g.slug })),
    { id: props.editor.state.page!.id, label: `Strona: ${props.editor.state.page!.data.title}` },
  ]
  try {
    for (const item of queue) {
      try {
        await props.editor.publishEntity(item.id)
        steps.value.push({ label: item.label, ok: true, message: 'opublikowano' })
      }
      catch (error) {
        steps.value.push({ label: item.label, ok: false, message: errorMessage(error) })
        toast.show(`Publikacja przerwana: ${errorMessage(error)}`, 'danger')
        return
      }
    }
    published.value = true
    toast.show('Opublikowano', 'success')
  }
  finally {
    busy.value = false
  }
}

const done = computed(() => steps.value.length > 0 && steps.value.every(s => s.ok) && published.value)
</script>

<template>
  <Dialog v-model:open="open" title="Opublikować zmiany?">
    <div class="adm-stack">
      <p>Wersja robocza strony „{{ editor.state.page?.data.title }}” stanie się wersją publiczną.</p>
      <fieldset v-if="globals.length && !done" class="adm-fieldset">
        <legend class="adm-field__label">Zmienione treści globalne (widoczne na wszystkich stronach)</legend>
        <label v-for="g in globals" :key="g.id" class="adm-check" style="display: flex">
          <input type="checkbox" :checked="selected.has(g.id)" :disabled="busy" @change="toggle(g.id)">
          <span>Opublikuj też: {{ schema.globals[g.slug]?.label ?? g.slug }}</span>
        </label>
      </fieldset>
      <ul v-if="steps.length" style="margin: 0; padding-left: 18px" aria-live="polite">
        <li v-for="s in steps" :key="s.label" :style="{ color: s.ok ? 'var(--adm-success)' : 'var(--adm-danger)' }">{{ s.label }}: {{ s.message }}</li>
      </ul>
      <p v-if="published" class="adm-alert adm-alert--neutral" role="status">{{ PUBLISHED_MESSAGE }}</p>
    </div>
    <template #footer>
      <Button @click="open = false">{{ done ? 'Zamknij' : 'Anuluj' }}</Button>
      <Button v-if="!done" variant="primary" :loading="busy" @click="publish">Opublikuj</Button>
    </template>
  </Dialog>
</template>
