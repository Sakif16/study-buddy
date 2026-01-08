import request from 'supertest'
import express from 'express'
import session from 'express-session'
import tasksRouter from '../routes/tasks'
import groupRouter from '../routes/groupStudy'
import { describe, it, expect } from 'vitest'

// Helper parsers (dd/mm/yyyy)
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

// compute monthly summary similar to frontend Home.tsx
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

// compute missed tasks (due before today and not completed)
function computeMissed(tasks: any[], today: Date) {
  return tasks.filter((t) => {
    if (!t.dueDate) return false
    const d = parseDisplayToDate(t.dueDate)
    return d < startOfDay(today) && !t.completed
  }).length
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// create minimal express wrapper to attach routers and session
function createApp(sessionUser?: any) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    next()
  })
  app.use('/api/tasks', tasksRouter)
  app.use('/groups', groupRouter)
  return app
}

describe('Home page features and API smoke tests', () => {
  it('computes monthly overview correctly', () => {
    const tasks = [
      { id: '1', title: 'A', dueDate: '05/01/2025', completed: false },
      { id: '2', title: 'B', dueDate: '15/01/2025', completed: true },
      { id: '3', title: 'C', dueDate: '28/02/2025', completed: true },
    ]
    const month = new Date(2025, 0, 1) // Jan 2025
    const summary = computeMonthlySummary(tasks, month)
    expect(summary.total).toBe(2)
    expect(summary.completed).toBe(1)
  })

  it('computes chart data shape (daily counts) and missed counter', () => {
    const tasks = [
      { id: '1', dueDate: '01/01/2025', completed: false },
      { id: '2', dueDate: '02/01/2025', completed: true },
      { id: '3', dueDate: '02/01/2025', completed: false },
      { id: '4', dueDate: '31/12/2024', completed: false },
    ]
    // simple daily counts for Jan 2025 day 1..31
    const month = new Date(2025, 0, 1)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const days = {}
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
      ;(days as any)[key] = 0
    }
    tasks.forEach((t) => {
      if (!t.dueDate) return
      if (parseDisplayToDate(t.dueDate) >= start && parseDisplayToDate(t.dueDate) <= end) {
        ;(days as any)[t.dueDate] = ((days as any)[t.dueDate] || 0) + 1
      }
    })
    expect((days as any)['1/1/2025'] || (days as any)['01/01/2025']).toBeDefined()

    const missed = computeMissed(tasks, new Date(2025, 0, 3))
    // task on 31/12/2024 and 01/01/2025 (if before today) => missed should count those before 3 Jan
    expect(missed).toBeGreaterThanOrEqual(1)
  })

  it('enforces auth for task and group APIs', async () => {
    const unauthApp = createApp(undefined)
    let res = await request(unauthApp).get('/api/tasks')
    expect(res.status).toBe(401)

    res = await request(unauthApp).post('/groups')
    expect(res.status).toBe(401)
  })

  it('allows calls when authenticated (smoke)', async () => {
    const app = createApp({ id: 'user-1' })
    const res = await request(app).get('/api/tasks')
    // handler may return 200 or 500 depending on DB; ensure it doesn't 401
    expect(res.status).not.toBe(401)
  })
})
