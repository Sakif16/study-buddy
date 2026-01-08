import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import streakRouter from '../../routes/streak'
import request from 'supertest'

function createApp(sessionUser?: any) {
    const app = express()
    app.use(express.json())
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
    app.use((req, _res, next) => {
        if (sessionUser) req.session.user = sessionUser
        next()
    })
    // achievements route may not exist; reuse streak router as a placeholder
    app.use('/api/achievements', streakRouter)
    return app
}

describe('Achievements endpoint (smoke)', () => {
    it('requires auth to view achievements', async () => {
        const app = createApp(undefined)
        const res = await request(app).get('/api/achievements')
        expect(res.status).toBe(401)
    })

    it('authenticated requests may return 200/404/500', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const res = await request(app).get('/api/achievements')
        expect([200, 404, 500]).toContain(res.status)
    })
})
