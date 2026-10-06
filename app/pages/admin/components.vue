<!--
  Komponenty globalne i wzorce. Komponent globalny: instancje na stronach zawsze pokazują
  aktualną definicję. Wzorzec: zestaw bloków kopiowany na stronę jako niezależna treść.
  Tworzenie i usuwanie: COMPONENT_EDIT (usunięcie używanego komponentu → 409 z listą użyć).
  ?id=<encja> otwiera komponent albo wzorzec.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { BlockInstance, ComponentDocument, Entity, EntitySummary, MediaUsage, PageDocument, PatternDocument } from '@demrise/cms-core'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { siteSchema } from '~~/cms/schema'
import { cmsApi, CmsApiError } from '~/admin/api'
import { newBlockProps } from '~/admin/editor/defaults'
import { countComponentUsages, entityEditPath, localStatus, slugError, slugify } from '~/admin/entities'
import type { EntityDraft } from '~/admin/entity-draft'
import { createEntityDraft } from '~/admin/entity-draft'
import { errorMessage, plural, STATUS_LABELS } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import { useAdminToast } from '~/admin/toast'
import ComponentEditor from '~/components/admin/entity/ComponentEditor.vue'
import PatternEditor from '~/components/admin/entity/PatternEditor.vue'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'
import Field from '~/components/admin/ui/Field.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Komponenty · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

type Tab = 'component' | 'pattern'
const route = useRoute()
const router = useRouter()
const session = useCmsSession()
const toast = useAdminToast()

const tab = ref<Tab>('component')
const components = ref<Entity<'component'>[]>([])
const patterns = ref<Entity<'pattern'>[]>([])
const pages = ref<Entity<'page'>[]>([])
const loading = ref(true)
const error = ref('')
const draft = shallowRef<EntityDraft<ComponentDocument> | EntityDraft<PatternDocument> | null>(null)

const canEdit = computed(() => session.can('COMPONENT_EDIT') && session.can('CONTENT_EDIT'))
const canPublish = computed(() => session.can('COMPONENT_EDIT') && session.can('CONTENT_PUBLISH'))
const canManage = computed(() => session.can('COMPONENT_EDIT'))

async function fetchKind<K extends 'component' | 'pattern' | 'page'>(kind: K): Promise<Entity<K>[]> {
  const list = await cmsApi.get<{ items: EntitySummary[] }>(`/api/entities?kind=${kind}`)
  return Promise.all(list.items.map(s => cmsApi.get<Entity<K>>(`/api/entities/${encodeURIComponent(s.id)}`)))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[components.value, patterns.value, pages.value] = await Promise.all([fetchKind('component'), fetchKind('pattern'), fetchKind('page')])
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
}

/** Komponenty po id i slugu (ref instancji wskazuje jedno albo drugie), wersja robocza. */
const componentDocs = computed<Record<string, ComponentDocument>>(() => {
  const out: Record<string, ComponentDocument> = {}
  for (const c of components.value) {
    out[c.id] = c.draft
    out[c.slug] = c.draft
  }
  return out
})
const usage = computed(() => countComponentUsages(components.value, pages.value))

const selectedId = computed(() => draft.value?.state.id ?? null)
const statusOf = (e: Entity) => (draft.value?.state.id === e.id ? draft.value.status.value : localStatus(e.draft, e.published))
const nameOf = (e: Entity<'component'> | Entity<'pattern'>) => (draft.value?.state.id === e.id ? (draft.value.state.data as { name: string }).name : e.draft.name) || e.slug

async function closeDraft() {
  if (!draft.value) return
  const current = draft.value
  await current.flush().catch(() => {})
  current.dispose()
  // Lista pokazuje zapisany stan otwartej encji.
  const list = current.state.kind === 'component' ? components.value : patterns.value
  const entity = (list as Entity[]).find(e => e.id === current.state.id)
  if (entity) {
    entity.draft = current.state.data as never
    entity.published = current.state.published as never
    entity.draftRev = current.state.draftRev
  }
  draft.value = null
}

async function open(entity: Entity<'component'> | Entity<'pattern'>) {
  if (draft.value?.state.id === entity.id) return
  await closeDraft()
  try {
    const fresh = await cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(entity.id)}`)
    draft.value = fresh.kind === 'component' ? createEntityDraft<ComponentDocument>(fresh) : createEntityDraft<PatternDocument>(fresh)
    tab.value = fresh.kind === 'pattern' ? 'pattern' : 'component'
    if (route.query.id !== entity.id) void router.replace({ query: { id: entity.id } })
  }
  catch (e) {
    toast.show(errorMessage(e), 'danger')
  }
}

onMounted(async () => {
  await load()
  const wanted = typeof route.query.id === 'string' ? route.query.id : undefined
  const entity = [...components.value, ...patterns.value].find(e => e.id === wanted)
  if (entity) await open(entity)
})

watch(tab, async (value) => {
  if (draft.value && draft.value.state.kind !== value) {
    await closeDraft()
    void router.replace({ query: {} })
  }
})

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!draft.value?.hasUnsaved()) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  void draft.value?.flush().catch(() => {}).finally(() => draft.value?.dispose())
})

function onTabKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  tab.value = tab.value === 'component' ? 'pattern' : 'component'
  requestAnimationFrame(() => document.getElementById(`cmp-tab-${tab.value}`)?.focus())
}

/* ---------- Nowy komponent ---------- */
const BLOCK_TYPES = Object.values(siteSchema.blocks).map(def => ({ type: def.type, label: def.label }))
const createOpen = ref(false)
const createForm = ref({ name: '', slug: '', blockType: BLOCK_TYPES[0]?.type ?? '', slugTouched: false })
const createError = ref('')
const creating = ref(false)
const createSlugError = computed(() => (createForm.value.slug ? slugError(createForm.value.slug) : null))

watch(() => createForm.value.name, (name) => {
  if (!createForm.value.slugTouched) createForm.value.slug = slugify(name)
})

function openCreateComponent() {
  createForm.value = { name: '', slug: '', blockType: BLOCK_TYPES[0]?.type ?? '', slugTouched: false }
  createError.value = ''
  createOpen.value = true
}

/** Bloki stron (robocze i opublikowane) jako wzory wartości dla nowego komponentu. */
const pageBlockSources = computed(() => pages.value.flatMap(p => [p.draft.blocks, p.published?.blocks]))

async function createComponent() {
  createError.value = ''
  const { name, slug, blockType } = createForm.value
  const def = siteSchema.blocks[blockType]
  if (!name.trim()) return void (createError.value = 'Podaj nazwę')
  const bad = slugError(slug)
  if (bad) return void (createError.value = bad)
  if (!def) return void (createError.value = 'Wybierz typ bloku')
  creating.value = true
  try {
    const data: ComponentDocument = { name: name.trim(), blockType, props: newBlockProps(def, pageBlockSources.value), exposed: [] }
    const entity = await cmsApi.post<Entity<'component'>>('/api/entities', { kind: 'component', slug, title: name.trim(), data })
    components.value = [...components.value, entity]
    createOpen.value = false
    toast.show(`Utworzono komponent ${entity.title}. Opublikuj go, zanim użyjesz go na publikowanej stronie.`, 'success')
    await open(entity)
  }
  catch (e) {
    createError.value = e instanceof CmsApiError && e.code === 'exists' ? 'Komponent albo wzorzec o tym identyfikatorze już istnieje' : errorMessage(e)
  }
  finally {
    creating.value = false
  }
}

/* ---------- Nowy wzorzec ze strony ---------- */
const patternOpen = ref(false)
const patternForm = ref({ name: '', slug: '', pageId: '', blocks: [] as string[], slugTouched: false })
const patternError = ref('')
const patternSlugError = computed(() => (patternForm.value.slug ? slugError(patternForm.value.slug) : null))
const patternPage = computed(() => pages.value.find(p => p.id === patternForm.value.pageId))

watch(() => patternForm.value.name, (name) => {
  if (!patternForm.value.slugTouched) patternForm.value.slug = slugify(name)
})
watch(() => patternForm.value.pageId, () => {
  patternForm.value.blocks = []
})

function openCreatePattern() {
  patternForm.value = { name: '', slug: '', pageId: pages.value[0]?.id ?? '', blocks: [], slugTouched: false }
  patternError.value = ''
  patternOpen.value = true
}

const blockLabel = (block: BlockInstance) => {
  if (block.type === 'global') return `Komponent globalny: ${(block.ref && componentDocs.value[block.ref]?.name) || block.ref}`
  return siteSchema.blocks[block.type]?.label ?? block.type
}

async function createPattern() {
  patternError.value = ''
  const { name, slug, blocks } = patternForm.value
  const page = patternPage.value
  if (!name.trim()) return void (patternError.value = 'Podaj nazwę')
  const bad = slugError(slug)
  if (bad) return void (patternError.value = bad)
  if (!page) return void (patternError.value = 'Wybierz stronę')
  // Kolejność jak na stronie; id zostają (przy wstawianiu edytor nadaje nowe).
  const chosen = (page.draft as PageDocument).blocks.filter(b => blocks.includes(b.id))
  if (!chosen.length) return void (patternError.value = 'Zaznacz co najmniej jeden blok')
  creating.value = true
  try {
    const data: PatternDocument = { name: name.trim(), blocks: JSON.parse(JSON.stringify(chosen)) as BlockInstance[] }
    const entity = await cmsApi.post<Entity<'pattern'>>('/api/entities', { kind: 'pattern', slug, title: name.trim(), data })
    patterns.value = [...patterns.value, entity]
    patternOpen.value = false
    toast.show(`Zapisano wzorzec ${entity.title}`, 'success')
    await open(entity)
  }
  catch (e) {
    patternError.value = e instanceof CmsApiError && e.code === 'exists' ? 'Komponent albo wzorzec o tym identyfikatorze już istnieje' : errorMessage(e)
  }
  finally {
    creating.value = false
  }
}

/* ---------- Usuwanie ---------- */
const removing = ref<Entity<'component'> | Entity<'pattern'> | null>(null)
const removeOpen = computed({ get: () => removing.value !== null, set: (v) => { if (!v) removing.value = null } })
const removeUsages = ref<MediaUsage[] | null>(null)
const removeError = ref('')
const deleting = ref(false)

function askRemove(entity: Entity<'component'> | Entity<'pattern'>) {
  removing.value = entity
  removeUsages.value = null
  removeError.value = ''
}

async function remove() {
  const entity = removing.value
  if (!entity) return
  deleting.value = true
  removeError.value = ''
  try {
    await cmsApi.delete(`/api/entities/${encodeURIComponent(entity.id)}`)
    if (draft.value?.state.id === entity.id) {
      draft.value.dispose()
      draft.value = null
      void router.replace({ query: {} })
    }
    if (entity.kind === 'component') components.value = components.value.filter(c => c.id !== entity.id)
    else patterns.value = patterns.value.filter(p => p.id !== entity.id)
    removing.value = null
    toast.show(`Usunięto: ${entity.title}`, 'success')
  }
  catch (e) {
    if (e instanceof CmsApiError && e.status === 409 && e.code === 'in_use') removeUsages.value = (e.body as { usages?: MediaUsage[] } | null)?.usages ?? []
    else removeError.value = errorMessage(e)
  }
  finally {
    deleting.value = false
  }
}

const pageKind = (id: string) => (pages.value.some(p => p.id === id) ? 'page' as const : 'pattern' as const)
</script>

<template>
  <Shell title="Komponenty i wzorce">
    <p class="adm-alert adm-alert--neutral">
      <strong>Komponent globalny</strong>: wszystkie jego instancje na stronach zawsze pokazują aktualną definicję (zmiana tutaj zmienia je wszystkie).
      <strong>Wzorzec</strong>: zapisany zestaw bloków, który edytor kopiuje na stronę jako niezależną treść (późniejsze zmiany wzorca jej nie dotyczą).
    </p>
    <div class="adm-tabs" role="tablist" aria-label="Rodzaj">
      <button id="cmp-tab-component" type="button" role="tab" class="adm-tab" :aria-selected="tab === 'component'" :tabindex="tab === 'component' ? 0 : -1" aria-controls="cmp-panel" @click="tab = 'component'" @keydown="onTabKey">KOMPONENTY GLOBALNE ({{ components.length }})</button>
      <button id="cmp-tab-pattern" type="button" role="tab" class="adm-tab" :aria-selected="tab === 'pattern'" :tabindex="tab === 'pattern' ? 0 : -1" aria-controls="cmp-panel" @click="tab = 'pattern'" @keydown="onTabKey">WZORCE ({{ patterns.length }})</button>
    </div>

    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <div v-else id="cmp-panel" role="tabpanel" :aria-labelledby="`cmp-tab-${tab}`" class="adm-split">
      <nav class="adm-card adm-split__list adm-stack" :aria-label="tab === 'component' ? 'Komponenty globalne' : 'Wzorce'">
        <template v-if="tab === 'component'">
          <Button v-if="canManage" variant="primary" size="sm" @click="openCreateComponent">Nowy komponent</Button>
          <ul class="adm-picklist">
            <li v-for="c in components" :key="c.id">
              <button type="button" :aria-current="selectedId === c.id" @click="open(c)">
                <strong>{{ nameOf(c) }}</strong>
                <span class="adm-muted">{{ siteSchema.blocks[c.draft.blockType]?.label ?? c.draft.blockType }}</span>
                <span class="adm-row" style="gap: 4px">
                  <Badge :tone="STATUS_LABELS[statusOf(c)].tone">{{ STATUS_LABELS[statusOf(c)].label }}</Badge>
                  <Badge tone="neutral">{{ plural(usage[c.id]?.pages.length ?? 0, ['strona', 'strony', 'stron']) }}</Badge>
                </span>
              </button>
            </li>
            <li v-if="!components.length" class="adm-muted">Brak komponentów.</li>
          </ul>
        </template>
        <template v-else>
          <Button v-if="canManage" variant="primary" size="sm" @click="openCreatePattern">Nowy wzorzec ze strony</Button>
          <ul class="adm-picklist">
            <li v-for="p in patterns" :key="p.id">
              <button type="button" :aria-current="selectedId === p.id" @click="open(p)">
                <strong>{{ nameOf(p) }}</strong>
                <span class="adm-muted">{{ p.draft.blocks.length }} bl. · {{ p.slug }}</span>
                <Badge :tone="STATUS_LABELS[statusOf(p)].tone">{{ STATUS_LABELS[statusOf(p)].label }}</Badge>
              </button>
            </li>
            <li v-if="!patterns.length" class="adm-muted">Brak wzorców. Zapisz bloki ze strony jako wzorzec.</li>
          </ul>
        </template>
      </nav>

      <section class="adm-card">
        <template v-if="draft && draft.state.kind === tab">
          <div class="adm-row" style="justify-content: space-between; margin-bottom: 12px">
            <h2>{{ (draft.state.data as { name: string }).name || draft.state.slug }} <span class="adm-muted">· {{ draft.state.slug }}</span></h2>
            <Button
              v-if="canManage"
              size="sm"
              variant="ghost"
              @click="askRemove([...components, ...patterns].find(e => e.id === draft!.state.id)!)"
            >Usuń {{ tab === 'component' ? 'komponent' : 'wzorzec' }}</Button>
          </div>
          <ComponentEditor
            v-if="draft.state.kind === 'component'"
            :key="draft.state.id"
            :draft="draft as EntityDraft<ComponentDocument>"
            :can-edit="canEdit"
            :can-publish="canPublish"
            :usage="usage[draft.state.id]"
          />
          <PatternEditor
            v-else
            :key="draft.state.id"
            :draft="draft as EntityDraft<PatternDocument>"
            :can-edit="canEdit"
            :can-publish="canPublish"
            :components="componentDocs"
          />
        </template>
        <p v-else class="adm-muted">Wybierz {{ tab === 'component' ? 'komponent' : 'wzorzec' }} z listy.</p>
      </section>
    </div>

    <Dialog v-model:open="createOpen" title="Nowy komponent globalny">
      <form id="cmp-create" class="adm-stack" novalidate @submit.prevent="createComponent">
        <p v-if="createError" class="adm-alert adm-alert--danger" role="alert">{{ createError }}</p>
        <Field label="Nazwa">
          <template #default="{ id }">
            <input :id="id" v-model="createForm.name" class="adm-input" type="text" maxlength="200" autofocus>
          </template>
        </Field>
        <Field label="Identyfikator (slug)" help="Małe litery, cyfry i myślnik. Instancje na stronach wskazują komponent tym identyfikatorem albo id." :error="createSlugError ?? undefined">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="createForm.slug" class="adm-input" type="text" maxlength="64" :aria-describedby="describedBy" :aria-invalid="invalid" @input="createForm.slugTouched = true">
          </template>
        </Field>
        <Field label="Typ bloku" help="Wartości startowe: kopia istniejącego bloku tego typu ze strony, a bez niego puste pola.">
          <template #default="{ id, describedBy }">
            <select :id="id" v-model="createForm.blockType" class="adm-select" :aria-describedby="describedBy">
              <option v-for="b in BLOCK_TYPES" :key="b.type" :value="b.type">{{ b.label }}</option>
            </select>
          </template>
        </Field>
      </form>
      <template #footer>
        <Button @click="createOpen = false">Anuluj</Button>
        <Button type="submit" form="cmp-create" variant="primary" :loading="creating">Utwórz</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="patternOpen" title="Nowy wzorzec ze strony" wide>
      <form id="pat-create" class="adm-stack" novalidate @submit.prevent="createPattern">
        <p v-if="patternError" class="adm-alert adm-alert--danger" role="alert">{{ patternError }}</p>
        <Field label="Nazwa">
          <template #default="{ id }">
            <input :id="id" v-model="patternForm.name" class="adm-input" type="text" maxlength="200" autofocus>
          </template>
        </Field>
        <Field label="Identyfikator (slug)" help="Małe litery, cyfry i myślnik." :error="patternSlugError ?? undefined">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="patternForm.slug" class="adm-input" type="text" maxlength="64" :aria-describedby="describedBy" :aria-invalid="invalid" @input="patternForm.slugTouched = true">
          </template>
        </Field>
        <Field label="Strona źródłowa (wersja robocza)">
          <template #default="{ id }">
            <select :id="id" v-model="patternForm.pageId" class="adm-select">
              <option v-for="p in pages" :key="p.id" :value="p.id">{{ p.title }} (/{{ p.slug }})</option>
            </select>
          </template>
        </Field>
        <fieldset v-if="patternPage" class="adm-fieldset">
          <legend class="adm-field__label">Bloki do zapisania</legend>
          <label v-for="block in patternPage.draft.blocks" :key="block.id" class="adm-check" style="display: flex">
            <input v-model="patternForm.blocks" type="checkbox" :value="block.id">
            <span>{{ blockLabel(block) }} <span class="adm-muted">· {{ block.id }}</span></span>
          </label>
        </fieldset>
        <p class="adm-field__help">Wzorzec zapisuje bloki z całą treścią. Przy wstawieniu na stronę dostają nowe identyfikatory i stają się niezależną kopią.</p>
      </form>
      <template #footer>
        <Button @click="patternOpen = false">Anuluj</Button>
        <Button type="submit" form="pat-create" variant="primary" :loading="creating">Zapisz wzorzec</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="removeOpen" :title="removeUsages ? 'Komponent jest używany' : `Usunąć: ${removing?.title ?? ''}?`">
      <div class="adm-stack">
        <template v-if="removeUsages">
          <p class="adm-alert adm-alert--warning" role="alert">Nie można usunąć komponentu, który stoi na stronach lub we wzorcach. Najpierw usuń te instancje (także z wersji opublikowanej, publikując stronę bez nich).</p>
          <ul class="adm-usages">
            <li v-for="u in removeUsages" :key="`${u.entityId}-${u.path}`">
              <NuxtLink :to="entityEditPath(pageKind(u.entityId), u.entityId)">{{ u.entityTitle }}</NuxtLink>
              <span class="adm-muted"> · {{ u.path.startsWith('published') ? 'wersja opublikowana' : 'wersja robocza' }}</span>
            </li>
          </ul>
        </template>
        <p v-else>Tej operacji nie można cofnąć. Historia wersji tej encji też zostanie usunięta.</p>
        <p v-if="removeError" class="adm-alert adm-alert--danger" role="alert">{{ removeError }}</p>
      </div>
      <template #footer>
        <Button @click="removing = null">{{ removeUsages ? 'Zamknij' : 'Anuluj' }}</Button>
        <Button v-if="!removeUsages" variant="danger" :loading="deleting" @click="remove">Usuń</Button>
      </template>
    </Dialog>
  </Shell>
</template>
