<!--
  Wzorzec: nazwa (zmiana = autozapis), lista zapisanych bloków (usunięcie bloku z wzorca),
  publikacja opcjonalna (edytor wstawia wersję opublikowaną, a bez niej roboczą).
  Wstawiony wzorzec to niezależna kopia: nowe id bloków i elementów list (insertPattern z rdzenia).
-->
<script setup lang="ts">
import type { ComponentDocument, PatternDocument } from '@demrise/cms-core'
import { computed, ref } from 'vue'
import { siteSchema } from '~~/cms/schema'
import type { EntityDraft } from '~/admin/entity-draft'
import Button from '~/components/admin/ui/Button.vue'
import Field from '~/components/admin/ui/Field.vue'
import EntityBar from './EntityBar.vue'

const props = defineProps<{ draft: EntityDraft<PatternDocument>, canEdit: boolean, canPublish: boolean, components: Record<string, ComponentDocument> }>()

const doc = computed(() => props.draft.state.data)
const nameError = ref('')

function setName(value: string) {
  nameError.value = value.trim() ? '' : 'Nazwa jest wymagana'
  if (!nameError.value) props.draft.update({ ...doc.value, name: value })
}

function removeBlock(id: string) {
  props.draft.update({ ...doc.value, blocks: doc.value.blocks.filter(b => b.id !== id) })
}

const labelOf = (type: string, ref?: string) => {
  if (type === 'global') return `Komponent globalny: ${(ref && props.components[ref]?.name) || ref || '?'}`
  return siteSchema.blocks[type]?.label ?? type
}
</script>

<template>
  <div class="adm-stack">
    <EntityBar
      :draft="draft as EntityDraft<unknown>"
      :can-edit="canEdit"
      :can-publish="canPublish"
      publish-note="Publikacja wzorca nie zmienia strony publicznej. Edytor wstawia opublikowaną wersję wzorca (a bez publikacji wersję roboczą)."
    />
    <p v-if="!canEdit" class="adm-alert adm-alert--neutral" role="status">Tylko podgląd: edycja wzorców wymaga uprawnienia Komponenty.</p>
    <Field label="Nazwa wzorca" :error="nameError">
      <template #default="{ id, describedBy, invalid }">
        <input :id="id" class="adm-input" type="text" maxlength="200" :value="doc.name" :readonly="!canEdit" :aria-describedby="describedBy" :aria-invalid="invalid" @input="setName(($event.target as HTMLInputElement).value)">
      </template>
    </Field>
    <section class="adm-stack" aria-labelledby="pat-blocks-h" style="gap: 6px">
      <h3 id="pat-blocks-h">Bloki we wzorcu ({{ doc.blocks.length }})</h3>
      <p v-if="!doc.blocks.length" class="adm-muted">Wzorzec nie ma bloków.</p>
      <ol v-else class="adm-usages">
        <li v-for="block in doc.blocks" :key="block.id" class="adm-row" style="justify-content: space-between">
          <span>{{ labelOf(block.type, block.ref) }} <span class="adm-muted">· {{ block.id }}</span></span>
          <Button v-if="canEdit && doc.blocks.length > 1" size="sm" variant="ghost" @click="removeBlock(block.id)">Usuń z wzorca<span class="adm-sr"> {{ labelOf(block.type, block.ref) }}</span></Button>
        </li>
      </ol>
      <p class="adm-field__help">Wstawianie: edytor strony → Nawigator → „Dodaj” w obszarze → Wzorce. Bloki muszą pasować do układu strony.</p>
    </section>
  </div>
</template>
