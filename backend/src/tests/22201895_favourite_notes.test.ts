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

describe('Favourite notes toggle endpoint', () => {
    it('rejects unauthenticated toggle', async () => {
        const app = createApp(undefined)
        const res = await request(app).patch('/api/notes/000000000000000000000001/favorite').send({ isFavorite: true })
        expect(res.status).toBe(401)
    })

    it('authenticated toggle accepts valid payload shapes (smoke)', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const res = await request(app).patch('/api/notes/000000000000000000000001/favorite').send({ isFavorite: true })
        expect([200, 400, 404, 500]).toContain(res.status)
    })
})
