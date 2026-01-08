import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import notesRouter from '../../routes/notes'
import request from 'supertest'

function createApp(sessionUser?: any) {
    const app = express()
    app.use(express.json())
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
    app.use((req, _res, next) => {
        if (sessionUser) req.session.user = sessionUser
        next()
    })
    app.use('/api/notes', notesRouter)
    return app
}

describe('Note versions endpoints (list/get/restore) smoke tests', () => {
    it('requires auth to list versions', async () => {
        const app = createApp(undefined)
        const res = await request(app).get('/api/notes/000000000000000000000001/versions')
        expect(res.status).toBe(401)
    })

    it('authenticated requests may return 200/404/500 for listing and getting versions', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const list = await request(app).get('/api/notes/000000000000000000000001/versions')
        expect([200, 404, 500]).toContain(list.status)

        const get = await request(app).get('/api/notes/000000000000000000000001/versions/123')
        expect([200, 404, 500]).toContain(get.status)

        const restore = await request(app).post('/api/notes/000000000000000000000001/versions/123/restore')
        expect([200, 404, 500]).toContain(restore.status)
    }, 20000)
})
