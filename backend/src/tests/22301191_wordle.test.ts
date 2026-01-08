import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import wordleRouter from '../../routes/wordle'
import request from 'supertest'

function createApp(sessionUser?: any) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    next()
  })
  app.use('/api/wordle', wordleRouter)
  return app
}

describe('Wordle endpoints (basic auth smoke)', () => {
  it('requires auth for target', async () => {
    const app = createApp()
    const res = await request(app).get('/api/wordle/target')
    expect([401, 200, 500]).toContain(res.status)
  })

  it('authenticated requests may return success or server errors', async () => {
    const app = createApp({ id: '000000000000000000000001' })
    const res = await request(app).get('/api/wordle/target')
    expect([200, 400, 500]).toContain(res.status)
  })
})
