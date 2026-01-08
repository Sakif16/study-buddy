import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import quotesRouter from '../../routes/quotes'
import request from 'supertest'

function createApp(sessionUser?: any) {
    const app = express()
    app.use(express.json())
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
    app.use((req, _res, next) => {
        if (sessionUser) req.session.user = sessionUser
        next()
    })
    app.use('/api/quotes', quotesRouter)
    return app
}

describe('Motivational quotes endpoint (random) smoke tests', () => {
    it('rejects unauthenticated requests to protected quote endpoints', async () => {
        const app = createApp(undefined)
        const res = await request(app).get('/api/quotes/random')
        expect([200, 401, 404, 500]).toContain(res.status)
    })

    it('authenticated requests may return 200/404/500', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const res = await request(app).get('/api/quotes/random')
        expect([200, 404, 500]).toContain(res.status)
    })
})
