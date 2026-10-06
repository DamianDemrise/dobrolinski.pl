import { describe, expect, it } from 'vitest'
import { formEventName } from '../app/utils/clickTracking'

describe('zdarzenia formularzy w GA4', () => {
  it('oferta zachowuje dotychczasowe nazwy, ebook ma własne', () => {
    expect(['view', 'submit', 'success', 'error'].map(step => formEventName('offer', step as never)))
      .toEqual(['offer_form_view', 'offer_form_submit', 'offer_form_success', 'offer_form_error'])
    expect(formEventName('ebook', 'success')).toBe('ebook_form_success')
  })
})
