/**
 * Tokeny CMS → treść app/assets/css/tokens.css. Czysty moduł bez Node API:
 * używa go scripts/cms-tokens.mjs (lokalnie i w CI) i Worker CMS (commit przy wypchnięciu).
 */
/** Ta sama reguła co isSafeTokenValue w @demrise/cms-core: wartość nie wychodzi poza deklarację. */
const hasControlChars = value => [...value].some((ch) => {
  const code = ch.charCodeAt(0)
  return code < 32 || code === 127
})
const isSafeValue = value => typeof value === 'string' && value.trim() !== ''
  && !hasControlChars(value) && !/[;{}<>\\]/.test(value) && !value.includes('/*')

export function generateTokensCss(tokens, map) {
  const out = ['/* Wygenerowane przez scripts/cms-tokens.mjs z tokenów CMS (content/published.json). Nie edytuj ręcznie. */']
  for (const rule of map.rules) {
    const decls = rule.vars.map(([group, name, cssVar]) => {
      const value = tokens?.[group]?.[name]?.value
      if (!isSafeValue(value)) throw new Error(`Brak albo niedozwolona wartość tokenu ${group}.${name}`)
      return `${cssVar}: ${value.trim()};`
    })
    if (rule.media) {
      out.push(`\n@media ${rule.media} {\n  ${rule.selector} {\n${decls.map(d => `    ${d}`).join('\n')}\n  }\n}`)
    }
    else {
      out.push(`\n${rule.selector} {\n${decls.map(d => `  ${d}`).join('\n')}\n}`)
    }
  }
  return `${out.join('\n')}\n`
}
