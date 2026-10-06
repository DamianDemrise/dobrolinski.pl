/** Błąd operacji CMS z kodem maszynowym. Lista kodów: komentarz na górze `document.ts`. */
export class CmsError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CmsError'
    this.code = code
  }
}
