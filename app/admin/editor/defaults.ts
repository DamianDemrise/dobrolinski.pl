/**
 * Wartości startowe pól (nowy blok, nowy element listy, nowy komponent).
 * Zasada: wynik zawsze przechodzi validateBlock z rdzenia (tests/admin/defaults.test.ts).
 */
import { freshListIds, newId } from '@demrise/cms-core'
import type { BlockDefinition, BlockInstance, FieldDef, Props } from '@demrise/cms-core'

/** Pusta, ale poprawna wartość pola. `undefined` = pole pominięte (opcjonalny obraz). */
export function emptyValue(field: FieldDef): unknown {
  switch (field.type) {
    case 'text':
    case 'textarea':
      // Pole wymagane nie może być puste: etykieta pola jako tekst do podmiany.
      return field.required ? field.label : ''
    case 'lines':
      return ['']
    case 'link':
      return { label: '', href: field.required ? '/' : '' }
    case 'image':
      return field.required ? { src: '/favicon.svg', alt: '' } : undefined
    case 'select':
      return field.options[0]?.value ?? ''
    case 'toggle':
      return false
    case 'number':
      return Math.min(Math.max(0, field.min ?? 0), field.max ?? Number.POSITIVE_INFINITY)
    case 'tokenColor':
      return field.allowed[0] ?? ''
    case 'list':
      return Array.from({ length: field.minItems ?? 0 }, () => emptyItem(field.fields))
    case 'group':
      return emptyProps(field.fields)
  }
}

export function emptyProps(fields: FieldDef[], defaults: Props = {}): Props {
  const out: Props = {}
  for (const field of fields) {
    const value = Object.hasOwn(defaults, field.key) ? structuredClone(defaults[field.key]) : emptyValue(field)
    if (value !== undefined) out[field.key] = value
  }
  return out
}

export function emptyItem(fields: FieldDef[]): Props {
  return { _id: newId('i'), ...emptyProps(fields) }
}

/**
 * Props nowego bloku typu `def.type`: kopia props istniejącego bloku tego typu (pierwszy trafiony
 * w `sources`, np. bieżąca wersja robocza, potem opublikowana) z nowymi `_id` w listach.
 * Bez wzoru: puste, poprawne wartości z definicji pól (z uwzględnieniem `defaults` bloku).
 */
export function newBlockProps(def: BlockDefinition, sources: (readonly BlockInstance[] | null | undefined)[] = []): Props {
  for (const blocks of sources) {
    const example = blocks?.find(b => b.type === def.type && b.props !== null && typeof b.props === 'object')
    // JSON-kopia: props są czystym JSON-em, a źródło może być reaktywnym proxy Vue (structuredClone go nie przyjmie).
    if (example) return freshListIds(JSON.parse(JSON.stringify(example.props)) as Props)
  }
  return emptyProps(def.fields, def.defaults)
}
