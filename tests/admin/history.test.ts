import { describe, expect, it } from 'vitest'
import { EditHistory } from '../../app/admin/editor/history'

function clock() {
  let t = 0
  return { now: () => t, tick: (ms: number) => { t += ms } }
}

describe('EditHistory', () => {
  it('undo/redo przechodzi po stanach i czyści redo po nowej zmianie', () => {
    const h = new EditHistory('a')
    h.push('b')
    h.push('c')
    expect(h.undo()).toBe('b')
    expect(h.undo()).toBe('a')
    expect(h.undo()).toBeUndefined()
    expect(h.redo()).toBe('b')
    h.push('x')
    expect(h.canRedo).toBe(false)
    expect(h.present).toBe('x')
    expect(h.undo()).toBe('b')
  })

  it('łączy kolejne zmiany tego samego pola w oknie czasu w jeden krok', () => {
    const c = clock()
    const h = new EditHistory('', { coalesceMs: 1000, now: c.now })
    h.push('A', 'lead')
    c.tick(200)
    h.push('Al', 'lead')
    c.tick(200)
    h.push('Ala', 'lead')
    expect(h.size.past).toBe(1)
    expect(h.undo()).toBe('')
  })

  it('nie łączy po przerwie, innym polu ani po breakCoalescing', () => {
    const c = clock()
    const h = new EditHistory('0', { coalesceMs: 1000, now: c.now })
    h.push('1', 'a')
    c.tick(1500)
    h.push('2', 'a')
    h.push('3', 'b')
    h.breakCoalescing()
    h.push('4', 'b')
    h.push('5')
    h.push('6')
    expect(h.size.past).toBe(6)
  })

  it('nie łączy zaraz po undo (cofnięcie zamyka krok)', () => {
    const h = new EditHistory('0', { coalesceMs: 10_000 })
    h.push('1', 'a')
    h.push('2', 'b')
    h.undo()
    h.push('1b', 'a')
    expect(h.size.past).toBe(2)
    expect(h.undo()).toBe('1')
  })

  it('trzyma najwyżej `limit` kroków wstecz', () => {
    const h = new EditHistory(0, { limit: 100 })
    for (let i = 1; i <= 150; i++) h.push(i)
    expect(h.size.past).toBe(100)
    let last: number | undefined
    let steps = 0
    for (let v = h.undo(); v !== undefined; v = h.undo()) {
      last = v
      steps++
    }
    expect(steps).toBe(100)
    expect(last).toBe(50)
  })

  it('reset zastępuje stan i czyści historię', () => {
    const h = new EditHistory('a')
    h.push('b')
    h.reset('z')
    expect(h.present).toBe('z')
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
  })
})
