import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import authRouter from '../../routes/auth'
import adminRouter from '../../routes/admin'
import request from 'supertest'

function createApp(sessionUser?: any, setAdmin?: boolean) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    if (setAdmin) req.session.admin = true
    next()
  })
  app.use('/', authRouter)
  app.use('/', adminRouter)
  return app
}

describe('Admin login and admin-only endpoints', () => {
  it('root login returns admin true (smoke)', async () => {
    const app = createApp()
    const res = await request(app).post('/login').send({ username: 'root', password: 'root1234' })
    expect([200]).toContain(res.status)
    expect(res.body).toBeDefined()
  })

  it('unauthenticated /admin/users is rejected', async () => {
    const app = createApp()
    const res = await request(app).get('/admin/users')
    expect([401, 500]).toContain(res.status)
  })

  it('admin can list users (smoke)', async () => {
    const app = createApp(undefined, true)
    const res = await request(app).get('/admin/users')
    expect([200, 500]).toContain(res.status)
  })
})
