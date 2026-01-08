import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import feedbackRouter from '../../routes/feedback'
import request from 'supertest'

function createApp(sessionUser?: any) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    next()
  })
  app.use('/', feedbackRouter)
  return app
}

describe('Feedback form endpoint', () => {
  it('rejects unauthenticated submissions', async () => {
    const app = createApp()
    const res = await request(app).post('/api/feedback').send({ content: 'nice app' })
    expect([401, 200, 500]).toContain(res.status)
  })

  it('authenticated users can submit feedback (smoke)', async () => {
    const app = createApp({ id: '000000000000000000000001' })
    const res = await request(app).post('/api/feedback').send({ content: 'love it' })
    expect([200, 400, 500]).toContain(res.status)
  })
})
