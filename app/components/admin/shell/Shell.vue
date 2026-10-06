<!--
  Układ panelu: boczna nawigacja (tylko sekcje dostępne dla uprawnień), górny pasek
  z użytkownikiem, rolą i wylogowaniem, treść w slocie. <Shell title="Strony">…</Shell>
-->
<script setup lang="ts">
import type { Permission } from '@demrise/cms-core'
import { ROLE_LABELS } from '@demrise/cms-core'
import { computed } from 'vue'
import '~/admin/admin.css'
import { useCmsSession } from '~/admin/session'
import Button from '~/components/admin/ui/Button.vue'
import Toasts from '~/components/admin/ui/Toasts.vue'

defineProps<{ title?: string }>()

const session = useCmsSession()

/** null = każdy zalogowany (Komponenty i Design bez uprawnień edycji działają jako podgląd). */
const SECTIONS: { to: string, label: string, permission: Permission | null }[] = [
  { to: '/admin/pages', label: 'Strony', permission: null },
  { to: '/admin/content', label: 'Treści', permission: 'CONTENT_EDIT' },
  { to: '/admin/media', label: 'Media', permission: null },
  { to: '/admin/components', label: 'Komponenty', permission: null },
  { to: '/admin/design', label: 'Design', permission: null },
  { to: '/admin/seo', label: 'SEO', permission: 'SEO_EDIT' },
  { to: '/admin/users', label: 'Użytkownicy', permission: 'USERS_MANAGE' },
  { to: '/admin/settings', label: 'Ustawienia', permission: 'SETTINGS_MANAGE' },
]

const sections = computed(() => SECTIONS.filter(s => s.permission === null || session.can(s.permission)))
const roleLabel = computed(() => (session.user.value ? ROLE_LABELS[session.user.value.role] : ''))

async function logout() {
  await session.logout().catch(() => {})
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="adm adm-root">
    <div class="adm-shell">
      <aside class="adm-side">
        <NuxtLink to="/admin" class="adm-side__brand" style="color: inherit; text-decoration: none">
          DEMRISE CMS
          <small>dobrolinski.pl</small>
        </NuxtLink>
        <nav aria-label="Sekcje panelu">
          <ul class="adm-nav" style="list-style: none; margin: 0; padding: 0">
            <li v-for="section in sections" :key="section.to">
              <NuxtLink :to="section.to">{{ section.label }}</NuxtLink>
            </li>
          </ul>
        </nav>
      </aside>
      <div class="adm-main">
        <header class="adm-top">
          <span v-if="session.user.value">
            <strong>{{ session.user.value.name }}</strong>
            <span class="adm-muted"> · {{ roleLabel }}</span>
          </span>
          <Button size="sm" variant="secondary" @click="logout">Wyloguj</Button>
        </header>
        <main class="adm-content">
          <h1 v-if="title">{{ title }}</h1>
          <slot />
        </main>
      </div>
    </div>
    <Toasts />
  </div>
</template>
