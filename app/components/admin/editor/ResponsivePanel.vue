<!--
  RESPONSIVE: widoczność bloku per urządzenie z dziedziczeniem (desktop → tablet → mobile)
  i pola responsywne (wartość per urządzenie). Rdzeń: resolveResponsive / setBlockVisibility / setResponsive.
-->
<script setup lang="ts">
import type { BlockInstance, Device, FieldDef } from '@demrise/cms-core'
import { DEVICES, isResponsive, resolveResponsive, setBlockVisibility, setResponsive } from '@demrise/cms-core'
import { computed } from 'vue'
import type { EditorStore } from '~/admin/editor/store'
import { resolvedProps } from '~/admin/editor/targets'
import Button from '~/components/admin/ui/Button.vue'

const props = defineProps<{ editor: EditorStore, block: BlockInstance, fields: FieldDef[] }>()
const state = props.editor.state
const LABELS: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Telefon' }
const PARENT: Record<Device, Device | null> = { desktop: null, tablet: 'desktop', mobile: 'tablet' }

const readonly = computed(() => !props.editor.canEdit.value)
const visibility = computed(() => props.block.visibility)

/** Skąd pochodzi wartość dla urządzenia: własna albo dziedziczona (z którego). */
function source(device: Device): Device {
  const v = visibility.value
  if (!v || device === 'desktop') return 'desktop'
  if (v[device] !== undefined) return device
  return source(PARENT[device]!)
}

const visible = (device: Device) => resolveResponsive(visibility.value ?? true, device)

function setVisible(device: Device, value: boolean | undefined) {
  props.editor.pageOp(doc => setBlockVisibility(doc, props.block.id, device, value))
}

const responsiveFields = computed(() => props.fields.filter(f => f.responsive && ['text', 'textarea', 'select', 'toggle', 'number', 'tokenColor'].includes(f.type)))
const values = computed(() => resolvedProps(props.block, state.components))

function fieldValue(field: FieldDef, device: Device): unknown {
  return resolveResponsive(values.value[field.key] as never, device)
}
function fieldOwn(field: FieldDef, device: Device): boolean {
  const v = values.value[field.key]
  return device === 'desktop' || (isResponsive(v) && (v as unknown as Record<string, unknown>)[device] !== undefined)
}
function setField(field: FieldDef, device: Device, next: unknown) {
  props.editor.setField({ kind: 'block', blockId: props.block.id }, field.key, setResponsive(values.value[field.key] as never, device, next as never), false)
}
</script>

<template>
  <div class="adm-stack">
    <section aria-labelledby="resp-vis">
      <h3 id="resp-vis">Widoczność bloku</h3>
      <p class="adm-field__help">Tablet dziedziczy z desktopu, telefon z tabletu. Aktywne urządzenie podglądu: {{ LABELS[state.device] }}.</p>
      <div v-for="device in DEVICES" :key="device" class="resp-row">
        <strong>{{ LABELS[device] }}</strong>
        <div class="adm-row">
          <label class="adm-check">
            <input type="checkbox" :checked="visible(device)" :disabled="readonly" @change="setVisible(device, ($event.target as HTMLInputElement).checked)">
            <span>{{ visible(device) ? 'Widoczny' : 'Ukryty' }}</span>
          </label>
          <span v-if="source(device) !== device" class="adm-muted">dziedziczy z {{ LABELS[source(device)].toLowerCase() }}</span>
          <Button v-else-if="device !== 'desktop' && !readonly" size="sm" variant="ghost" @click="setVisible(device, undefined)">Przywróć dziedziczenie</Button>
          <Button size="sm" variant="ghost" :aria-pressed="state.device === device" @click="state.device = device">Podgląd</Button>
        </div>
      </div>
      <p v-if="block.hidden" class="adm-alert adm-alert--warning" style="margin-top: 8px">Blok jest ukryty na wszystkich urządzeniach (Nawigator → Pokaż).</p>
    </section>

    <section v-if="responsiveFields.length" aria-labelledby="resp-fields">
      <h3 id="resp-fields">Pola responsywne</h3>
      <div v-for="field in responsiveFields" :key="field.key" class="adm-stack" style="gap: 4px; margin-top: 8px">
        <strong>{{ field.label }}</strong>
        <div v-for="device in DEVICES" :key="device" class="resp-row">
          <label :for="`resp-${field.key}-${device}`">{{ LABELS[device] }}</label>
          <div class="adm-row">
            <select
              v-if="field.type === 'select'"
              :id="`resp-${field.key}-${device}`"
              class="adm-select"
              :value="fieldValue(field, device)"
              :disabled="readonly"
              @change="setField(field, device, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <input
              v-else-if="field.type === 'toggle'"
              :id="`resp-${field.key}-${device}`"
              type="checkbox"
              :checked="fieldValue(field, device) === true"
              :disabled="readonly"
              @change="setField(field, device, ($event.target as HTMLInputElement).checked)"
            >
            <input
              v-else
              :id="`resp-${field.key}-${device}`"
              class="adm-input"
              :type="field.type === 'number' ? 'number' : 'text'"
              :value="fieldValue(field, device)"
              :readonly="readonly"
              @change="setField(field, device, field.type === 'number' ? Number(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value)"
            >
            <span v-if="!fieldOwn(field, device)" class="adm-muted">dziedziczy</span>
            <Button v-else-if="device !== 'desktop' && !readonly" size="sm" variant="ghost" @click="setField(field, device, undefined)">Przywróć dziedziczenie</Button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
