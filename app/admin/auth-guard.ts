/**
 * Strażnik tras panelu (tylko build CMS_ADMIN=1; publiczny build ignoruje app/admin/**).
 * Użycie na stronie panelu: definePageMeta({ middleware: [adminAuth] }) (wszystkie poza /admin/login).
 * Wczytuje sesję (/api/me); 401 → /admin/login. Każde 401 z API (wygaśnięcie sesji
 * w trakcie pracy) również przenosi na logowanie (onUnauthorized w app/admin/api.ts).
 */
import { onUnauthorized } from './api'
import { useCmsSession } from './session'

let hooked = false

export const adminAuth = defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path.startsWith('/admin/login')) return
  if (!hooked) {
    hooked = true
    const router = useRouter()
    onUnauthorized(() => {
      if (!router.currentRoute.value.path.startsWith('/admin/login')) void router.push('/admin/login')
    })
  }
  const session = useCmsSession()
  if (session.user.value) return
  try {
    if (!(await session.load())) return navigateTo('/admin/login')
  }
  catch {
    // Sieć/serwer: strona pokaże własny błąd przy pierwszym zapytaniu; nie wylogowujemy.
  }
})
