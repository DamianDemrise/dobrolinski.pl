<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { CmsUser, EntitySummary } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi, CmsApiError } from '~/admin/api'
import { errorMessage, formatDate, STATUS_LABELS } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import { useAdminToast } from '~/admin/toast'
import NewPageDialog from '~/components/admin/pages/NewPageDialog.vue'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Strony · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const session = useCmsSession()
const pages = ref<EntitySummary[]>([])
const users = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref('')
const toast = useAdminToast()

/** Dodawanie i usuwanie stron: te same uprawnienia co w Workerze (CONTENT_PUBLISH + MODE_ADVANCED). */
const canManage = computed(() => session.can('CONTENT_PUBLISH') && session.can('MODE_ADVANCED'))
const createOpen = ref(false)

// Usunąć można tylko stronę nigdy nieopublikowaną (status „szkic”); Worker odrzuca resztę (409).
const toDelete = ref<EntitySummary | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)

function askDelete(page: EntitySummary) {
  toDelete.value = page
  deleteOpen.value = true
}

async function confirmDelete() {
  const page = toDelete.value
  if (!page) return
  deleting.value = true
  try {
    await cmsApi.delete(`/api/entities/${encodeURIComponent(page.id)}`)
    pages.value = pages.value.filter(p => p.id !== page.id)
    deleteOpen.value = false
    toast.show(`Usunięto stronę ${page.title}`, 'success')
  }
  catch (e) {
    toast.show(e instanceof CmsApiError && e.code === 'published' ? 'Tej strony nie można usunąć: była już opublikowana.' : errorMessage(e), 'danger')
  }
  finally {
    deleting.value = false
  }
}

function editorName(id: string | null): string {
  if (!id) return '—'
  if (users.value[id]) return users.value[id]
  if (session.user.value?.id === id) return session.user.value.name
  return id
}

onMounted(async () => {
  try {
    const list = await cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=page')
    pages.value = list.items
    if (session.can('USERS_MANAGE')) {
      const u = await cmsApi.get<{ items: CmsUser[] }>('/api/users').catch(() => ({ items: [] as CmsUser[] }))
      users.value = Object.fromEntries(u.items.map(x => [x.id, x.name]))
    }
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <Shell title="Strony">
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <div v-if="canManage && !loading && !error" class="adm-row" style="justify-content: flex-end; margin-bottom: 12px">
      <Button variant="primary" @click="createOpen = true">Nowa strona</Button>
    </div>
    <div v-if="!error && !loading" class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th scope="col">Strona</th>
            <th scope="col">Status</th>
            <th scope="col">Ostatnia zmiana</th>
            <th scope="col">Edytował</th>
            <th scope="col">SEO</th>
            <th scope="col"><span class="adm-sr">Akcje</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="page in pages" :key="page.id">
            <td>
              <strong>{{ page.title }}</strong>
              <div class="adm-muted">/{{ page.slug }}</div>
            </td>
            <td><Badge :tone="STATUS_LABELS[page.status].tone">{{ STATUS_LABELS[page.status].label }}</Badge></td>
            <td>{{ formatDate(page.updatedAt) }}</td>
            <td>{{ editorName(page.updatedBy) }}</td>
            <td>
              <Badge :tone="page.seoStatus === 'ok' ? 'success' : 'warning'">{{ page.seoStatus === 'ok' ? 'Uzupełnione' : 'Do uzupełnienia' }}</Badge>
            </td>
            <td>
              <div class="adm-row" style="justify-content: flex-end">
                <NuxtLink class="adm-btn adm-btn--primary adm-btn--sm" :to="`/admin/edit/${page.id}`">Edytuj<span class="adm-sr"> {{ page.title }}</span></NuxtLink>
                <a class="adm-btn adm-btn--secondary adm-btn--sm" :href="`/admin/preview/${page.id}`" target="_blank" rel="noopener">Podgląd<span class="adm-sr"> {{ page.title }} (nowa karta)</span></a>
                <Button v-if="canManage && page.status === 'draft'" variant="danger" size="sm" @click="askDelete(page)">Usuń<span class="adm-sr"> {{ page.title }}</span></Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <NewPageDialog v-if="canManage" v-model:open="createOpen" :pages="pages" />

    <Dialog v-model:open="deleteOpen" title="Usunąć stronę?">
      <p v-if="toDelete">Strona <strong>{{ toDelete.title }}</strong> (/{{ toDelete.slug }}) nie była publikowana. Usunięcie skasuje ją razem z historią wersji i nie da się go cofnąć.</p>
      <template #footer>
        <Button @click="deleteOpen = false">Anuluj</Button>
        <Button variant="danger" :loading="deleting" @click="confirmDelete">Usuń stronę</Button>
      </template>
    </Dialog>
  </Shell>
</template>
