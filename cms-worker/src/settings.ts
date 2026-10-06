/** Status integracji i ręczny rebuild. */
import type { SettingsResponse } from '../../packages/cms-core/src/index'
import { audit } from './audit'
import { currentUser, type Ctx } from './context'
import { DEFAULTS } from './env'
import { rebuildConfigured, triggerRebuild } from './github'
import { requirePermission } from './guard'
import { json } from './http'
import { mailConfigured } from './mail'

export function getSettings(ctx: Ctx): Response {
  requirePermission(ctx, 'SETTINGS_MANAGE')
  const body: SettingsResponse = {
    siteUrl: ctx.env.SITE_URL || DEFAULTS.siteUrl,
    rebuild: { configured: rebuildConfigured(ctx.env), repo: ctx.env.GITHUB_REPO || null },
    mailConfigured: mailConfigured(ctx.env),
  }
  return json(body)
}

export async function rebuild(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_PUBLISH')
  const status = await triggerRebuild(ctx.env, ctx.deps.fetch)
  await audit(ctx, 'rebuild', currentUser(ctx).id, null, { status })
  return json({ rebuild: status })
}
