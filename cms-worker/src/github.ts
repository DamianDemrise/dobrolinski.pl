/** Rebuild publicznej strony: repository_dispatch do workflow GitHub Pages. */
import type { DeployRun, RebuildStatus } from '../../packages/cms-core/src/index'
import { LIMITS, type Env } from './env'

export const rebuildConfigured = (env: Env) => Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO)
const validRepo = (repo: string | undefined): repo is string => Boolean(repo && /^[\w.-]+\/[\w.-]+$/.test(repo))
/** Workflow, który buduje i wypycha stronę publiczną. */
export const DEPLOY_WORKFLOW = 'deploy.yml'

export const actionsUrl = (env: Env) => (validRepo(env.GITHUB_REPO) ? `https://github.com/${env.GITHUB_REPO}/actions/workflows/${DEPLOY_WORKFLOW}` : null)

/** Przebudowa po publikacji tylko, gdy wprost włączona (domyślnie wypychamy ręcznie przyciskiem). */
export const rebuildOnPublish = (env: Env) => env.REBUILD_ON_PUBLISH === '1'

interface GithubRun { status: string, conclusion: string | null, created_at: string, html_url: string }

/**
 * Ostatnie uruchomienie workflow wypchnięcia (opcjonalnie tylko udane). Repo jest publiczne,
 * więc działa też bez tokenu (z tokenem wyższy limit API). null: brak danych albo błąd GitHuba.
 */
export async function lastDeployRun(env: Env, fetcher: typeof fetch, onlySuccess = false): Promise<DeployRun | null | 'error'> {
  if (!validRepo(env.GITHUB_REPO)) return 'error'
  const query = `branch=main&per_page=1${onlySuccess ? '&status=success' : ''}`
  try {
    const response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${DEPLOY_WORKFLOW}/runs?${query}`, {
      signal: AbortSignal.timeout(LIMITS.providerTimeoutMs),
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'demrise-cms',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!response.ok) return 'error'
    const data = await response.json() as { workflow_runs?: GithubRun[] }
    const run = data.workflow_runs?.[0]
    if (!run) return null
    return { status: run.status, conclusion: run.conclusion, createdAt: run.created_at, url: run.html_url }
  }
  catch {
    return 'error'
  }
}

export async function triggerRebuild(env: Env, fetcher: typeof fetch): Promise<RebuildStatus> {
  if (!env.GITHUB_TOKEN) return 'manual'
  if (!validRepo(env.GITHUB_REPO)) return 'failed'
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
