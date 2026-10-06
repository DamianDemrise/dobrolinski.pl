<!--
  Treści globalne (kind=global): dane wspólne wszystkich stron (np. ustawienia strony, dane warsztatu).
  Edycja FieldForm wg cms/schema.ts globals[slug].fields, autozapis wersji roboczej, publikacja,
  odrzucenie zmian i historia wersji (EntityBar). ?id=<encja> wybiera global.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { Entity, EntitySummary, GlobalDocument } from '@demrise/cms-core'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { siteSchema } from '~~/cms/schema'
import { cmsApi } from '~/admin/api'
import type { EntityDraft } from '~/admin/entity-draft'
import { createEntityDraft } from '~/admin/entity-draft'
import { errorMessage, STATUS_LABELS } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import EntityBar from '~/components/admin/entity/EntityBar.vue'
import FieldForm from '~/components/admin/fields/FieldForm.vue'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Treści · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const router = useRouter()
const session = useCmsSession()
const items = ref<EntitySummary[]>([])
const loading = ref(true)
const error = ref('')
const entityLoading = ref(false)
const draft = shallowRef<EntityDraft<GlobalDocument> | null>(null)

const canEdit = computed(() => session.can('CONTENT_EDIT'))
const canPublish = computed(() => session.can('CONTENT_PUBLISH'))
const definition = computed(() => (draft.value ? siteSchema.globals[draft.value.state.slug] : undefined))
const labelOf = (item: EntitySummary) => siteSchema.globals[item.slug]?.label ?? item.title

async function open(id: string) {
  if (draft.value?.state.id === id) return
  if (draft.value) {
    await draft.value.flush().catch(() => {})
    draft.value.dispose()
    draft.value = null
  }
  entityLoading.value = true
  try {
    const entity = await cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(id)}`)
    draft.value = createEntityDraft<GlobalDocument>(entity)
    if (route.query.id !== id) void router.replace({ query: { id } })
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    entityLoading.value = false
  }
}

async function refreshList() {
  items.value = (await cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=global')).items
}

onMounted(async () => {
  try {
    await refreshList()
    const wanted = typeof route.query.id === 'string' ? route.query.id : undefined
    const first = items.value.find(i => i.id === wanted) ?? items.value[0]
    if (first) await open(first.id)
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
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

/** Status na liście: dla otwartego globalu liczony lokalnie (autozapis zmienia go na bieżąco). */
const statusOf = (item: EntitySummary) => (draft.value?.state.id === item.id ? draft.value.status.value : item.status)
</script>

<template>
  <Shell title="Treści globalne">
    <p class="adm-muted">Dane wspólne dla wszystkich stron (np. e-mail, telefon, baner zgody, dane warsztatu). Zmiana jest widoczna wszędzie po publikacji.</p>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <div v-else class="adm-split">
      <nav class="adm-card adm-split__list" aria-label="Treści globalne">
        <ul class="adm-picklist">
          <li v-for="item in items" :key="item.id">
            <button type="button" :aria-current="draft?.state.id === item.id" @click="open(item.id)">
              <strong>{{ labelOf(item) }}</strong>
              <Badge :tone="STATUS_LABELS[statusOf(item)].tone">{{ STATUS_LABELS[statusOf(item)].label }}</Badge>
            </button>
          </li>
          <li v-if="!items.length" class="adm-muted">Brak treści globalnych.</li>
        </ul>
      </nav>
      <section class="adm-card adm-stack" aria-live="polite" :aria-busy="entityLoading">
        <p v-if="entityLoading" class="adm-muted" role="status">Wczytywanie…</p>
        <template v-else-if="draft && definition">
          <h2>{{ definition.label }}</h2>
          <EntityBar
            :draft="draft as EntityDraft<unknown>"
            :can-edit="canEdit"
            :can-publish="canPublish"
            :label="definition.label"
            publish-note="Treść globalna trafia na wszystkie strony przy najbliższej przebudowie strony."
            @published="refreshList().catch(() => {})"
          />
          <p v-if="!canEdit" class="adm-alert adm-alert--neutral" role="status">Tylko podgląd: brak uprawnień do edycji treści.</p>
          <FieldForm
            :key="draft.state.id"
            :fields="definition.fields"
            :model-value="draft.state.data"
            :mode="session.mode.value"
            :readonly="!canEdit"
            :path-prefix="`glob-${draft.state.slug}`"
            @update:model-value="draft.update($event)"
          />
        </template>
        <p v-else-if="draft" class="adm-alert adm-alert--warning">Brak definicji pól dla „{{ draft.state.slug }}” w cms/schema.ts.</p>
      </section>
    </div>
  </Shell>
</template>
