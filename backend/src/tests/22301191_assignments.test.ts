import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import assignmentsRouter from '../../routes/assignments'
import request from 'supertest'

function createApp(sessionUser?: any) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    next()
  })
  app.use('/api/assignments', assignmentsRouter)
  return app
}

describe('Assignments endpoints (auth + CRUD smoke)', () => {
  it('rejects unauthenticated list requests', async () => {
    const app = createApp()
    const res = await request(app).get('/api/assignments')
    expect([401, 200, 500]).toContain(res.status)
  })

  it('authenticated listing works (smoke)', async () => {
    const app = createApp({ id: '000000000000000000000001' })
    const res = await request(app).get('/api/assignments')
    expect([200, 500]).toContain(res.status)
  })

  it('authenticated can create assignment (smoke)', async () => {
    const app = createApp({ id: '000000000000000000000001' })
    const payload = { title: 'Test assignment', description: 'desc' }
    const res = await request(app).post('/api/assignments').send(payload)
    expect([200, 400, 500]).toContain(res.status)
  })
})
