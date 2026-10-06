<!-- Pole 'list': elementy z własnymi polami (dodaj/usuń/przesuń/zwiń), min/max, nowe _id z rdzenia. -->
<script setup lang="ts">
import type { ListField } from '@demrise/cms-core'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { emptyItem } from '~/admin/editor/defaults'
import type { FieldContext } from '~/admin/fields'
import { joinPath } from '~/admin/fields'
import Button from '~/components/admin/ui/Button.vue'

const FieldForm = defineAsyncComponent(() => import('./FieldForm.vue'))

const props = defineProps<{ field: ListField, value: Record<string, unknown>[], path: string, ctx: FieldContext }>()
const emit = defineEmits<{ change: [path: string, value: unknown] }>()

const open = ref<Set<string>>(new Set())
const keyOf = (item: Record<string, unknown>, i: number) => (typeof item._id === 'string' ? item._id : String(i))
const canAdd = computed(() => !props.ctx.readonly && (props.field.maxItems === undefined || props.value.length < props.field.maxItems))
const canRemove = computed(() => !props.ctx.readonly && (props.field.minItems === undefined || props.value.length > props.field.minItems))
const sortable = computed(() => !props.ctx.readonly && props.field.sortable !== false)

/** Krótki opis elementu: pierwsze niepuste pole tekstowe. */
function summary(item: Record<string, unknown>): string {
  for (const f of props.field.fields) {
    const v = item[f.key]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 60)
    if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim().slice(0, 60)
  }
  return ''
}

function toggle(key: string) {
  const next = new Set(open.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  open.value = next
}

watch(() => props.ctx.focusPath, (focus) => {
  if (!focus?.startsWith(`${props.path}.`)) return
  const index = Number(focus.slice(props.path.length + 1).split('.')[0])
  const item = props.value[index]
  if (item) open.value = new Set([...open.value, keyOf(item, index)])
}, { immediate: true })

function add() {
  const item = emptyItem(props.field.fields)
  open.value = new Set([...open.value, item._id as string])
  emit('change', props.path, [...props.value, item])
}
const remove = (i: number) => emit('change', props.path, props.value.filter((_, j) => j !== i))
function move(i: number, dir: -1 | 1) {
  const next = [...props.value]
  const [item] = next.splice(i, 1)
  next.splice(i + dir, 0, item!)
  emit('change', props.path, next)
}
</script>

<template>
  <div class="adm-list">
    <div v-for="(item, i) in value" :key="keyOf(item, i)" class="adm-list__item">
      <div class="adm-list__head">
        <button
          type="button"
          class="adm-list__toggle"
          :aria-expanded="open.has(keyOf(item, i))"
          @click="toggle(keyOf(item, i))"
        >
          <span aria-hidden="true">{{ open.has(keyOf(item, i)) ? '▾' : '▸' }}</span>
          {{ field.itemLabel }} {{ i + 1 }}<span v-if="summary(item)" class="adm-muted">: {{ summary(item) }}</span>
        </button>
        <template v-if="sortable">
          <Button size="sm" variant="ghost" :disabled="i === 0" :aria-label="`Przesuń: ${field.itemLabel} ${i + 1} w górę`" @click="move(i, -1)">↑</Button>
          <Button size="sm" variant="ghost" :disabled="i === value.length - 1" :aria-label="`Przesuń: ${field.itemLabel} ${i + 1} w dół`" @click="move(i, 1)">↓</Button>
        </template>
        <Button v-if="!ctx.readonly" size="sm" variant="ghost" :disabled="!canRemove" :aria-label="`Usuń: ${field.itemLabel} ${i + 1}`" @click="remove(i)">Usuń</Button>
      </div>
      <div v-if="open.has(keyOf(item, i))" class="adm-list__body">
        <FieldForm
          :fields="field.fields"
          :model-value="item"
          :mode="ctx.mode"
          :readonly="ctx.readonly"
          :path-prefix="ctx.pathPrefix"
          :lock-reason="ctx.lockReason"
          :tokens="ctx.tokens"
          :focus-path="ctx.focusPath"
          :base-path="joinPath(path, i)"
          :issues="ctx.issues"
          @change="(p: string, v: unknown) => emit('change', p, v)"
        />
      </div>
    </div>
    <p v-if="!value.length" class="adm-muted">Brak elementów.</p>
    <div v-if="!ctx.readonly" class="adm-row">
      <Button size="sm" :disabled="!canAdd" @click="add">Dodaj: {{ field.itemLabel }}</Button>
      <span v-if="field.minItems !== undefined || field.maxItems !== undefined" class="adm-muted">
        {{ field.minItems !== undefined ? `min. ${field.minItems}` : '' }}{{ field.minItems !== undefined && field.maxItems !== undefined ? ', ' : '' }}{{ field.maxItems !== undefined ? `maks. ${field.maxItems}` : '' }}
      </span>
    </div>
  </div>
</template>
