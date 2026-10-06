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

/** Publikacja zapisuje w CMS; na stronę trafia po wypchnięciu (POST /api/push). */
export interface PublishResponse {
  publishedAt: string
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
  /** Wypychanie = commit w repo (GITHUB_TOKEN). */
  push: { configured: boolean, repo: string | null }
  mailConfigured: boolean
}

/** Anonimowy licznik formularzy strony (bez adresów): ostatnie 7 i 30 dni oraz łącznie. */
export interface FormCounts { days7: number, days30: number, total: number }
export interface StatsResponse {
  forms: { offer: FormCounts, ebook: FormCounts }
}

/** Stan wypchnięcia strony publicznej (GitHub Actions). */
export interface DeployRun {
  status: 'queued' | 'in_progress' | 'completed' | string
  conclusion: 'success' | 'failure' | 'cancelled' | string | null
  createdAt: string
  url: string
}

/** Klucz treści w snapshot: page:<slug>, global:<klucz>, component:<id>, tokens. */
export type SyncKey = string

/** Zmiana i w repo, i w panelu od ostatniej synchronizacji: rozstrzyga człowiek. */
export interface SyncConflict {
  key: SyncKey
  title: string
  detectedAt: string
}

export interface PendingChange {
  key: SyncKey
  title: string
  /** added: nowa na stronie, changed: zmieniona, removed: zniknie ze strony. */
  change: 'added' | 'changed' | 'removed'
}

export interface DeployResponse {
  /** true, gdy Worker ma GITHUB_TOKEN i może zrobić commit (wypchnięcie). */
  canPush: boolean
  lastRun: DeployRun | null
  /** Opublikowane w CMS, a jeszcze nie w repo (null: repo chwilowo nieosiągalne). */
  pending: PendingChange[] | null
  conflicts: SyncConflict[]
  syncedAt: string | null
  repoUrl: string | null
}

export type PushResponse =
  | { status: 'pushed', commitUrl: string, changes: PendingChange[] }
  | { status: 'up_to_date' }

export type SyncPullResponse = { status: 'imported', applied: SyncKey[], conflicts: SyncKey[] } | { status: 'up_to_date' } | { status: 'initialized' }

export type ResolveChoice = 'repo' | 'cms'

export type PublicSiteResponse = PublishedSite
