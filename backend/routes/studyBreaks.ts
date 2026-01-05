import express from "express"
import { z } from "zod"

// Import mongodb driver dynamically; return helpful errors if missing
let MongoClientPkg: unknown = null
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    MongoClientPkg = require('mongodb')
} catch {
    MongoClientPkg = null
}

const router = express.Router()

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.user) return res.status(401).json({ error: 'unauthorized' })
    next()
}

const CreateSchema = z.object({ category: z.string().min(1), text: z.string().min(1) })
const DeleteSchema = z.object({ id: z.string().min(1) })

const getCollection = async () => {
    if (!MongoClientPkg) throw new Error('mongodb-not-installed')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg: any = MongoClientPkg
    const { MongoClient, ObjectId } = pkg
    // allow using DATABASE_URL (from .env) as a fallback for MONGO_URI
    const uri = process.env.MONGO_URI ?? process.env.DATABASE_URL
    if (!uri) throw new Error('missing-mongo-uri')
    const client = new MongoClient(uri)
    await client.connect()
    // derive DB name from env override or from the connection string path if present
    let dbName = process.env.MONGO_DB_NAME ?? 'study_buddy'
    try {
        if (!process.env.MONGO_DB_NAME && uri) {
            const m = uri.match(/\/([^\/?]+)(?:\?|$)/)
            if (m && m[1]) dbName = m[1]
        }
    } catch {
        // ignore and use default
    }
    const db = client.db(dbName)
    const coll = db.collection('studyBreakSuggestions')
    return { client, coll, ObjectId }
}

// GET /api/study-breaks/ -> list suggestions (public)
router.get('/', async (req, res) => {
    try {
        const QuerySchema = z.object({ category: z.string().optional(), skip: z.string().optional(), limit: z.string().optional() })
        const q = QuerySchema.parse(req.query)
        const skip = q.skip ? parseInt(q.skip, 10) || 0 : 0
        const limit = q.limit ? Math.min(200, Math.max(1, parseInt(q.limit, 10) || 50)) : 50

        const filter: Record<string, unknown> = {}
        if (q.category) filter.category = q.category

        const { client, coll } = await getCollection()
        const docs = await coll.find(filter, { projection: { category: 1, text: 1, createdAt: 1 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
        await client.close()
        type Doc = { _id: unknown; category?: string; text?: string; createdAt?: string }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.json({ suggestions: (docs as Doc[]).map((d) => ({ id: String((d as any)._id), category: d.category ?? '', text: d.text ?? '', createdAt: d.createdAt ?? '' })) })
    } catch (err) {
        const emsg = typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err)
        if (emsg.includes('mongodb-not-installed')) return res.status(501).json({ error: 'mongodb-not-installed', message: 'Please install mongodb driver in backend.' })
        if (emsg.includes('missing-mongo-uri')) return res.status(500).json({ error: 'missing-mongo-uri', message: 'Set MONGO_URI in backend env.' })
        console.error('/api/study-breaks GET error', err)
        res.status(500).json({ error: 'failed' })
    }
})

// GET /api/study-breaks/random?category=Health -> random suggestion (public)
router.get('/random', async (req, res) => {
    try {
        const QuerySchema = z.object({ category: z.string().optional() })
        const q = QuerySchema.parse(req.query)
        const filter: Record<string, unknown> = {}
        if (q.category) filter.category = q.category

        const { client, coll } = await getCollection()
        const docs = await coll.find(filter, { projection: { category: 1, text: 1, createdAt: 1 } }).toArray()
        await client.close()
        if (!docs || docs.length === 0) return res.status(404).json({ error: 'no suggestions' })
        // pick random
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const picked = docs[Math.floor(Math.random() * docs.length)] as any
        res.json({ suggestion: { id: String(picked._id), category: picked.category ?? '', text: picked.text ?? '' } })
    } catch (err) {
        const emsg = typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err)
        if (emsg.includes('mongodb-not-installed')) return res.status(501).json({ error: 'mongodb-not-installed', message: 'Please install mongodb driver in backend.' })
        if (emsg.includes('missing-mongo-uri')) return res.status(500).json({ error: 'missing-mongo-uri', message: 'Set MONGO_URI in backend env.' })
        console.error('/api/study-breaks RANDOM error', err)
        res.status(500).json({ error: 'failed' })
    }
})

// POST /api/study-breaks/ -> create suggestion (requires auth)
router.post('/', requireAuth, async (req, res) => {
    try {
        const parsed = CreateSchema.parse(req.body)
        const { client, coll } = await getCollection()
        const doc = { category: parsed.category, text: parsed.text, createdAt: new Date().toISOString() }
        const result = await coll.insertOne(doc)
        await client.close()
        res.status(201).json({ suggestion: { id: String(result.insertedId), ...doc } })
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'invalid payload', details: err.issues })
        const emsg = typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err)
        if (emsg.includes('mongodb-not-installed')) return res.status(501).json({ error: 'mongodb-not-installed', message: 'Please install mongodb driver in backend.' })
        if (emsg.includes('missing-mongo-uri')) return res.status(500).json({ error: 'missing-mongo-uri', message: 'Set MONGO_URI in backend env.' })
        console.error('/api/study-breaks POST error', err)
        res.status(500).json({ error: 'failed' })
    }
})

// DELETE /api/study-breaks/ -> delete by id (requires auth)
router.delete('/', requireAuth, async (req, res) => {
    try {
        const parsed = DeleteSchema.parse(req.body)
        const { client, coll, ObjectId } = await getCollection()
        const _id = ObjectId(parsed.id)
        const result = await coll.findOneAndDelete({ _id })
        await client.close()
        if (!result.value) return res.status(404).json({ error: 'not found' })
        res.json({ deleted: { id: String(result.value._id), category: result.value.category, text: result.value.text } })
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'invalid payload', details: err.issues })
        const emsg = typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err)
        if (emsg.includes('mongodb-not-installed')) return res.status(501).json({ error: 'mongodb-not-installed', message: 'Please install mongodb driver in backend.' })
        if (emsg.includes('missing-mongo-uri')) return res.status(500).json({ error: 'missing-mongo-uri', message: 'Set MONGO_URI in backend env.' })
        console.error('/api/study-breaks DELETE error', err)
        res.status(500).json({ error: 'failed' })
    }
})

export default router
