<!--
  Definicja komponentu globalnego: nazwa, typ bloku (stały), pola udostępnione instancjom
  (`exposed`: klucze najwyższego poziomu) i wartości pól (FieldForm wg definicji bloku).
  Autozapis i publikacja przez EntityBar. Bez COMPONENT_EDIT tylko podgląd.
-->
<script setup lang="ts">
import type { ComponentDocument } from '@demrise/cms-core'
import { computed, ref } from 'vue'
import { siteSchema } from '~~/cms/schema'
import type { ComponentUsage } from '~/admin/entities'
import { cleanExposed } from '~/admin/entities'
import type { EntityDraft } from '~/admin/entity-draft'
import { useCmsSession } from '~/admin/session'
import FieldForm from '~/components/admin/fields/FieldForm.vue'
import Field from '~/components/admin/ui/Field.vue'
import EntityBar from './EntityBar.vue'

const props = defineProps<{ draft: EntityDraft<ComponentDocument>, canEdit: boolean, canPublish: boolean, usage?: ComponentUsage }>()
const emit = defineEmits<{ published: [] }>()

const session = useCmsSession()
const doc = computed(() => props.draft.state.data)
const def = computed(() => siteSchema.blocks[doc.value.blockType])
const fieldKeys = computed(() => def.value?.fields.map(f => f.key) ?? [])

function set(patch: Partial<ComponentDocument>) {
  props.draft.update({ ...doc.value, ...patch })
}

/** Pusta nazwa nie trafia do autozapisu (Worker odrzuciłby ją 422). */
const nameError = ref('')
function setName(value: string) {
  nameError.value = value.trim() ? '' : 'Nazwa jest wymagana'
  if (!nameError.value) set({ name: value })
}

function toggleExposed(key: string, on: boolean) {
  const next = on ? [...doc.value.exposed, key] : doc.value.exposed.filter(k => k !== key)
  set({ exposed: cleanExposed(next, fieldKeys.value) })
}
</script>

<template>
  <div class="adm-stack">
    <EntityBar
      :draft="draft as EntityDraft<unknown>"
      :can-edit="canEdit"
      :can-publish="canPublish"
      publish-note="Wszystkie instancje tego komponentu na stronach pokażą nową definicję po najbliższej przebudowie strony. Stron nie trzeba publikować ponownie."
      @published="emit('published')"
    />
    <p v-if="!canEdit" class="adm-alert adm-alert--neutral" role="status">Tylko podgląd: edycja komponentów wymaga uprawnienia Komponenty.</p>

    <Field label="Nazwa komponentu" :error="nameError">
      <template #default="{ id, describedBy, invalid }">
        <input :id="id" class="adm-input" type="text" maxlength="200" :value="doc.name" :readonly="!canEdit" :aria-describedby="describedBy" :aria-invalid="invalid" @input="setName(($event.target as HTMLInputElement).value)">
      </template>
    </Field>
    <Field label="Typ bloku" help="Typu bloku nie można zmienić (instancje na stronach zależą od jego pól).">
      <template #default="{ id, describedBy }">
        <input :id="id" class="adm-input" type="text" readonly :value="def ? `${def.label} (${doc.blockType})` : doc.blockType" :aria-describedby="describedBy">
      </template>
    </Field>

    <p v-if="!def" class="adm-alert adm-alert--danger" role="alert">Typ bloku „{{ doc.blockType }}” nie istnieje w cms/schema.ts.</p>
    <template v-else>
      <fieldset class="adm-fieldset">
        <legend class="adm-field__label">Pola, które strona może nadpisać</legend>
        <p class="adm-field__help">Zaznaczone pola można zmienić w konkretnej instancji na stronie. Pozostałe zawsze pochodzą z tej definicji.</p>
        <p v-if="!def.fields.length" class="adm-muted">Ten blok nie ma pól.</p>
        <label v-for="field in def.fields" :key="field.key" class="adm-check" style="display: flex">
          <input
            type="checkbox"
            :checked="doc.exposed.includes(field.key)"
            :disabled="!canEdit"
            @change="toggleExposed(field.key, ($event.target as HTMLInputElement).checked)"
          >
          <span>{{ field.label }} <code class="adm-muted">{{ field.key }}</code></span>
        </label>
      </fieldset>

      <section class="adm-stack" aria-labelledby="cmp-props-h">
        <h3 id="cmp-props-h">Treść definicji</h3>
        <FieldForm
          v-if="def.fields.length"
          :key="draft.state.id"
          :fields="def.fields"
          :model-value="doc.props"
          :mode="session.mode.value"
          :readonly="!canEdit"
          :path-prefix="`cmp-${draft.state.slug}`"
          @update:model-value="set({ props: $event })"
        />
        <p v-else class="adm-muted">Brak pól do edycji: wygląd i treść tego bloku wynikają z kodu strony.</p>
      </section>
    </template>

    <section class="adm-stack" aria-labelledby="cmp-usage-h" style="gap: 6px">
      <h3 id="cmp-usage-h">Użycia na stronach</h3>
      <p v-if="!usage || !usage.pages.length" class="adm-muted">Komponent nie jest używany na żadnej stronie.</p>
      <ul v-else class="adm-usages">
        <li v-for="p in usage.pages" :key="p.id"><NuxtLink :to="`/admin/edit/${encodeURIComponent(p.id)}`">{{ p.title }}</NuxtLink></li>
      </ul>
    </section>
  </div>
</template>
