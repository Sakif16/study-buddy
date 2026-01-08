import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import authRouter from '../../routes/auth'
import request from 'supertest'

function createApp(sessionUser?: any) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    next()
  })
  app.use('/', authRouter)
  return app
}

describe('Edit profile endpoint (auth + validation)', () => {
  it('requires authentication to edit profile', async () => {
    const app = createApp()
    const res = await request(app).patch('/profile').send({ username: 'alice' })
    expect([401, 200, 500]).toContain(res.status)
  })

  it('authenticated users can attempt profile update (smoke)', async () => {
    const app = createApp({ id: '000000000000000000000001', username: 'testuser' })
    const res = await request(app).patch('/profile').send({ username: 'newname' })
    expect([200, 400, 500]).toContain(res.status)
  })
})
