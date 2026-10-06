<!--
  Inspektor: zakładki TREŚĆ / WYGLĄD / RESPONSIVE / SEO dla zaznaczenia (blok, pole, global albo strona).
  Edycja przez FieldForm; zmiany idą przez editor.setField (instancje globalne → overrides).
-->
<script setup lang="ts">
import type { FieldDef, GlobalDocument } from '@demrise/cms-core'
import { computed, nextTick, ref, watch } from 'vue'
import type { CanvasTarget } from '~/admin/editor/protocol'
import type { EditorStore } from '~/admin/editor/store'
import { schema } from '~/admin/editor/store'
import { blockDefinition, resolvedProps } from '~/admin/editor/targets'
import FieldForm from '~/components/admin/fields/FieldForm.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import ResponsivePanel from './ResponsivePanel.vue'
import SeoPanel from './SeoPanel.vue'

type Tab = 'content' | 'appearance' | 'responsive' | 'seo'
const TABS: { id: Tab, label: string }[] = [
  { id: 'content', label: 'TREŚĆ' },
  { id: 'appearance', label: 'WYGLĄD' },
  { id: 'responsive', label: 'RESPONSIVE' },
  { id: 'seo', label: 'SEO' },
]

const props = defineProps<{ editor: EditorStore, initialTab?: string }>()
const state = props.editor.state
const session = props.editor.session
/** ?tab=seo w adresie edytora (np. z /admin/seo) otwiera od razu zakładkę SEO. */
const tab = ref<Tab>(TABS.some(t => t.id === props.initialTab) ? props.initialTab as Tab : 'content')
const body = ref<HTMLElement | null>(null)

const selection = computed(() => state.selection)
const block = computed(() => (selection.value?.kind === 'block' ? state.page!.data.blocks.find(b => b.id === (selection.value as { blockId: string }).blockId) : undefined))
const blockInfo = computed(() => (block.value ? blockDefinition(block.value, state.components, schema) : null))
const globalKey = computed(() => (selection.value?.kind === 'global' ? selection.value.global : null))
const globalEntity = computed(() => (globalKey.value ? state.globals[globalKey.value] : undefined))

const fieldsFor = (fields: FieldDef[], t: Tab) => fields.filter(f => (t === 'content' ? !f.tab || f.tab === 'content' : f.tab === t))

const formFields = computed<FieldDef[]>(() => {
  if (globalKey.value) return fieldsFor(schema.globals[globalKey.value]?.fields ?? [], tab.value)
  return blockInfo.value?.def ? fieldsFor(blockInfo.value.def.fields, tab.value) : []
})

const formValue = computed<Record<string, unknown>>(() => {
  if (globalEntity.value) return globalEntity.value.data as GlobalDocument
  return block.value ? resolvedProps(block.value, state.components) : {}
})

const focusPath = computed(() => (selection.value && 'field' in selection.value ? selection.value.field : undefined))
const readonly = computed(() => !props.editor.canEdit.value)

/** Instancja komponentu globalnego: edytowalne tylko pola z `exposed`. Pola SEO: SEO_EDIT. */
const lockReason = (field: FieldDef, path: string): string | null => {
  if (field.tab === 'seo' && !session.can('SEO_EDIT')) return 'Wymaga uprawnienia SEO'
  const component = blockInfo.value?.component
  if (component && !globalKey.value && !component.exposed.includes(path.split('.')[0] ?? '')) return 'Pole definicji komponentu globalnego'
  return null
}

function onChange(path: string, value: unknown) {
  const sel = selection.value
  if (!sel) return
  const target: CanvasTarget = sel.kind === 'global' ? { kind: 'global', global: sel.global, field: '' } : { kind: 'block', blockId: sel.blockId }
  props.editor.setField(target, path, value)
}

/** Po wybraniu pola na canvasie: zakładka TREŚĆ, przewinięcie i podświetlenie pola. */
watch(() => [selection.value, focusPath.value] as const, async () => {
  const path = focusPath.value
  if (!path) return
  tab.value = 'content'
  for (let attempt = 0; attempt < 8; attempt++) {
    await nextTick()
    await new Promise(r => requestAnimationFrame(r))
    const segs = path.split('.')
    for (let n = segs.length; n > 0; n--) {
      const el = body.value?.querySelector<HTMLElement>(`[data-field-path="${CSS.escape(segs.slice(0, n).join('.'))}"]`)
      if (!el) continue
      if (n < segs.length && attempt < 7) break // lista może się jeszcze rozwijać
      el.scrollIntoView({ block: 'nearest' })
      el.classList.remove('ins-flash')
      void el.offsetWidth
      el.classList.add('ins-flash')
      return
    }
  }
})

const emptyMessage = computed(() => {
  if (tab.value === 'appearance') return 'Ten element nie ma ustawień wyglądu. Wygląd wynika z projektu strony i tokenów (Design).'
  if (tab.value === 'seo') return 'Ten element nie ma pól SEO.'
  return 'Ten element nie ma pól do edycji.'
})
</script>

<template>
  <div>
    <div class="ins-tabs" role="tablist" aria-label="Inspektor">
      <button
        v-for="t in TABS"
        :id="`ins-tab-${t.id}`"
        :key="t.id"
        type="button"
        role="tab"
        class="ins-tab"
        :aria-selected="tab === t.id"
        aria-controls="ins-panel"
        @click="tab = t.id"
      >{{ t.label }}</button>
    </div>
    <div id="ins-panel" ref="body" class="ed-panel__body" role="tabpanel" :aria-labelledby="`ins-tab-${tab}`">
      <template v-if="!selection">
        <SeoPanel v-if="tab === 'seo'" :editor="editor" />
        <div v-else class="adm-stack">
          <h2>{{ state.page!.data.title }}</h2>
          <p class="adm-muted">Kliknij element na podglądzie albo blok w nawigatorze, żeby go edytować. Ustawienia SEO strony są w zakładce SEO.</p>
        </div>
      </template>

      <template v-else>
        <div class="adm-stack" style="gap: 6px">
          <h2 v-if="globalKey">{{ schema.globals[globalKey]?.label ?? globalKey }}</h2>
          <h2 v-else-if="blockInfo?.def">{{ blockInfo.component ? blockInfo.component.name : blockInfo.def.label }}</h2>
          <div class="adm-row">
            <Badge v-if="globalKey" tone="warning">Treść globalna: zmiana widoczna na wszystkich stronach</Badge>
            <Badge v-if="blockInfo?.component" tone="warning">Komponent globalny: {{ blockInfo.component.name }}</Badge>
            <Badge v-if="block?.hidden" tone="neutral">Ukryty</Badge>
          </div>
          <p v-if="blockInfo?.component" class="adm-field__help">
            Tutaj zmieniasz tylko pola udostępnione dla tej strony ({{ blockInfo.component.exposed.join(', ') || 'brak' }}).
            <NuxtLink v-if="session.can('COMPONENT_EDIT')" to="/admin/components">Edytuj definicję</NuxtLink>
          </p>
        </div>

        <ResponsivePanel v-if="tab === 'responsive' && block" :editor="editor" :block="block" :fields="blockInfo?.def?.fields ?? []" />
        <SeoPanel v-if="tab === 'seo' && !formFields.length" :editor="editor" />
        <p v-if="!block && tab === 'responsive'" class="adm-muted">Widoczność per urządzenie dotyczy bloków.</p>

        <FieldForm
          v-if="tab !== 'responsive' && formFields.length"
          :key="`${globalKey ?? block?.id}-${tab}`"
          :fields="formFields"
          :model-value="formValue"
          :mode="state.mode"
          :readonly="readonly"
          :path-prefix="`ins-${globalKey ?? block?.id ?? 'x'}`"
          :lock-reason="lockReason"
          :tokens="state.tokens ?? undefined"
          :focus-path="focusPath"
          @change="onChange"
        />
        <p v-else-if="tab === 'content' || tab === 'appearance'" class="adm-muted">{{ emptyMessage }}</p>
      </template>
    </div>
  </div>
</template>
