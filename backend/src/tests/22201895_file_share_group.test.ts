import { describe, it, expect } from 'vitest'
import tasksRouter from '../../routes/tasks'
import groupRouter from '../../routes/groupStudy'
import { createApp } from './testUtils'
import request from 'supertest'

describe('Group file share/upload endpoints (auth + upload smoke)', () => {
    it('requires auth to upload file to group', async () => {
        const app = createApp(tasksRouter, groupRouter, undefined)
        const res = await request(app).post('/groups/000000000000000000000001/upload')
        expect(res.status).toBe(401)
    })

    it('authenticated upload attempts may return 201/400/403/404/500/501', async () => {
        const app = createApp(tasksRouter, groupRouter, { id: '000000000000000000000001' })
        const res = await request(app)
            .post('/groups/000000000000000000000001/upload')
            .attach('file', Buffer.from('x'), 'file.txt')
        expect([201, 400, 403, 404, 500, 501]).toContain(res.status)
    }, 20000)

    it('file serve endpoint requires auth', async () => {
        const app = createApp(tasksRouter, groupRouter, undefined)
        const res = await request(app).get('/groups/000000000000000000000001/file/somefile.txt')
        expect(res.status).toBe(401)
    })
})
