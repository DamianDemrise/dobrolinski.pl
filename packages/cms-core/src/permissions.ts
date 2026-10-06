/** Uprawnienia i role. Backend sprawdza je zawsze; UI tylko ukrywa niedostępne akcje. */

export const PERMISSIONS = [
  'CONTENT_EDIT',
  'CONTENT_PUBLISH',
  'MEDIA_UPLOAD',
  'MEDIA_DELETE',
  'SEO_EDIT',
  'DESIGN_EDIT',
  'COMPONENT_EDIT',
  'USERS_MANAGE',
  'SETTINGS_MANAGE',
  'MODE_ADVANCED',
  'MODE_DEVELOPER',
] as const

export type Permission = typeof PERMISSIONS[number]

export const ROLES = ['owner', 'editor', 'content_editor', 'developer'] as const
export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Właściciel',
  editor: 'Redaktor',
  content_editor: 'Edytor treści',
  developer: 'DEMRISE Developer',
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [
    'CONTENT_EDIT', 'CONTENT_PUBLISH', 'MEDIA_UPLOAD', 'MEDIA_DELETE', 'SEO_EDIT',
    'DESIGN_EDIT', 'COMPONENT_EDIT', 'USERS_MANAGE', 'SETTINGS_MANAGE', 'MODE_ADVANCED',
  ],
  editor: ['CONTENT_EDIT', 'CONTENT_PUBLISH', 'MEDIA_UPLOAD', 'MEDIA_DELETE', 'SEO_EDIT', 'MODE_ADVANCED'],
  content_editor: ['CONTENT_EDIT', 'MEDIA_UPLOAD'],
  developer: PERMISSIONS,
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]]
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** Najwyższy tryb edycji dostępny dla roli. */
export function editModeFor(role: Role): 'safe' | 'advanced' | 'developer' {
  if (can(role, 'MODE_DEVELOPER')) return 'developer'
  if (can(role, 'MODE_ADVANCED')) return 'advanced'
  return 'safe'
}
