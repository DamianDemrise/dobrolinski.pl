/** Rebuild publicznej strony: repository_dispatch do workflow GitHub Pages. */
import type { RebuildStatus } from '../../packages/cms-core/src/index'
import { LIMITS, type Env } from './env'

export const rebuildConfigured = (env: Env) => Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO)

export async function triggerRebuild(env: Env, fetcher: typeof fetch): Promise<RebuildStatus> {
  if (!env.GITHUB_TOKEN) return 'manual'
  if (!env.GITHUB_REPO || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPO)) return 'failed'
  try {
    const response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
      method: 'POST',
      signal: AbortSignal.timeout(LIMITS.providerTimeoutMs),
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'demrise-cms',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'cms-publish' }),
    })
    if (response.ok) return 'triggered'
    console.log(JSON.stringify({ event: 'rebuild', status: 'failed', detail: response.status }))
    return 'failed'
  }
  catch {
    console.log(JSON.stringify({ event: 'rebuild', status: 'failed', detail: 'network' }))
    return 'failed'
  }
}
