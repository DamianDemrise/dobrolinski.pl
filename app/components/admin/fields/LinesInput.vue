<!-- Pole 'lines': lista linii tekstu (dodaj, usuń, przesuń). -->
<script setup lang="ts">
import Button from '~/components/admin/ui/Button.vue'

const props = defineProps<{ id: string, label: string, value: string[], disabled: boolean, maxItems?: number, describedBy?: string }>()
const emit = defineEmits<{ update: [value: string[]] }>()

const setLine = (i: number, text: string) => emit('update', props.value.map((l, j) => (j === i ? text : l)))
const remove = (i: number) => emit('update', props.value.filter((_, j) => j !== i))
const add = () => emit('update', [...props.value, ''])
function move(i: number, dir: -1 | 1) {
  const next = [...props.value]
  const [line] = next.splice(i, 1)
  next.splice(i + dir, 0, line!)
  emit('update', next)
}
</script>

<template>
  <div class="adm-lines" role="group" :aria-describedby="describedBy">
    <div v-for="(line, i) in value" :key="i" class="adm-lines__row">
      <input
        :id="i === 0 ? id : `${id}-${i}`"
        class="adm-input"
        type="text"
        :value="line"
        :readonly="disabled"
        :aria-label="`${label}: linia ${i + 1}`"
        @input="setLine(i, ($event.target as HTMLInputElement).value)"
      >
      <template v-if="!disabled">
        <Button size="sm" variant="ghost" :disabled="i === 0" :aria-label="`Przesuń linię ${i + 1} w górę`" @click="move(i, -1)">↑</Button>
        <Button size="sm" variant="ghost" :disabled="i === value.length - 1" :aria-label="`Przesuń linię ${i + 1} w dół`" @click="move(i, 1)">↓</Button>
        <Button size="sm" variant="ghost" :aria-label="`Usuń linię ${i + 1}`" @click="remove(i)">Usuń</Button>
      </template>
    </div>
    <p v-if="!value.length" class="adm-muted">Brak linii.</p>
    <Button v-if="!disabled" size="sm" :disabled="maxItems !== undefined && value.length >= maxItems" @click="add">Dodaj linię</Button>
  </div>
</template>
