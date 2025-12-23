// Ambient declarations to suppress editor/TS errors until @types are installed
declare module 'multer'

declare global {
    namespace Express {
        interface Request {
            // multer attaches `file`/`files` at runtime; keep them `any` to avoid TS errors
            file?: any
            files?: any
        }
    }
}

export { }
