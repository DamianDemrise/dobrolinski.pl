/** Repo GitHub w pamięci: Contents API (odczyt), Git Data API (commit) i lista uruchomień workflow. */
import { createHash } from 'node:crypto'

type Files = Map<string, Buffer>

export const blobSha = (data: Buffer) => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest('hex')

export function fakeGithub(initial: Record<string, string>, repo = 'owner/repo') {
  const commits = new Map<string, { files: Files, message: string, parent: string | null }>()
  const trees = new Map<string, Files>()
  const blobs = new Map<string, Buffer>()
  let n = 0
  const id = (p: string) => `${p}${(++n).toString(16).padStart(8, '0')}`
  let head = id('c')
  commits.set(head, { files: new Map(Object.entries(initial).map(([k, v]) => [k, Buffer.from(v)])), message: 'init', parent: null })
  const runs: unknown[] = []
  const calls: { method: string, path: string }[] = []
  let failNext: number | null = null

  const prefix = `https://api.github.com/repos/${repo}`
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.href.slice(prefix.length).split('?')[0]!
    const method = init?.method ?? 'GET'
    calls.push({ method, path })
    if (failNext) {
      const status = failNext
      failNext = null
      return new Response('{}', { status })
    }
    const body = init?.body ? JSON.parse(String(init.body)) : null
    let m: RegExpExecArray | null
    if (method === 'GET' && (m = /^\/contents\/(.+)$/.exec(path))) {
      const ref = url.searchParams.get('ref') ?? 'main'
      const files = commits.get(ref === 'main' ? head : ref)?.files
      const data = files?.get(m[1]!)
      if (!data) return new Response('{}', { status: 404 })
      return Response.json({ sha: blobSha(data), content: data.toString('base64'), encoding: 'base64' })
    }
    if (method === 'GET' && path === '/git/ref/heads/main') return Response.json({ object: { sha: head } })
    if (method === 'GET' && (m = /^\/git\/commits\/(\w+)$/.exec(path))) {
      if (!commits.has(m[1]!)) return new Response('{}', { status: 404 })
      return Response.json({ tree: { sha: `tree:${m[1]}` } })
    }
    if (method === 'POST' && path === '/git/blobs') {
      const data = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8')
      const sha = blobSha(data)
      blobs.set(sha, data)
      return Response.json({ sha }, { status: 201 })
    }
    if (method === 'POST' && path === '/git/trees') {
      const base = commits.get(String(body.base_tree).replace('tree:', ''))!.files
      const files = new Map(base)
      for (const entry of body.tree) files.set(entry.path, blobs.get(entry.sha)!)
      const sha = id('t')
      trees.set(sha, files)
      return Response.json({ sha }, { status: 201 })
    }
    if (method === 'POST' && path === '/git/commits') {
      const sha = id('c')
      commits.set(sha, { files: trees.get(body.tree)!, message: body.message, parent: body.parents[0] })
      return Response.json({ sha, html_url: `https://github.com/${repo}/commit/${sha}` }, { status: 201 })
    }
    if (method === 'PATCH' && path === '/git/refs/heads/main') {
      if (commits.get(body.sha)?.parent !== head) return new Response('{}', { status: 422 })
      head = body.sha
      return Response.json({ object: { sha: head } })
    }
    if (method === 'GET' && path === '/actions/workflows/deploy.yml/runs') return Response.json({ workflow_runs: runs })
    return new Response('{}', { status: 404 })
  }) as typeof globalThis.fetch

  return {
    fetch,
    calls,
    runs,
    /** Zmiana w repo „z zewnątrz” (np. commit w kodzie). */
    commit(path: string, text: string, message = 'kod') {
      const files = new Map(commits.get(head)!.files)
      files.set(path, Buffer.from(text))
      const sha = id('c')
      commits.set(sha, { files, message, parent: head })
      head = sha
    },
    file: (path: string) => commits.get(head)!.files.get(path)?.toString('utf8') ?? null,
    head: () => commits.get(head)!,
    commitCount: () => commits.size,
    failOnce: (status: number) => { failNext = status },
  }
}
