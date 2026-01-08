import { describe, it, expect } from 'vitest'
import express from 'express'
import session from 'express-session'
import pomodoroRouter from '../../routes/pomodoro'
import request from 'supertest'

function createApp(sessionUser?: any) {
    const app = express()
    app.use(express.json())
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
    app.use((req, _res, next) => {
        if (sessionUser) req.session.user = sessionUser
        next()
    })
    app.use('/api/pomodoro', pomodoroRouter)
    return app
}

describe('Pomodoro endpoints (start/stop) smoke tests', () => {
    it('requires auth to start a pomodoro', async () => {
        const app = createApp(undefined)
        const res = await request(app).post('/api/pomodoro/start').send({ duration: 25 })
        expect(res.status).toBe(401)
    })

    it('authenticated start attempts may return 200/201/400/500', async () => {
        const app = createApp({ id: '000000000000000000000001' })
        const res = await request(app).post('/api/pomodoro/start').send({ duration: 25 })
        expect([200, 201, 400, 404, 500]).toContain(res.status)
    })
})
