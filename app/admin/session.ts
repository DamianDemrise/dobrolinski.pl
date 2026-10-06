/**
 * Sesja panelu: kto jest zalogowany i co mu wolno. UI ukrywa niedostępne akcje,
 * ale decyduje zawsze backend (403 z API).
 */
import type { CmsUser, MeResponse, Permission } from '@demrise/cms-core'
import { editModeFor } from '@demrise/cms-core'
import { computed, ref } from 'vue'
import { cmsApi, CmsApiError } from './api'

const user = ref<CmsUser | null>(null)
const permissions = ref<Permission[]>([])
const loaded = ref(false)

export function useCmsSession() {
  const load = async (): Promise<boolean> => {
    try {
      const me = await cmsApi.get<MeResponse>('/api/me')
      user.value = me.user
      permissions.value = me.permissions
      return true
    }
    catch (error) {
      if (error instanceof CmsApiError && error.status === 401) {
        user.value = null
        permissions.value = []
        return false
      }
      throw error
    }
    finally {
      loaded.value = true
    }
  }

  const logout = async () => {
    try {
      await cmsApi.post('/api/auth/logout')
    }
    finally {
      user.value = null
      permissions.value = []
    }
  }

  const can = (permission: Permission) => permissions.value.includes(permission)
  const mode = computed(() => (user.value ? editModeFor(user.value.role) : 'safe'))

  return { user, permissions, loaded, load, logout, can, mode }
}
