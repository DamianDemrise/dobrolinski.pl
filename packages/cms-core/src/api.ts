/** Kontrakt HTTP między panelem a Workerem. */
import type { Permission, Role } from './permissions'
import type { Entity, EntityDataMap, EntityKind, EntityStatus, MediaItem, PublishedSite, Revision, RevisionKind } from './types'

export const CMS_REQUEST_HEADER = 'X-CMS-Request'

export interface ApiError {
  error: string
  message?: string
  issues?: { path: string, message: string }[]
}

export interface CmsUser {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
  lastLoginAt: string | null
}

export interface MeResponse {
  user: CmsUser
  permissions: Permission[]
}

export interface EntitySummary {
  id: string
  kind: EntityKind
  slug: string
  title: string
  status: EntityStatus
  updatedAt: string
  updatedBy: string | null
  publishedAt: string | null
  /** Strony: 'ok' gdy title, description i canonical są wypełnione. */
  seoStatus?: 'ok' | 'incomplete'
}

export interface SaveDraftRequest<K extends EntityKind = EntityKind> {
  baseRev: number
  data: EntityDataMap[K]
}

export interface SaveDraftResponse {
  draftRev: number
  updatedAt: string
}

export interface ConflictResponse extends ApiError {
  error: 'conflict'
  entity: Entity
}

export interface PublishRequest {
  expectedRev: number
}

export type RebuildStatus = 'triggered' | 'manual' | 'failed'

export interface PublishResponse {
  publishedAt: string
  rebuild: RebuildStatus
}

export interface RevisionSummary {
  id: string
  entityId: string
  version: number
  kind: RevisionKind
  createdAt: string
  createdBy: string | null
}

export type { Revision }

export interface MediaUsage {
  entityId: string
  entityTitle: string
  path: string
}

export interface MediaListResponse {
  items: MediaItem[]
}

export interface SettingsResponse {
  siteUrl: string
  rebuild: { configured: boolean, repo: string | null }
  mailConfigured: boolean
}

/** Anonimowy licznik formularzy strony (bez adresów): ostatnie 7 i 30 dni oraz łącznie. */
export interface FormCounts { days7: number, days30: number, total: number }
export interface StatsResponse {
  forms: { offer: FormCounts, ebook: FormCounts }
}

/** Stan wypchnięcia strony publicznej (GitHub Actions) i publikacje, których jeszcze na niej nie ma. */
export interface DeployRun {
  status: 'queued' | 'in_progress' | 'completed' | string
  conclusion: 'success' | 'failure' | 'cancelled' | string | null
  createdAt: string
  url: string
}
export interface DeployResponse {
  /** true, gdy Worker ma GITHUB_TOKEN i może sam uruchomić wypchnięcie. */
  canTrigger: boolean
  lastRun: DeployRun | null
  lastSuccessAt: string | null
  /** Encje opublikowane po starcie ostatniego udanego wypchnięcia (null: stan GitHub nieznany). */
  pending: { id: string, kind: string, title: string, publishedAt: string }[] | null
  actionsUrl: string | null
}

export type PublicSiteResponse = PublishedSite
