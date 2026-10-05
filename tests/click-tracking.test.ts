import { describe, expect, it } from 'vitest'
import { TRACK_EVENT, trackPayloadFrom } from '../app/utils/clickTracking'

describe('click tracking', () => {
  it('builds a payload from the closest data-track element', () => {
    document.body.innerHTML = `
      <a href="mailto:damian@dobrolinski.pl" data-track="email_click" data-track-place="home">
        <span id="inner">mail</span>
      </a>`
    expect(trackPayloadFrom(document.getElementById('inner'))).toEqual({
      event: TRACK_EVENT,
      track_name: 'email_click',
      track_place: 'home',
      link_url: 'mailto:damian@dobrolinski.pl',
    })
  })

  it('ignores clicks outside tracked elements', () => {
    document.body.innerHTML = '<p id="plain">tekst</p>'
    expect(trackPayloadFrom(document.getElementById('plain'))).toBeNull()
    expect(trackPayloadFrom(null)).toBeNull()
  })

  it('keeps an empty place when none is given', () => {
    document.body.innerHTML = '<a href="/poznaj-czlowieka" data-track="open_project">projekt</a>'
    expect(trackPayloadFrom(document.querySelector('a'))?.track_place).toBe('')
  })
})
