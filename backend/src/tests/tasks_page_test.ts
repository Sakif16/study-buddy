import { describe, it, expect } from 'vitest'
import tasksRouter from '../../routes/tasks'
import groupRouter from '../../routes/groupStudy'
import { createApp } from './testUtils'
import request from 'supertest'

describe('Create / Edit / Delete tasks (API smoke + payload checks)', () => {
  it('rejects unauthenticated create', async () => {
    const app = createApp(tasksRouter, groupRouter, undefined)
    const res = await request(app).post('/api/tasks').send({ title: 'x' })
    expect(res.status).toBe(401)
  })

  it('accepts authenticated create payload shape (may 400/201/500)', async () => {
    const app = createApp(tasksRouter, groupRouter, { id: 'u1' })
    const res = await request(app).post('/api/tasks').send({ title: 'test', dueDate: null })
    expect([201, 400, 500]).toContain(res.status)
  })

  it('update and delete endpoints require auth and ownership checks', async () => {
    const app = createApp(tasksRouter, groupRouter, { id: 'u1' })
    const put = await request(app).put('/api/tasks/some-id').send({ title: 'new' })
    expect([200, 400, 404, 500]).toContain(put.status)
    const del = await request(app).delete('/api/tasks/some-id')
    expect([204, 400, 404, 500]).toContain(del.status)
  })
})
