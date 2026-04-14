import { ParentEdge } from '@/lib/types'

const MAX = 10
const cache = new Map<number, Map<number, ParentEdge[]>>()

export function getCachedRevAdj(snapshotId: number): Map<number, ParentEdge[]> | null {
    if (!cache.has(snapshotId)) return null
    const val = cache.get(snapshotId)!
    cache.delete(snapshotId)
    cache.set(snapshotId, val)
    return val
}

export function setCachedRevAdj(snapshotId: number, revAdj: Map<number, ParentEdge[]>): void {
    if (cache.size >= MAX) cache.delete(cache.keys().next().value!)
    cache.set(snapshotId, revAdj)
}
