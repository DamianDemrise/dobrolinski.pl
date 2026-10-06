import type { InjectionKey } from 'vue'

/** Przewinięcie do treści warsztatu (przycisk „Więcej o warsztacie” w pierwszym ekranie). */
export const WORKSHOP_SHOW_CONTENT: InjectionKey<() => void> = Symbol('workshop-show-content')

/**
 * Przycisk „Wróć” na stronie warsztatu miał przed CMS spację po etykiecie (" Wróć </a>"),
 * a w polityce prywatności nie. Zachowujemy identyczny HTML: WorkshopView ustawia true.
 */
export const BACK_LINK_TRAILING_SPACE: InjectionKey<boolean> = Symbol('back-link-trailing-space')
