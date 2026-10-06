<!--
  Dialog „Nowa strona”: tytuł, adres (z tytułu, do poprawienia), start pusty w wybranym układzie
  albo kopia istniejącej strony. Po utworzeniu przechodzi do edytora.
  <NewPageDialog v-model:open="open" :pages="lista stron z /api/entities?kind=page" />
-->
<script setup lang="ts">
import type { ComponentDocument, Entity, EntitySummary, PageDocument } from '@demrise/cms-core'
import { computed, ref, watch } from 'vue'
import { siteSchema } from '~~/cms/schema'
import { cmsApi, CmsApiError } from '~/admin/api'
import { slugify } from '~/admin/entities'
import { errorMessage } from '~/admin/format'
import { copyPage, emptyPage, pageSlugMessage, type ComponentOption } from '~/admin/new-page'
import { useAdminToast } from '~/admin/toast'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'
import Field from '~/components/admin/ui/Field.vue'

const props = defineProps<{ pages: EntitySummary[] }>()
const open = defineModel<boolean>('open', { required: true })

const LAYOUTS = Object.entries(siteSchema.layouts).map(([value, l]) => ({ value, label: l.label }))
const toast = useAdminToast()
const router = useRouter()

const blank = () => ({ title: '', slug: '', slugTouched: false, start: 'empty' as 'empty' | 'copy', layout: LAYOUTS[0]?.value ?? '', sourceId: props.pages[0]?.id ?? '' })
const form = ref(blank())
const error = ref('')
const creating = ref(false)

watch(open, (value) => {
  if (!value) return
  form.value = blank()
  error.value = ''
})
watch(() => form.value.title, (title) => {
  if (!form.value.slugTouched) form.value.slug = slugify(title)
})

const taken = computed(() => props.pages.map(p => p.slug))
/** Błąd adresu na żywo, ale dopiero gdy jest co oceniać. */
const slugError = computed(() => (form.value.slug || form.value.slugTouched ? pageSlugMessage(form.value.slug, taken.value) : null))

/** Komponenty globalne (pełne dokumenty): instancje za stałe bloki układu, np. przycisk powrotu. */
async function loadComponents(): Promise<ComponentOption[]> {
  const list = await cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=component')
  const entities = await Promise.all(list.items.map(c => cmsApi.get<Entity<'component'>>(`/api/entities/${encodeURIComponent(c.id)}`)))
  return entities.map(e => ({ id: e.id, doc: e.draft as ComponentDocument, published: e.published !== null }))
}

async function buildDocument(title: string, slug: string): Promise<PageDocument> {
  const { start, layout, sourceId } = form.value
  if (start === 'empty') return emptyPage(title, slug, layout, siteSchema, await loadComponents())
  const source = await cmsApi.get<Entity<'page'>>(`/api/entities/${encodeURIComponent(sourceId)}`)
  return copyPage(source.draft as PageDocument, title, slug)
}

async function create() {
  error.value = ''
  const title = form.value.title.trim()
  const slug = form.value.slug
  if (!title) return void (error.value = 'Podaj tytuł strony')
  const bad = pageSlugMessage(slug, taken.value)
  if (bad) return void (error.value = bad)
  if (form.value.start === 'empty' && !form.value.layout) return void (error.value = 'Wybierz układ')
  if (form.value.start === 'copy' && !form.value.sourceId) return void (error.value = 'Wybierz stronę do skopiowania')
  creating.value = true
  try {
    const data = await buildDocument(title, slug)
    const entity = await cmsApi.post<Entity<'page'>>('/api/entities', { kind: 'page', slug, title, data })
    open.value = false
    toast.show(`Utworzono stronę ${entity.title}. Opublikuj ją i wypchnij, żeby pojawiła się pod /${slug}.`, 'success')
    await router.push(`/admin/edit/${encodeURIComponent(entity.id)}`)
  }
  catch (e) {
    error.value = e instanceof CmsApiError && e.code === 'exists' ? 'Strona o tym adresie już istnieje' : errorMessage(e)
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open" title="Nowa strona">
    <form id="page-create" class="adm-stack" novalidate @submit.prevent="create">
      <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
      <Field label="Tytuł">
        <template #default="{ id }">
          <input :id="id" v-model="form.title" class="adm-input" type="text" maxlength="200" autofocus>
        </template>
      </Field>
      <Field label="Adres" :help="`dobrolinski.pl/${form.slug || '…'}`" :error="slugError ?? undefined">
        <template #default="{ id, describedBy, invalid }">
          <input
            :id="id" v-model="form.slug" class="adm-input" type="text" maxlength="64" spellcheck="false" autocomplete="off"
            :aria-describedby="describedBy" :aria-invalid="invalid" @input="form.slugTouched = true"
          >
        </template>
      </Field>
      <fieldset class="adm-fieldset adm-stack">
        <legend>Start</legend>
        <label class="adm-check"><input v-model="form.start" type="radio" name="page-start" value="empty"> Pusta strona w układzie</label>
        <Field v-if="form.start === 'empty'" label="Układ" help="Strona dostanie stałe bloki układu z wartościami startowymi.">
          <template #default="{ id, describedBy }">
            <select :id="id" v-model="form.layout" class="adm-select" :aria-describedby="describedBy">
              <option v-for="l in LAYOUTS" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
          </template>
        </Field>
        <label class="adm-check"><input v-model="form.start" type="radio" name="page-start" value="copy" :disabled="!pages.length"> Kopia istniejącej strony</label>
        <Field v-if="form.start === 'copy'" label="Strona" help="Kopia wersji roboczej: te same bloki, niezależne od oryginału; komponenty globalne zostają wspólne.">
          <template #default="{ id, describedBy }">
            <select :id="id" v-model="form.sourceId" class="adm-select" :aria-describedby="describedBy">
              <option v-for="p in pages" :key="p.id" :value="p.id">{{ p.title }} (/{{ p.slug }})</option>
            </select>
          </template>
        </Field>
      </fieldset>
      <p class="adm-muted">Strona powstaje jako szkic. Na dobrolinski.pl pojawi się po publikacji i wypchnięciu.</p>
    </form>
    <template #footer>
      <Button @click="open = false">Anuluj</Button>
      <Button type="submit" form="page-create" variant="primary" :loading="creating">Utwórz</Button>
    </template>
  </Dialog>
</template>
