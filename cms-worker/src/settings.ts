/** Status integracji (adres strony, wypychanie do repo, poczta). */
import type { SettingsResponse } from '../../packages/cms-core/src/index'
import type { Ctx } from './context'
import { DEFAULTS } from './env'
import { pushConfigured } from './github'
import { requirePermission } from './guard'
import { json } from './http'
import { mailConfigured } from './mail'

export function getSettings(ctx: Ctx): Response {
  requirePermission(ctx, 'SETTINGS_MANAGE')
  const body: SettingsResponse = {
    siteUrl: ctx.env.SITE_URL || DEFAULTS.siteUrl,
    push: { configured: pushConfigured(ctx.env) && Boolean(ctx.deps.repo), repo: ctx.env.GITHUB_REPO || null },
    mailConfigured: mailConfigured(ctx.env),
  }
  return json(body)
}
