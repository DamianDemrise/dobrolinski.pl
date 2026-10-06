/** Mapowanie wierszy D1 na typy kontraktu. */
import { stableStringify } from '../../packages/cms-core/src/index'
import type { Entity, EntityKind, EntityStatus, EntitySummary, MediaItem, PageDocument, Revision, RevisionKind, RevisionSummary } from '../../packages/cms-core/src/index'

export interface EntityRow {
  id: string
  kind: EntityKind
  slug: string
  title: string
  draft_json: string
  draft_rev: number
  published_json: string | null
  published_at: string | null
  published_by: string | null
  updated_at: string
  updated_by: string | null
  last_checkpoint_at: number | null
}

export function toEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    draft: JSON.parse(row.draft_json),
    draftRev: row.draft_rev,
    published: row.published_json === null ? null : JSON.parse(row.published_json),
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  } as Entity
}

export function entityStatus(entity: Entity): EntityStatus {
  if (entity.published === null) return 'draft'
  return stableStringify(entity.draft) === stableStringify(entity.published) ? 'published' : 'changed'
}

export function toSummary(row: EntityRow): EntitySummary {
  const entity = toEntity(row)
  const summary: EntitySummary = {
    id: entity.id,
    kind: entity.kind,
    slug: entity.slug,
    title: entity.title,
    status: entityStatus(entity),
    updatedAt: entity.updatedAt,
    updatedBy: entity.updatedBy,
    publishedAt: entity.publishedAt,
  }
  if (entity.kind === 'page') {
    const seo = (entity.draft as PageDocument).seo
    const filled = (value: unknown) => typeof value === 'string' && value.trim() !== ''
    summary.seoStatus = seo && filled(seo.title) && filled(seo.description) && filled(seo.canonical) ? 'ok' : 'incomplete'
  }
  return summary
}

export interface RevisionRow {
  id: string
  entity_id: string
  version: number
  kind: RevisionKind
  data_json: string
  created_at: string
  created_by: string | null
}

export const toRevisionSummary = (row: Omit<RevisionRow, 'data_json'>): RevisionSummary => ({
  id: row.id,
  entityId: row.entity_id,
  version: row.version,
  kind: row.kind,
  createdAt: row.created_at,
  createdBy: row.created_by,
})

export const toRevision = (row: RevisionRow): Revision => ({ ...toRevisionSummary(row), data: JSON.parse(row.data_json) })

export interface MediaRow {
  id: string
  filename: string
  mime: string
  size: number
  width: number | null
  height: number | null
  alt: string
  created_at: string
  created_by: string | null
  kv_key: string
  updated_at: string | null
  hash: string | null
}

export const mediaUrl = (id: string, filename: string) => `/media/${id}/${filename}`

export const toMediaItem = (row: MediaRow): MediaItem => ({
  id: row.id,
  filename: row.filename,
  mime: row.mime,
  size: row.size,
  width: row.width,
  height: row.height,
  alt: row.alt,
  createdAt: row.created_at,
  createdBy: row.created_by,
  url: mediaUrl(row.id, row.filename),
})
