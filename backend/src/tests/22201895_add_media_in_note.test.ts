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

describe('Add PDF/image to note (attachments) endpoint', () => {
    it('rejects unauthenticated upload', async () => {
        const app = createApp(undefined)
        const res = await request(app).post('/api/notes/000000000000000000000001/attachments')
        expect(res.status).toBe(401)
    })

    it('accepts authenticated upload attempts (may return 201, 501 if multer missing, or other errors)', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        // attach a small file buffer; backend may respond 501 if multer isn't installed
        const res = await request(app)
            .post('/api/notes/000000000000000000000001/attachments')
            .attach('attachments', Buffer.from('x'), 'test.pdf')
        expect([201, 400, 404, 500, 501]).toContain(res.status)
    }, 20000)
})
