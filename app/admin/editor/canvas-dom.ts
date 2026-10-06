/**
 * Strona canvasu (iframe): zaznaczanie, obrys, edycja tekstu w miejscu (contenteditable)
 * i blokada nawigacji. Komunikacja z edytorem tylko przez `post` (FrameMessage).
 */
import type { CanvasTarget, FrameMessage, FrameState } from './protocol'
import { sameTarget } from './protocol'
import { siteSchema as schema } from '~~/cms/schema'
import { inlineEditable, resolveTarget } from './targets'

const FIELD = '[data-cms-field]'
const ROOT = '[data-cms-block-root]'

export function targetOf(el: Element): CanvasTarget | null {
  const field = el.closest<HTMLElement>(FIELD)
  if (field) {
    const path = field.dataset.cmsField ?? ''
    if (field.dataset.cmsGlobal) return { kind: 'global', global: field.dataset.cmsGlobal, field: path }
    if (field.dataset.cmsBlock) {
      const t: CanvasTarget = { kind: 'block', blockId: field.dataset.cmsBlock, field: path }
      if (field.dataset.cmsGlobalRef) t.globalRef = field.dataset.cmsGlobalRef
      return t
    }
  }
  const root = el.closest<HTMLElement>(ROOT)
  if (root?.dataset.cmsBlockRoot) return { kind: 'block', blockId: root.dataset.cmsBlockRoot }
  return null
}

function selectorFor(target: CanvasTarget): string {
  const esc = (v: string) => CSS.escape(v)
  if (target.kind === 'global') return `[data-cms-global="${esc(target.global)}"][data-cms-field="${esc(target.field)}"]`
  if (target.field) return `[data-cms-block="${esc(target.blockId)}"][data-cms-field="${esc(target.field)}"]`
  return `[data-cms-block-root="${esc(target.blockId)}"]`
}

export const elementsFor = (target: CanvasTarget): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(selectorFor(target))]

/**
 * Elementy do obrysu zaznaczenia. Pole bez własnego elementu (np. lista 'items', której elementy
 * mają ścieżki 'items.0.line') → elementy podpól; gdy i tych nie ma → korzeń bloku.
 */
export function selectionElements(target: CanvasTarget): HTMLElement[] {
  const exact = elementsFor(target)
  if (exact.length || !('field' in target) || !target.field) return exact
  const esc = (v: string) => CSS.escape(v)
  const owner = target.kind === 'global' ? `[data-cms-global="${esc(target.global)}"]` : `[data-cms-block="${esc(target.blockId)}"]`
  const nested = [...document.querySelectorAll<HTMLElement>(`${owner}[data-cms-field^="${esc(`${target.field}.`)}"]`)]
  if (nested.length || target.kind === 'global') return nested
  return elementsFor({ kind: 'block', blockId: target.blockId })
}

interface ActiveEdit {
  el: HTMLElement
  target: CanvasTarget
  original: string
  multiline: boolean
  /** Węzły i teksty sprzed edycji: po zakończeniu przywracamy DOM, którym zarządza Vue. */
  nodes: { node: Node, text: string | null }[]
  timer: ReturnType<typeof setTimeout> | null
  cleanup: () => void
}

let plaintextOnly: boolean | undefined
function supportsPlaintextOnly(): boolean {
  if (plaintextOnly !== undefined) return plaintextOnly
  try {
    const probe = document.createElement('div')
    probe.contentEditable = 'plaintext-only'
    plaintextOnly = probe.contentEditable === 'plaintext-only'
  }
  catch {
    plaintextOnly = false
  }
  return plaintextOnly
}

export function createCanvasController(opts: {
  post: (message: FrameMessage) => void
  getState: () => FrameState | null
  /** Wywoływane po zakończeniu edycji (np. zaległy stan od rodzica). */
  onEditEnd: () => void
}) {
  let hovered: HTMLElement | null = null
  let active: ActiveEdit | null = null

  const isEditing = () => active !== null

  function setHover(el: HTMLElement | null) {
    if (hovered === el) return
    hovered?.removeAttribute('data-cms-hover')
    hovered = el
    hovered?.setAttribute('data-cms-hover', '')
  }

  function onMouseOver(event: MouseEvent) {
    const el = (event.target as Element | null)?.closest<HTMLElement>(`${FIELD}, ${ROOT}`) ?? null
    setHover(el)
  }

  function readValue(edit: ActiveEdit): string {
    const text = edit.multiline ? edit.el.innerText : (edit.el.textContent ?? '')
    return edit.multiline ? text.replace(/\r/g, '').replace(/\n$/, '') : text.replace(/\s*\n\s*/g, ' ').trimEnd()
  }

  function end(commit: boolean) {
    const edit = active
    if (!edit) return
    active = null
    if (edit.timer) clearTimeout(edit.timer)
    edit.cleanup()
    const value = commit ? readValue(edit) : edit.original
    edit.el.removeAttribute('contenteditable')
    edit.el.removeAttribute('data-cms-editing')
    for (const { node, text } of edit.nodes) if (text !== null) node.nodeValue = text
    edit.el.replaceChildren(...edit.nodes.map(n => n.node))
    opts.post({ type: 'cms:input', target: edit.target, value, commit: true })
    opts.onEditEnd()
  }

  function placeCaret(el: HTMLElement, event: MouseEvent) {
    const selection = window.getSelection()
    if (!selection) return
    const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null, caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node, offset: number } | null }
    let range: Range | null = null
    const pos = doc.caretPositionFromPoint?.(event.clientX, event.clientY)
    if (pos && el.contains(pos.offsetNode)) {
      range = document.createRange()
      range.setStart(pos.offsetNode, pos.offset)
    }
    else {
      const r = doc.caretRangeFromPoint?.(event.clientX, event.clientY)
      if (r && el.contains(r.startContainer)) range = r
    }
    if (!range) {
      range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
    }
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function begin(el: HTMLElement, target: CanvasTarget, original: string, multiline: boolean, event: MouseEvent) {
    const edit: ActiveEdit = {
      el,
      target,
      original,
      multiline,
      nodes: [...el.childNodes].map(node => ({ node, text: node.nodeType === Node.TEXT_NODE ? node.nodeValue : null })),
      timer: null,
      cleanup: () => {},
    }
    const onInput = () => {
      if (edit.timer) clearTimeout(edit.timer)
      edit.timer = setTimeout(() => opts.post({ type: 'cms:input', target, value: readValue(edit), commit: false }), 250)
    }
    // Esc obsługuje onKeydown (faza capture na window), tu tylko Enter.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault()
        end(true)
      }
    }
    // Enter jako zdarzenie edycji (np. klawiatury ekranowe): w polu jednoliniowym zatwierdza.
    const onBeforeInput = (e: InputEvent) => {
      if (!multiline && (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak')) {
        e.preventDefault()
        end(true)
      }
    }
    const onBlur = () => end(true)
    const onPaste = (e: ClipboardEvent) => {
      if (supportsPlaintextOnly()) return
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain') ?? ''
      document.execCommand('insertText', false, multiline ? text : text.replace(/\s*\n\s*/g, ' '))
    }
    el.addEventListener('input', onInput)
    el.addEventListener('keydown', onKey)
    el.addEventListener('blur', onBlur)
    el.addEventListener('paste', onPaste)
    el.addEventListener('beforeinput', onBeforeInput)
    edit.cleanup = () => {
      el.removeEventListener('input', onInput)
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('blur', onBlur)
      el.removeEventListener('paste', onPaste)
      el.removeEventListener('beforeinput', onBeforeInput)
    }
    active = edit
    el.setAttribute('contenteditable', supportsPlaintextOnly() ? 'plaintext-only' : 'true')
    el.setAttribute('data-cms-editing', '')
    el.focus({ preventScroll: true })
    placeCaret(el, event)
  }

  function onClick(event: MouseEvent) {
    const targetEl = event.target as Element | null
    if (!targetEl) return
    if (active && active.el.contains(targetEl)) return // klik wewnątrz edytowanego tekstu: kursor
    // W edytorze linki, przyciski i formularze nie działają.
    event.preventDefault()
    event.stopPropagation()
    if (active) end(true)
    const target = targetOf(targetEl)
    if (!target) return
    opts.post({ type: 'cms:select', target })
    // Obrys od razu (stan od rodzica może przyjść dopiero po zakończeniu edycji tekstu).
    markSelection(target)
    const state = opts.getState()
    if (!state || !('field' in target) || !target.field) return
    const resolved = resolveTarget(target, state.page, state.site, schema, { mode: state.mode, canEdit: state.canEdit })
    if (resolved.field?.type === 'image' && !resolved.lock) {
      opts.post({ type: 'cms:pick-image', target })
      return
    }
    const el = targetEl.closest<HTMLElement>(FIELD)
    if (!el || !inlineEditable(resolved, target.field)) return
    const value = resolved.value as string
    // Edycja w miejscu tylko, gdy element pokazuje dokładnie wartość pola (bez formatowania).
    if ((el.textContent ?? '').trim() !== value.trim() || el.children.length > 0) return
    begin(el, target, value, resolved.field?.type === 'textarea', event)
  }

  function onKeydown(event: KeyboardEvent) {
    // Esc nie może przenieść canvasu na inną stronę (widoki strony nasłuchują Esc).
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (active) {
        event.preventDefault()
        end(false)
      }
      return
    }
    if (active) return
    const mod = event.metaKey || event.ctrlKey
    if (!mod) return
    const key = event.key.toLowerCase()
    if (key === 'z' || key === 'y') {
      event.preventDefault()
      opts.post({ type: 'cms:shortcut', action: key === 'y' || event.shiftKey ? 'redo' : 'undo' })
    }
  }

  const onSubmit = (event: Event) => event.preventDefault()

  /** Obrys zaznaczenia (atrybut, bez zmiany treści DOM: bezpieczne także w trakcie edycji tekstu). */
  function markSelection(selection: CanvasTarget | null) {
    const next = selection ? selectionElements(selection) : []
    document.querySelectorAll<HTMLElement>('[data-cms-selected]').forEach((el) => {
      if (!next.includes(el)) el.removeAttribute('data-cms-selected')
    })
    next.forEach(el => el.setAttribute('data-cms-selected', ''))
  }

  function mark(selection: CanvasTarget | null, page: FrameState['page']) {
    markSelection(selection)
    document.querySelectorAll('[data-cms-hidden]').forEach(el => el.removeAttribute('data-cms-hidden'))
    for (const block of page.blocks) {
      if (block.hidden) elementsFor({ kind: 'block', blockId: block.id }).forEach(el => el.setAttribute('data-cms-hidden', ''))
    }
  }

  function scrollTo(target: CanvasTarget) {
    const el = elementsFor(target)[0] ?? (target.kind === 'block' ? elementsFor({ kind: 'block', blockId: target.blockId })[0] : undefined)
    el?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }

  function install() {
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseleave', () => setHover(null))
    document.addEventListener('click', onClick, true)
    document.addEventListener('auxclick', onClick, true)
    document.addEventListener('submit', onSubmit, true)
    window.addEventListener('keydown', onKeydown, true)
  }

  return { install, isEditing, mark, markSelection, scrollTo, endEdit: end, sameTarget }
}
