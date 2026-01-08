import express from 'express'
import session from 'express-session'

export function createApp(tasksRouter: any, groupRouter: any, sessionUser?: any) {
  const app = express()
  app.use(express.json())
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any))
  app.use((req, _res, next) => {
    if (sessionUser) req.session.user = sessionUser
    next()
  })
  app.use('/api/tasks', tasksRouter)
  app.use('/groups', groupRouter)
  return app
}
