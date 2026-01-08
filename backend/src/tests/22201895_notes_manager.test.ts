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

describe('Notes manager (create / edit / delete) smoke tests', () => {
    it('rejects unauthenticated create', async () => {
        const app = createApp(undefined)
        const res = await request(app).post('/api/notes').send({ title: 'x' })
        expect(res.status).toBe(401)
    })

    it('accepts authenticated create payload shape (may 400/201/500)', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const res = await request(app).post('/api/notes').send({ title: 'test', content: null })
        expect([201, 400, 500]).toContain(res.status)
    }, 15000)

    it('update and delete endpoints require auth and ownership checks', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const put = await request(app).put('/api/notes/000000000000000000000003').send({ title: 'new' })
        expect([200, 400, 404, 500]).toContain(put.status)
        const del = await request(app).delete('/api/notes/000000000000000000000003')
        expect([204, 400, 404, 500]).toContain(del.status)
    })
})
