import { Hono } from 'hono'
import { promises as fs } from 'fs'
import nodeFs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { Readable } from 'stream'
import Busboy from 'busboy'
import { BuildDiffResultText } from '@/lib/utils'
import { prisma } from '@/server/lib/db';
import { collectDiffFileInBundle, constructDiffEntries, buildRevAdj, computeUpstreamChain } from '@/server/lib/graph'
import { getCachedRevAdj, setCachedRevAdj } from '@/server/lib/rev-adj-cache'
import { analyzeBuildLayout, step } from '@/server/lib/asset-analyzer'

const app = new Hono().basePath('/api')

function respondJson(c: any, data: unknown, status = 200) {
    const body = JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
    c.header('Content-Type', 'application/json')
    return c.body(body, status)
}

// ----------------------------------------------------------------
// Snapshots
// ----------------------------------------------------------------

app.get('/analyze/buildlayout/snapshots/platforms', async (c) => {
    try {
        const platforms = await prisma.asset_snapshots.findMany({
            distinct: ['platform'],
            select: { platform: true },
            orderBy: { build_time: 'desc' },
        })
        return c.json(platforms)
    } catch {
        return c.json({ error: 'DB error' }, 500)
    }
})

app.get('/analyze/buildlayout/snapshots/tags', async (c) => {
    try {
        const platform = c.req.query('platform') ?? null
        const tags = await prisma.asset_snapshots.findMany({
            select: { tag: true },
            distinct: ['tag'],
            orderBy: { build_time: 'desc' },
            where: { platform, NOT: [{ tag: '' }] },
        })
        return c.json(tags)
    } catch {
        return c.json({ error: 'DB error' }, 500)
    }
})

app.put('/analyze/buildlayout/snapshots/edit/:id', async (c) => {
    const id = parseInt(c.req.param('id'))
    if (!id) {
        return c.json({ error: 'snapshot ID is required' }, 400)
    }
    const data = await c.req.json()
    const { tag, comment, del } = data
    try {
        const updated = await prisma.asset_snapshots.update({
            where: { id },
            data: { tag, comment, deleted: del },
        })
        return c.json(updated)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to update snapshot' }, 500)
    }
})

app.get('/analyze/buildlayout/snapshots', async (c) => {
    try {
        const platform = c.req.query('platform') ?? null
        const tag = c.req.query('tag') ?? null
        const player_version = c.req.query('player_version') ?? null
        const hasAll = c.req.query('all') !== undefined
        const withCount = c.req.query('count') !== undefined

        let where: any = { platform, tag }
        if (player_version) where.player_version = player_version
        if (!hasAll) {
            where.NOT = { deleted: true }
        }

        const snapshots = await prisma.asset_snapshots.findMany({
            orderBy: { build_time: 'desc' },
            where,
            ...(withCount && { include: { _count: { select: { entries: true } } } }),
        })
        return c.json(snapshots)
    } catch {
        return c.json({ error: 'DB error' }, 500)
    }
})

// ----------------------------------------------------------------
// Upload
// ----------------------------------------------------------------

async function parseMultipartFormStream(req: Request) {
    return new Promise<{
        filePath: string
        filename: string
        fields: Record<string, string>
    }>((resolve, reject) => {
        const contentType = req.headers.get('content-type') || ''
        const busboy = Busboy({ headers: { 'content-type': contentType } })

        const fields: Record<string, string> = {}
        let filePath = ''
        let filename = ''

        busboy.on('file', (_name, file, info) => {
            const tmpDir = os.tmpdir()
            filename = info.filename
            filePath = path.join(tmpDir, `${Date.now()}_${info.filename}`)
            const writeStream = nodeFs.createWriteStream(filePath)
            file.pipe(writeStream)
        })

        busboy.on('field', (name, val) => {
            fields[name] = val
        })

        busboy.on('finish', () => {
            resolve({ filePath, filename, fields })
        })

        busboy.on('error', reject)

        const nodeStream = Readable.fromWeb(req.body as any)
        nodeStream.pipe(busboy)
    })
}

app.post('/analyze/buildlayout/upload/prepare', async (c) => {
    const uuid = crypto.randomUUID()
    step.init(uuid)
    return c.json({ uuid })
})

app.get('/analyze/buildlayout/upload/progress', async (c) => {
    const uuid = c.req.query('uuid') as string
    return c.json({ uuid, step: step.current(uuid) })
})

app.delete('/analyze/buildlayout/upload/clear', async (c) => {
    const uuid = c.req.query('uuid') as string
    step.clear(uuid)
    return c.json({ ok: true })
})

app.post('/analyze/buildlayout/upload', async (c) => {
    try {
        const { filePath, fields } = await parseMultipartFormStream(c.req.raw)
        const tag = fields.tag ?? ''
        const comment = fields.comment ?? ''
        const uuid = fields.uuid ?? ''
        const result = await analyzeBuildLayout(filePath, tag, comment, uuid)
        return c.json(result)
    } catch (e) {
        console.error(e)
        return c.json({ error: `${e}` }, 500)
    }
})

// ----------------------------------------------------------------
// Asset entries / links
// ----------------------------------------------------------------

app.get('/analyze/buildlayout/:snapshotId/entries', async (c) => {
    const snapshotId = parseInt(c.req.param('snapshotId'))
    if (isNaN(snapshotId)) {
        return c.json({ error: 'Invalid snapshot ID' }, 400)
    }
    const entries = await prisma.asset_entries.findMany({
        select: { rid: true, name: true, class_name: true, guid: true, hash: true, size: true, streamed_size: true },
        where: { snapshot_id: snapshotId },
    })
    return respondJson(c, entries)
})

app.get('/analyze/buildlayout/:snapshotId/links', async (c) => {
    const snapshotId = parseInt(c.req.param('snapshotId'))
    if (isNaN(snapshotId)) {
        return c.json({ error: 'Invalid snapshot ID' }, 400)
    }
    const links = await prisma.asset_links.findMany({
        where: { snapshot_id: snapshotId },
    })
    return respondJson(c, links)
})

app.get('/analyze/buildlayout/:snapshotId/:rid/entry', async (c) => {
    const snapshotId = parseInt(c.req.param('snapshotId'))
    const rid = parseInt(c.req.param('rid'))
    if (isNaN(snapshotId)) {
        return c.json({ error: 'Invalid snapshot ID' }, 400)
    }
    if (isNaN(rid)) {
        return c.json({ error: 'Invalid rid' }, 400)
    }
    const entry = await prisma.asset_entries.findMany({
        where: { snapshot_id: snapshotId, rid },
    })
    return respondJson(c, entry)
})

// ----------------------------------------------------------------
// Upstream chain (for DependencyViewer)
// ----------------------------------------------------------------

app.get('/analyze/buildlayout/:snapshotId/upstream-chain/:rid', async (c) => {
    const snapshotId = parseInt(c.req.param('snapshotId'))
    const rid = parseInt(c.req.param('rid'))
    if (isNaN(snapshotId) || isNaN(rid)) {
        return c.json({ error: 'Invalid snapshotId or rid' }, 400)
    }

    const maxDepth = parseInt(c.req.query('maxDepth') ?? '6')
    const maxChildren = parseInt(c.req.query('maxChildren') ?? '50')

    let revAdj = getCachedRevAdj(snapshotId)
    if (!revAdj) {
        const links = await prisma.asset_links.findMany({
            select: { from_id: true, to_id: true, link_type: true },
            where: { snapshot_id: snapshotId },
        })
        revAdj = buildRevAdj(links)
        setCachedRevAdj(snapshotId, revAdj)
    }

    const lines = computeUpstreamChain(revAdj, rid, maxDepth, maxChildren)

    const rids = new Set(lines.filter(l => !l.truncated).map(l => l.rid))
    const entryRows = await prisma.asset_entries.findMany({
        select: { rid: true, name: true, class_name: true, guid: true, hash: true, size: true, streamed_size: true },
        where: { snapshot_id: snapshotId, rid: { in: Array.from(rids) } },
    })

    const entries: Record<string, unknown> = {}
    for (const e of entryRows) {
        entries[String(e.rid)] = e
    }

    return respondJson(c, { lines, entries })
})

// ----------------------------------------------------------------
// Diff
// ----------------------------------------------------------------

app.get('/diff', async (c) => {
    const snap_a = c.req.query('snap_a')
    const snap_b = c.req.query('snap_b')
    const snapshotAId = Number(snap_a)
    const snapshotBId = Number(snap_b)

    if (!Number.isInteger(snapshotAId) || !Number.isInteger(snapshotBId)) {
        return c.json({ error: 'snapshot_a and snapshot_b must be integer' }, 400)
    }

    const [aSnapshot, bSnapshot] = await Promise.all([
        prisma.asset_snapshots.findUnique({ where: { id: snapshotAId } }),
        prisma.asset_snapshots.findUnique({ where: { id: snapshotBId } }),
    ])

    if (!aSnapshot || !bSnapshot) {
        return c.json({ error: 'Snapshot not found' }, 404)
    }

    const [aLinks, bLinks, aEntries, bEntries] = await Promise.all([
        prisma.asset_links.findMany({ where: { snapshot_id: snapshotAId } }),
        prisma.asset_links.findMany({ where: { snapshot_id: snapshotBId } }),
        prisma.asset_entries.findMany({
            select: { rid: true, name: true, class_name: true, guid: true, hash: true, size: true, streamed_size: true },
            where: { snapshot_id: snapshotAId },
        }),
        prisma.asset_entries.findMany({
            select: { rid: true, name: true, class_name: true, guid: true, hash: true, size: true, streamed_size: true },
            where: { snapshot_id: snapshotBId },
        }),
    ])

    const aLabel = `${aSnapshot.tag}.${aSnapshot.player_version}`
    const bLabel = `${bSnapshot.tag}.${bSnapshot.player_version}`
    const metaA = { platform: aSnapshot.platform, tag: aSnapshot.tag, version: aSnapshot.player_version, buildTime: aSnapshot.build_time, comment: aSnapshot.comment }
    const metaB = { platform: bSnapshot.platform, tag: bSnapshot.tag, version: bSnapshot.player_version, buildTime: bSnapshot.build_time, comment: bSnapshot.comment }

    const diffEntries = constructDiffEntries(aEntries, bEntries)
    const dep = collectDiffFileInBundle(aEntries, aLinks, bEntries, bLinks, diffEntries)

    c.header('Cache-Control', 'no-store')

    const format = c.req.query('format')
    if (format === 'text') {
        const text = BuildDiffResultText(dep, diffEntries, aLabel, bLabel, metaA, metaB)
        return c.text(text)
    }

    return respondJson(c, {
        diffEntries,
        diffBundleMap: Object.fromEntries(
            [...dep.entries()].map(([k, v]) => [k, [...v]])
        ),
    })
})

export default app
