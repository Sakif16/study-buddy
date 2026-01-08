import { describe, it, expect } from 'vitest'
import tasksRouter from '../../routes/tasks'
import groupRouter from '../../routes/groupStudy'
import { createApp } from './testUtils'
import request from 'supertest'

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

function computeMonthlySummary(tasks: any[], currentMonth: Date) {
  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)
  const inMonth = tasks.filter((t) => {
    const dd = t.dueDate ? parseDisplayToDate(t.dueDate) : null
    return dd && dd >= start && dd <= end
  })
  const total = inMonth.length
  const completed = inMonth.filter((t) => t.completed).length
  return { total, completed }
}

describe('Monthly overview (logic + API smoke)', () => {
  it('computes month totals and completed correctly', () => {
    const tasks = [
      { id: '1', dueDate: '05/01/2026', completed: false },
      { id: '2', dueDate: '20/01/2026', completed: true },
    ]
    const summary = computeMonthlySummary(tasks, new Date(2026, 0, 1))
    expect(summary.total).toBe(2)
    expect(summary.completed).toBe(1)
  })

  it('tasks endpoint requires auth (smoke)', async () => {
    const app = createApp(tasksRouter, groupRouter, undefined)
    const res = await request(app).get('/api/tasks')
    expect(res.status).toBe(401)
  })
})
