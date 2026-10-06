/**
 * Komunikaty panelu (toasty). Region renderuje components/admin/ui/Toasts.vue (aria-live="polite").
 *
 *   const toast = useAdminToast()
 *   toast.show('Zapisano', 'success')          // tone: neutral | success | warning | danger
 *   toast.show('Błąd', 'danger', 0)            // timeout 0 = do zamknięcia ręcznie
 */
import { readonly, ref } from 'vue'

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger'
export interface Toast { id: number, message: string, tone: ToastTone }

const toasts = ref<Toast[]>([])
let nextId = 1

function dismiss(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

function show(message: string, tone: ToastTone = 'neutral', timeoutMs = tone === 'danger' ? 9000 : 5000): number {
  const id = nextId++
  toasts.value = [...toasts.value.slice(-4), { id, message, tone }]
  if (timeoutMs > 0) setTimeout(() => dismiss(id), timeoutMs)
  return id
}

export function useAdminToast() {
  return { toasts: readonly(toasts), show, dismiss }
}
