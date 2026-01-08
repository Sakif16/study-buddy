import { describe, it, expect } from 'vitest'

function parseDisplayToDate(str: string) {
  const [day, month, year] = str.split('/').map(Number)
  return new Date(year, month - 1, day)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function computeMissed(tasks: any[], today: Date) {
  return tasks.filter((t) => {
    if (!t.dueDate) return false
    const d = parseDisplayToDate(t.dueDate)
    return d < startOfDay(today) && !t.completed
  }).length
}

describe('Missed task counter', () => {
  it('counts tasks due before today and not completed', () => {
    const tasks = [
      { id: '1', dueDate: '01/01/2026', completed: false },
      { id: '2', dueDate: '02/01/2026', completed: true },
      { id: '3', dueDate: '31/12/2025', completed: false },
    ]
    const missed = computeMissed(tasks, new Date(2026, 0, 3))
    expect(missed).toBe(2)
  })
})
