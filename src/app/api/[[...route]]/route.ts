import app from '@/server/app'

export const GET = (req: Request) => app.fetch(req)
export const POST = (req: Request) => app.fetch(req)
export const PUT = (req: Request) => app.fetch(req)
export const DELETE = (req: Request) => app.fetch(req)
