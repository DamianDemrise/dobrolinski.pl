<!--
  Nawigator: STRONA → obszary → bloki → pola. Zaznaczenie synchronizowane z canvasem.
  Przesuwanie: przeciągnij i upuść albo klawiatura (Alt+↑/↓ na bloku) i przyciski; pokaż/ukryj,
  duplikuj, usuń, dodaj blok i wstaw wzorzec. Ograniczenia z rdzenia (CmsError → toast/powód).
-->
<script setup lang="ts">
import type { BlockInstance, Entity, EntitySummary, PageDocument, PatternDocument } from '@demrise/cms-core'
import { duplicateBlock, insertBlock, insertPattern, moveBlock, newId, removeBlock, requiredPermissions, setBlockHidden } from '@demrise/cms-core'
import { computed, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { newBlockProps } from '~/admin/editor/defaults'
import type { CanvasTarget } from '~/admin/editor/protocol'
import type { EditorStore } from '~/admin/editor/store'
import { schema } from '~/admin/editor/store'
import { blockDefinition } from '~/admin/editor/targets'
import { errorMessage } from '~/admin/format'
import { useAdminToast } from '~/admin/toast'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

const props = defineProps<{ editor: EditorStore }>()
const emit = defineEmits<{ select: [target: CanvasTarget] }>()

const toast = useAdminToast()
const state = props.editor.state
const page = computed(() => state.page!.data)
const regions = computed(() => schema.layouts[page.value.layout]?.regions ?? [])
const readonly = computed(() => !props.editor.canEdit.value)

function regionOf(block: BlockInstance): string {
  const { def } = blockDefinition(block, state.components, schema)
  return def?.region ?? ''
}

const tree = computed(() => regions.value.map(region => ({
  region,
  blocks: page.value.blocks.map((block, index) => ({ block, index })).filter(({ block }) => regionOf(block) === region),
})))

function labelOf(block: BlockInstance): string {
  const { def, component } = blockDefinition(block, state.components, schema)
  return component ? component.name : def?.label ?? block.type
}

const selectedBlock = computed(() => (state.selection?.kind === 'block' ? state.selection.blockId : null))
const selectedField = computed(() => (state.selection?.kind === 'block' ? state.selection.field ?? null : null))
const expanded = ref<Set<string>>(new Set())

function select(block: BlockInstance, field?: string) {
  const target: CanvasTarget = { kind: 'block', blockId: block.id }
  if (field) target.field = field
  if (block.type === 'global' && block.ref) target.globalRef = block.ref
  emit('select', target)
}

function toggleFields(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

/** Powód, dla którego operacja jest niedostępna (próba na kopii dokumentu), albo null. */
function why(op: () => unknown): string | null {
  try {
    op()
    return null
  }
  catch (error) {
    return errorMessage(error)
  }
}

/**
 * Zmiana wymaga uprawnień, których brak (te same reguły co Worker: requiredPermissions z rdzenia,
 * np. przesunięcie bloku względem bloku stałego wymaga MODE_DEVELOPER). null = dozwolone.
 */
function permissionReason(next: PageDocument): string | null {
  const ids: Record<string, string> = state.componentIds
  const components = Object.fromEntries(Object.entries(state.components).filter(([key]) => ids[key] === key))
  const missing = requiredPermissions('page', page.value, next, schema, { components }).filter(p => !props.editor.session.can(p))
  return missing.length ? `Brak uprawnień do tej zmiany (${missing.join(', ')})` : null
}

/** Powód blokady przesunięcia bloku na indeks `to` albo null. */
function moveToReason(id: string, to: number): string | null {
  let next: PageDocument
  try {
    next = moveBlock(page.value, id, to, schema)
  }
  catch (error) {
    return errorMessage(error)
  }
  return permissionReason(next)
}

const moveReason = (index: number, dir: -1 | 1) => {
  const block = page.value.blocks[index]!
  const to = index + dir
  if (to < 0 || to >= page.value.blocks.length) return 'Blok jest na skraju strony'
  return moveToReason(block.id, to)
}

function move(block: BlockInstance, to: number) {
  if (props.editor.pageOp(doc => moveBlock(doc, block.id, to, schema))) {
    // Fokus zostaje na przesuniętym bloku.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-nav-block="${CSS.escape(block.id)}"]`)?.focus())
  }
}

function onKeydown(event: KeyboardEvent, block: BlockInstance, index: number) {
  if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
  event.preventDefault()
  const dir = event.key === 'ArrowUp' ? -1 : 1
  const reason = moveReason(index, dir)
  if (reason) toast.show(reason, 'warning')
  else move(block, index + dir)
}

/* Przeciągnij i upuść (w obrębie strony; rdzeń pilnuje obszarów). */
const dragId = ref<string | null>(null)
const dropIndex = ref<number | null>(null)
function onDragStart(event: DragEvent, block: BlockInstance) {
  dragId.value = block.id
  event.dataTransfer?.setData('text/plain', block.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onDragOver(event: DragEvent, index: number) {
  if (!dragId.value) return
  event.preventDefault()
  dropIndex.value = index
}
/** Indeks za ostatnim blokiem obszaru (upuszczenie na końcu obszaru). */
function endIndex(group: { blocks: { index: number }[] }): number {
  return (group.blocks.at(-1)?.index ?? -1) + 1
}
function onDrop(event: DragEvent, index: number) {
  event.preventDefault()
  const id = dragId.value
  dragId.value = null
  dropIndex.value = null
  if (!id) return
  const from = page.value.blocks.findIndex(b => b.id === id)
  const to = Math.max(0, Math.min(from < index ? index - 1 : index, page.value.blocks.length - 1))
  if (from < 0 || from === to) return
  const reason = moveToReason(id, to)
  if (reason) toast.show(reason, 'warning')
  else props.editor.pageOp(doc => moveBlock(doc, id, to, schema))
}

const hideReason = (block: BlockInstance) => (block.hidden ? null : why(() => setBlockHidden(page.value, block.id, true, schema)))
const duplicateReason = (block: BlockInstance) => why(() => duplicateBlock(page.value, block.id, schema))
const removeReason = (block: BlockInstance) => why(() => removeBlock(page.value, block.id, schema))

const toggleHidden = (block: BlockInstance) => props.editor.pageOp(doc => setBlockHidden(doc, block.id, !block.hidden, schema), block.hidden ? 'Blok jest znowu widoczny' : 'Blok ukryty (nie pojawi się na stronie)')
const duplicate = (block: BlockInstance) => props.editor.pageOp(doc => duplicateBlock(doc, block.id, schema), 'Blok zduplikowany')

const removing = ref<BlockInstance | null>(null)
const removeOpen = computed({ get: () => removing.value !== null, set: (v) => { if (!v) removing.value = null } })
function confirmRemove() {
  const block = removing.value
  removing.value = null
  if (block) props.editor.pageOp(doc => removeBlock(doc, block.id, schema), 'Blok usunięty (cofnij: ⌘Z / Ctrl+Z)')
}

/* Dodawanie bloków i wzorców. */
const addRegion = ref<string | null>(null)
const addOpen = computed({ get: () => addRegion.value !== null, set: (v) => { if (!v) addRegion.value = null } })
const patterns = ref<EntitySummary[]>([])
const patternsLoading = ref(false)

/** Indeks wstawienia na końcu obszaru (za ostatnim blokiem tego lub wcześniejszego obszaru). */
function insertIndex(region: string): number {
  const order = regions.value.indexOf(region)
  let index = 0
  page.value.blocks.forEach((block, i) => {
    const r = regions.value.indexOf(regionOf(block))
    if (r !== -1 && r <= order) index = i + 1
  })
  return index
}

const addableTypes = computed(() => {
  const region = addRegion.value
  if (!region) return []
  return Object.values(schema.blocks).filter(def => def.region === region).map(def => ({
    def,
    reason: def.maxPerPage !== undefined && page.value.blocks.filter(b => b.type === def.type).length >= def.maxPerPage
      ? `Najwyżej ${def.maxPerPage} na stronie`
      : null,
  }))
})

async function openAdd(region: string) {
  addRegion.value = region
  patternsLoading.value = true
  try {
    patterns.value = (await cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=pattern')).items
  }
  catch (error) {
    toast.show(`Nie wczytano wzorców: ${errorMessage(error)}`, 'danger')
  }
  finally {
    patternsLoading.value = false
  }
}

function addBlock(type: string) {
  const def = schema.blocks[type]!
  const region = addRegion.value!
  // Kopia props istniejącego bloku tego typu (wersja robocza, potem opublikowana) albo puste poprawne wartości.
  const block: BlockInstance = { id: newId('b'), type, props: newBlockProps(def, [page.value.blocks, state.page!.published?.blocks]) }
  addRegion.value = null
  if (props.editor.pageOp(doc => insertBlock(doc, block, insertIndex(region), schema), `Dodano blok: ${def.label}`)) select(block)
}

async function addPattern(summary: EntitySummary) {
  const region = addRegion.value!
  addRegion.value = null
  try {
    const entity = await cmsApi.get<Entity<'pattern'>>(`/api/entities/${encodeURIComponent(summary.id)}`)
    const pattern = (entity.published ?? entity.draft) as PatternDocument
    props.editor.pageOp(doc => insertPattern(doc, pattern, insertIndex(region)), `Wstawiono wzorzec: ${pattern.name}`)
  }
  catch (error) {
    toast.show(errorMessage(error), 'danger')
  }
}
</script>

<template>
  <div class="ed-panel__body">
    <button type="button" class="nav-block__label" :aria-current="state.selection === null" @click="state.selection = null">
      <strong>STRONA</strong> · {{ page.title }}
      <small>Układ: {{ schema.layouts[page.layout]?.label ?? page.layout }}</small>
    </button>
    <div v-for="group in tree" :key="group.region">
      <div class="adm-row" style="justify-content: space-between">
        <span class="nav-region">Obszar: {{ group.region }}</span>
        <Button v-if="!readonly" size="sm" variant="ghost" @click="openAdd(group.region)">Dodaj<span class="adm-sr"> do obszaru {{ group.region }}</span></Button>
      </div>
      <ul class="nav-tree" :aria-label="`Bloki w obszarze ${group.region}`">
        <li
          v-for="{ block, index } in group.blocks"
          :key="block.id"
          class="nav-block"
          :class="{ 'is-selected': selectedBlock === block.id, 'is-hidden': block.hidden, 'is-drop': dropIndex === index }"
          @dragover="onDragOver($event, index)"
          @drop="onDrop($event, index)"
        >
          <div class="nav-block__row">
            <span
              v-if="!readonly && !moveReason(index, -1) || !readonly && !moveReason(index, 1)"
              class="nav-handle"
              draggable="true"
              aria-hidden="true"
              title="Przeciągnij, aby przesunąć"
              @dragstart="onDragStart($event, block)"
              @dragend="dragId = null; dropIndex = null"
            >⋮⋮</span>
            <button
              type="button"
              class="nav-block__label"
              :data-nav-block="block.id"
              :aria-current="selectedBlock === block.id && !selectedField"
              :aria-keyshortcuts="readonly ? undefined : 'Alt+ArrowUp Alt+ArrowDown'"
              @click="select(block)"
              @keydown="onKeydown($event, block, index)"
            >
              {{ labelOf(block) }}
              <small>
                <template v-if="block.type === 'global'">Komponent globalny · </template>
                <template v-if="block.hidden">ukryty · </template>
                {{ block.id }}
              </small>
            </button>
            <Button size="sm" variant="ghost" :aria-expanded="expanded.has(block.id)" :aria-label="`Pola: ${labelOf(block)}`" @click="toggleFields(block.id)">{{ expanded.has(block.id) ? '▾' : '▸' }}</Button>
          </div>
          <div v-if="!readonly && selectedBlock === block.id" class="nav-block__actions">
            <Button size="sm" :disabled="!!moveReason(index, -1)" :title="moveReason(index, -1) ?? 'Alt+↑'" @click="move(block, index - 1)">↑ W górę</Button>
            <Button size="sm" :disabled="!!moveReason(index, 1)" :title="moveReason(index, 1) ?? 'Alt+↓'" @click="move(block, index + 1)">↓ W dół</Button>
            <Button size="sm" :disabled="!!hideReason(block)" :title="hideReason(block) ?? undefined" @click="toggleHidden(block)">{{ block.hidden ? 'Pokaż' : 'Ukryj' }}</Button>
            <Button size="sm" :disabled="!!duplicateReason(block)" :title="duplicateReason(block) ?? undefined" @click="duplicate(block)">Duplikuj</Button>
            <Button size="sm" variant="ghost" :disabled="!!removeReason(block)" :title="removeReason(block) ?? undefined" @click="removing = block">Usuń</Button>
            <p v-if="moveReason(index, -1) && moveReason(index, 1)" class="adm-field__help" style="width: 100%">Przesuwanie: {{ moveReason(index, -1) }}</p>
          </div>
          <ul v-if="expanded.has(block.id)" class="nav-fields" :aria-label="`Pola bloku ${labelOf(block)}`">
            <li v-for="field in blockDefinition(block, state.components, schema).def?.fields ?? []" :key="field.key">
              <button type="button" :aria-current="selectedBlock === block.id && selectedField === field.key" @click="select(block, field.key)">
                {{ field.label }}
              </button>
            </li>
          </ul>
        </li>
        <li
          v-if="group.blocks.length && dragId"
          class="nav-drop-end"
          :class="{ 'is-drop': dropIndex === endIndex(group) }"
          @dragover="onDragOver($event, endIndex(group))"
          @drop="onDrop($event, endIndex(group))"
        >
          Upuść na końcu obszaru
        </li>
        <li v-if="!group.blocks.length" class="adm-muted" style="padding: 4px 6px">Brak bloków</li>
      </ul>
    </div>

    <Dialog v-model:open="addOpen" :title="`Dodaj do obszaru: ${addRegion ?? ''}`">
      <div class="adm-stack">
        <h3>Bloki</h3>
        <p v-if="!addableTypes.length" class="adm-muted">Ten obszar nie ma typów bloków.</p>
        <div v-for="{ def, reason } in addableTypes" :key="def.type" class="adm-row" style="justify-content: space-between">
          <span>{{ def.label }} <Badge v-if="reason" tone="neutral">{{ reason }}</Badge></span>
          <Button size="sm" :disabled="!!reason" @click="addBlock(def.type)">Dodaj</Button>
        </div>
        <h3>Wzorce</h3>
        <p v-if="patternsLoading" class="adm-muted" role="status">Wczytywanie wzorców…</p>
        <p v-else-if="!patterns.length" class="adm-muted">Brak zapisanych wzorców.</p>
        <div v-for="pattern in patterns" :key="pattern.id" class="adm-row" style="justify-content: space-between">
          <span>{{ pattern.title }}</span>
          <Button size="sm" @click="addPattern(pattern)">Wstaw</Button>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:open="removeOpen" title="Usunąć blok?">
      <p>Blok „{{ removing ? labelOf(removing) : '' }}” zniknie z wersji roboczej. Możesz to cofnąć (⌘Z / Ctrl+Z) albo odrzucić zmiany.</p>
      <template #footer>
        <Button @click="removing = null">Anuluj</Button>
        <Button variant="danger" @click="confirmRemove">Usuń blok</Button>
      </template>
    </Dialog>
  </div>
</template>
