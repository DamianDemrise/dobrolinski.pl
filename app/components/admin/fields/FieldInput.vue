<!-- Jedno pole formularza CMS wg typu (używa FieldForm; API wewnętrzne). -->
<script setup lang="ts">
import type { FieldDef, ImageValue, LinkValue } from '@demrise/cms-core'
import { isResponsive } from '@demrise/cms-core'
import { computed, defineAsyncComponent } from 'vue'
import type { FieldContext } from '~/admin/fields'
import { fieldDomId, issuesAt, joinPath, lockFor } from '~/admin/fields'
import ImageInput from './ImageInput.vue'
import LinesInput from './LinesInput.vue'
import LinkInput from './LinkInput.vue'
import TokenColorInput from './TokenColorInput.vue'

const ListInput = defineAsyncComponent(() => import('./ListInput.vue'))
const FieldForm = defineAsyncComponent(() => import('./FieldForm.vue'))

const props = defineProps<{ field: FieldDef, value: unknown, path: string, ctx: FieldContext }>()
const emit = defineEmits<{ change: [path: string, value: unknown] }>()

/** Pole responsywne: w tej zakładce edytujemy wartość desktop. */
const responsive = computed(() => props.field.responsive === true && isResponsive(props.value))
const valuePath = computed(() => (responsive.value ? joinPath(props.path, 'desktop') : props.path))
const current = computed(() => (responsive.value ? (props.value as { desktop: unknown }).desktop : props.value))

const lock = computed(() => lockFor(props.ctx, props.field, props.path))
const disabled = computed(() => props.ctx.readonly || lock.value !== null)
const id = computed(() => fieldDomId(props.ctx, props.path))
const errors = computed(() => issuesAt(props.ctx, valuePath.value, ['link', 'image', 'lines'].includes(props.field.type)))
const describedBy = computed(() => [props.field.help ? `${id.value}-help` : '', errors.value.length ? `${id.value}-err` : '', lock.value ? `${id.value}-lock` : ''].filter(Boolean).join(' ') || undefined)
const maxLength = computed(() => ('maxLength' in props.field ? props.field.maxLength : undefined))
const text = computed(() => (typeof current.value === 'string' ? current.value : ''))

const set = (value: unknown) => emit('change', valuePath.value, value)
const onNumber = (raw: string) => {
  const n = Number(raw)
  set(raw === '' ? undefined : Number.isFinite(n) ? n : raw)
}
const isContainer = computed(() => props.field.type === 'list' || props.field.type === 'group')
</script>

<template>
  <div class="adm-field" :data-field-path="path">
    <fieldset v-if="isContainer" class="adm-fieldset">
      <legend class="adm-field__label">
        {{ field.label }}
        <span v-if="lock" :id="`${id}-lock`" class="adm-field__lock">Zablokowane: {{ lock }}</span>
      </legend>
      <p v-if="field.help" :id="`${id}-help`" class="adm-field__help">{{ field.help }}</p>
      <ListInput
        v-if="field.type === 'list'"
        :field="field"
        :value="Array.isArray(current) ? current : []"
        :path="valuePath"
        :ctx="disabled ? { ...ctx, readonly: true } : ctx"
        @change="(p: string, v: unknown) => emit('change', p, v)"
      />
      <FieldForm
        v-else-if="field.type === 'group'"
        :fields="field.fields"
        :model-value="(current as Record<string, unknown>) ?? {}"
        :mode="ctx.mode"
        :readonly="disabled"
        :path-prefix="ctx.pathPrefix"
        :lock-reason="ctx.lockReason"
        :tokens="ctx.tokens"
        :focus-path="ctx.focusPath"
        :base-path="valuePath"
        :issues="ctx.issues"
        @change="(p: string, v: unknown) => emit('change', p, v)"
      />
      <p v-if="errors.length" class="adm-field__error" role="alert">{{ errors.join('; ') }}</p>
    </fieldset>

    <template v-else>
      <label class="adm-field__label" :for="field.type === 'toggle' ? undefined : id">
        <span>{{ field.label }}<span v-if="field.required" aria-hidden="true"> *</span></span>
        <span
          v-if="maxLength !== undefined && (field.type === 'text' || field.type === 'textarea')"
          class="adm-field__count"
          :class="{ 'is-over': text.length > maxLength }"
        >{{ text.length }}/{{ maxLength }}</span>
      </label>

      <input
        v-if="field.type === 'text'"
        :id="id"
        class="adm-input"
        type="text"
        :value="text"
        :readonly="disabled"
        :required="field.required"
        :aria-describedby="describedBy"
        :aria-invalid="errors.length ? 'true' : undefined"
        @input="set(($event.target as HTMLInputElement).value)"
      >
      <textarea
        v-else-if="field.type === 'textarea'"
        :id="id"
        class="adm-textarea"
        :value="text"
        :readonly="disabled"
        rows="3"
        :aria-describedby="describedBy"
        :aria-invalid="errors.length ? 'true' : undefined"
        @input="set(($event.target as HTMLTextAreaElement).value)"
      />
      <LinesInput
        v-else-if="field.type === 'lines'"
        :id="id"
        :label="field.label"
        :value="Array.isArray(current) ? (current as string[]) : []"
        :disabled="disabled"
        :max-items="field.maxItems"
        :described-by="describedBy"
        @update="set"
      />
      <LinkInput
        v-else-if="field.type === 'link'"
        :id="id"
        :value="(current as LinkValue | undefined)"
        :disabled="disabled"
        :described-by="describedBy"
        @update="set"
      />
      <ImageInput
        v-else-if="field.type === 'image'"
        :id="id"
        :value="(current as ImageValue | undefined)"
        :disabled="disabled"
        :required="field.required"
        :described-by="describedBy"
        @update="set"
      />
      <select
        v-else-if="field.type === 'select'"
        :id="id"
        class="adm-select"
        :value="current"
        :disabled="disabled"
        :aria-describedby="describedBy"
        @change="set(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <label v-else-if="field.type === 'toggle'" class="adm-check">
        <input
          :id="id"
          type="checkbox"
          :checked="current === true"
          :disabled="disabled"
          :aria-describedby="describedBy"
          @change="set(($event.target as HTMLInputElement).checked)"
        >
        <span>{{ current === true ? 'Tak' : 'Nie' }}</span>
      </label>
      <input
        v-else-if="field.type === 'number'"
        :id="id"
        class="adm-input"
        type="number"
        :min="field.min"
        :max="field.max"
        :value="current"
        :readonly="disabled"
        :aria-describedby="describedBy"
        :aria-invalid="errors.length ? 'true' : undefined"
        @input="onNumber(($event.target as HTMLInputElement).value)"
      >
      <TokenColorInput
        v-else-if="field.type === 'tokenColor'"
        :id="id"
        :label="field.label"
        :value="typeof current === 'string' ? current : ''"
        :allowed="field.allowed"
        :tokens="ctx.tokens"
        :disabled="disabled"
        @update="set"
      />

      <p v-if="lock" :id="`${id}-lock`" class="adm-field__lock">Zablokowane: {{ lock }}</p>
      <p v-if="field.help" :id="`${id}-help`" class="adm-field__help">{{ field.help }}</p>
      <p v-if="errors.length" :id="`${id}-err`" class="adm-field__error" role="alert">{{ errors.join('; ') }}</p>
    </template>
  </div>
</template>
