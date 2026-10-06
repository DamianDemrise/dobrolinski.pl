/** Typy dla scripts/tokens-css.mjs (import z Workera w TypeScript). */
export interface TokensCssMap { rules: { selector: string, media?: string, vars: [string, string, string][] }[] }
export function generateTokensCss(tokens: unknown, map: TokensCssMap): string
