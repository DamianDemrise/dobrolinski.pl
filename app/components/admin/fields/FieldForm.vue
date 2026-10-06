<!--
  Generyczny formularz pól CMS (bloki, globale, komponenty, tokeny…).
  <FieldForm :fields :model-value :mode="'safe'|'advanced'|'developer'" :readonly path-prefix="blk1"
             :lock-reason="(field, path) => null | 'powód'" :tokens :focus-path
             @update:model-value="nowy obiekt" @change="(path, value) => …" />
  - update:modelValue: cały nowy obiekt (setAtPath z rdzenia, niemutujące).
  - change(path, value): najmniejsza zmieniona ścieżka względem modelValue (np. 'topics.2.title').
  - Pola powyżej trybu `mode` i pola z lockReason są tylko do odczytu (z notką), nigdy edytowalne.
  - Walidacja: validateFields z rdzenia, komunikaty przy polach.
  basePath/issues są wewnętrzne (zagnieżdżone listy i grupy).
-->
<script setup lang="ts">
import type { FieldDef, TokensDocument, ValidationIssue } from '@demrise/cms-core'
import { setAtPath, validateFields } from '@demrise/cms-core'
import { computed } from 'vue'
import type { EditMode } from '~/admin/editor/protocol'
import type { FieldContext } from '~/admin/fields'
import { joinPath } from '~/admin/fields'
import FieldInput from './FieldInput.vue'

const props = withDefaults(defineProps<{
  fields: FieldDef[]
  modelValue: Record<string, unknown>
  mode: EditMode
  readonly?: boolean
  pathPrefix?: string
  lockReason?: (field: FieldDef, path: string) => string | null
  tokens?: TokensDocument
  focusPath?: string
  basePath?: string
  issues?: ValidationIssue[]
}>(), { readonly: false, pathPrefix: '', basePath: '', lockReason: undefined, tokens: undefined, focusPath: undefined, issues: undefined })

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'change': [path: string, value: unknown]
}>()

const ctx = computed<FieldContext>(() => ({
  mode: props.mode,
  readonly: props.readonly,
  pathPrefix: props.pathPrefix,
  lockReason: props.lockReason,
  tokens: props.tokens,
  focusPath: props.focusPath,
  issues: props.issues ?? validateFields(props.fields, props.modelValue ?? {}),
}))

function onChange(path: string, value: unknown) {
  emit('change', path, value)
  const relative = props.basePath && path.startsWith(`${props.basePath}.`) ? path.slice(props.basePath.length + 1) : path
  emit('update:modelValue', setAtPath(props.modelValue ?? {}, relative, value))
}
</script>

<template>
  <div class="adm-form">
    <FieldInput
      v-for="field in fields"
      :key="field.key"
      :field="field"
      :value="(modelValue ?? {})[field.key]"
      :path="joinPath(basePath, field.key)"
      :ctx="ctx"
      @change="onChange"
    />
  </div>
</template>
