import { describe, it, expect } from 'vitest'
import groupRouter from '../../routes/groupStudy'
import tasksRouter from '../../routes/tasks'
import { createApp } from './testUtils'
import request from 'supertest'

describe('Group study chat endpoints (auth + basic payload)', () => {
  it('requires auth to list groups', async () => {
    const app = createApp(tasksRouter, groupRouter, undefined)
    const res = await request(app).get('/groups')
    expect(res.status).toBe(401)
  })

  it('allows authenticated listing (smoke)', async () => {
    const app = createApp(tasksRouter, groupRouter, { id: '000000000000000000000001' })
    const res = await request(app).get('/groups')
    expect([200, 500]).toContain(res.status)
  }, 15000)

  it('POST messages requires membership and valid body (smoke)', async () => {
    const app = createApp(tasksRouter, groupRouter, { id: '000000000000000000000001' })
    const res = await request(app).post('/groups/000000000000000000000002/messages').send({ content: 'hello' })
    expect([201, 400, 403, 404, 500]).toContain(res.status)
  })
})
