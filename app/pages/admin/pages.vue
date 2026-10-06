<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { CmsUser, EntitySummary } from '@demrise/cms-core'
import { onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage, formatDate, STATUS_LABELS } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Strony · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const session = useCmsSession()
const pages = ref<EntitySummary[]>([])
const users = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref('')

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
    <div v-else class="adm-table-wrap">
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
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Shell>
</template>
