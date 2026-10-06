<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { CmsUser, EntitySummary, MediaListResponse, Permission } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi } from '~/admin/api'
import { useCmsSession } from '~/admin/session'
import DeployStatus from '~/components/admin/dashboard/DeployStatus.vue'
import FormStats from '~/components/admin/dashboard/FormStats.vue'
import Shell from '~/components/admin/shell/Shell.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Panel · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const session = useCmsSession()
const counts = ref<Record<string, number | null>>({ pages: null, media: null, users: null })

const TILES: { key: string, to: string, label: string, description: string, permission: Permission | null }[] = [
  { key: 'pages', to: '/admin/pages', label: 'Strony', description: 'Edycja wizualna i publikacja', permission: null },
  { key: 'content', to: '/admin/content', label: 'Treści', description: 'Dane wspólne strony', permission: 'CONTENT_EDIT' },
  { key: 'media', to: '/admin/media', label: 'Media', description: 'Zdjęcia i grafiki', permission: null },
  { key: 'components', to: '/admin/components', label: 'Komponenty', description: 'Komponenty globalne i wzorce', permission: null },
  { key: 'design', to: '/admin/design', label: 'Design', description: 'Kolory, typografia, odstępy', permission: null },
  { key: 'seo', to: '/admin/seo', label: 'SEO', description: 'Tytuły i opisy stron', permission: 'SEO_EDIT' },
  { key: 'users', to: '/admin/users', label: 'Użytkownicy', description: 'Dostępy i role', permission: 'USERS_MANAGE' },
  { key: 'settings', to: '/admin/settings', label: 'Ustawienia', description: 'Integracje i przebudowa', permission: 'SETTINGS_MANAGE' },
]
const tiles = computed(() => TILES.filter(t => t.permission === null || session.can(t.permission)))

onMounted(async () => {
  const [pages, media, users] = await Promise.allSettled([
    cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=page'),
    cmsApi.get<MediaListResponse>('/api/media'),
    session.can('USERS_MANAGE') ? cmsApi.get<{ items: CmsUser[] }>('/api/users') : Promise.reject(new Error('skip')),
  ])
  counts.value = {
    pages: pages.status === 'fulfilled' ? pages.value.items.length : null,
    media: media.status === 'fulfilled' ? media.value.items.length : null,
    users: users.status === 'fulfilled' ? users.value.items.length : null,
  }
})
</script>

<template>
  <Shell title="Panel">
    <p v-if="session.user.value" class="adm-muted">Dzień dobry, {{ session.user.value.name }}.</p>
    <div class="adm-tiles">
      <NuxtLink v-for="tile in tiles" :key="tile.key" :to="tile.to" class="adm-tile">
        <span class="adm-muted">{{ tile.label }}</span>
        <strong v-if="counts[tile.key] !== undefined && counts[tile.key] !== null">{{ counts[tile.key] }}</strong>
        <span>{{ tile.description }}</span>
      </NuxtLink>
    </div>
    <DeployStatus />
    <FormStats />
  </Shell>
</template>
