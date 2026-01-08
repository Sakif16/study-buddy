import { describe, it, expect } from 'vitest'

function parseDisplayToDate(str: string) {
  const [day, month, year] = str.split('/').map(Number)
  return new Date(year, month - 1, day)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

describe('Charts & statistics (derived from tasks)', () => {
  it('computes daily counts for a month', () => {
    const tasks = [
      { id: '1', dueDate: '01/01/2026' },
      { id: '2', dueDate: '01/01/2026' },
      { id: '3', dueDate: '05/01/2026' },
    ]
    const month = new Date(2026, 0, 1)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const counts: Record<string, number> = {}
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      counts[key] = 0
    }
    tasks.forEach((t) => {
      if (!t.dueDate) return
      if (parseDisplayToDate(t.dueDate) >= start && parseDisplayToDate(t.dueDate) <= end) {
        counts[t.dueDate] = (counts[t.dueDate] || 0) + 1
      }
    })
    expect(counts['01/01/2026']).toBe(2)
    expect(counts['05/01/2026']).toBe(1)
  })
})
