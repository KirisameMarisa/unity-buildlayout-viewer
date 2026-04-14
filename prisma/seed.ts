/**
 * Seed script for local development and API tests.
 * Creates two snapshots (v1.0.0 and v1.0.1) under tag "seed-test" on platform "iOS".
 * Run: npm run seed
 *
 * Structure:
 *   Group: DefaultLocalGroup
 *     └─ Bundle: assets_textures.bundle
 *          └─ File: CAB-textures
 *               └─ ExplicitAsset: Assets/Textures/Logo.png        (hash changes in B)
 *               └─ ExplicitAsset: Assets/Textures/Background.png  (unchanged)
 *     └─ Bundle: assets_prefabs.bundle
 *          └─ File: CAB-prefabs
 *               └─ ExplicitAsset: Assets/Prefabs/Player.prefab    (removed in B)
 *          (B adds:)
 *               └─ ExplicitAsset: Assets/Prefabs/Enemy.prefab     (added in B)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TAG = 'seed-test';
const PLATFORM = 'iOS';

// ─────────────────────────────────────────────
// Entry and link templates (rid-relative)
// ─────────────────────────────────────────────

type EntryRow = {
    rid: number;
    class_name: string;
    name: string;
    hash: string | null;
    size: bigint;
    guid: string | null;
    streamed_size: bigint;
};

type LinkRow = { from_id: number; to_id: number; link_type: string };

const ENTRIES_A: EntryRow[] = [
    { rid: 1, class_name: 'BuildLayout/Group',         name: 'DefaultLocalGroup',              hash: null,             size: BigInt(0),     guid: 'seed-group-0001',  streamed_size: BigInt(0) },
    { rid: 2, class_name: 'BuildLayout/Bundle',        name: 'assets_textures.bundle',          hash: 'tex-hash-a',     size: BigInt(10000), guid: 'assets_textures',  streamed_size: BigInt(0) },
    { rid: 3, class_name: 'BuildLayout/File',          name: 'CAB-textures-a',                  hash: null,             size: BigInt(5000),  guid: null,               streamed_size: BigInt(0) },
    { rid: 4, class_name: 'BuildLayout/ExplicitAsset', name: 'Assets/Textures/Logo.png',        hash: 'logo-hash-a',    size: BigInt(2000),  guid: 'logo-guid-0001',   streamed_size: BigInt(0) },
    { rid: 5, class_name: 'BuildLayout/ExplicitAsset', name: 'Assets/Textures/Background.png',  hash: 'bg-hash-same',   size: BigInt(3000),  guid: 'bg-guid-0001',     streamed_size: BigInt(0) },
    { rid: 6, class_name: 'BuildLayout/Bundle',        name: 'assets_prefabs.bundle',           hash: 'prefab-hash-a',  size: BigInt(8000),  guid: 'assets_prefabs',   streamed_size: BigInt(0) },
    { rid: 7, class_name: 'BuildLayout/File',          name: 'CAB-prefabs-a',                   hash: null,             size: BigInt(4000),  guid: null,               streamed_size: BigInt(0) },
    { rid: 8, class_name: 'BuildLayout/ExplicitAsset', name: 'Assets/Prefabs/Player.prefab',    hash: 'player-hash-a',  size: BigInt(4000),  guid: 'player-guid-0001', streamed_size: BigInt(0) },
];

const ENTRIES_B: EntryRow[] = [
    { rid: 1, class_name: 'BuildLayout/Group',         name: 'DefaultLocalGroup',              hash: null,             size: BigInt(0),     guid: 'seed-group-0001',  streamed_size: BigInt(0) },
    { rid: 2, class_name: 'BuildLayout/Bundle',        name: 'assets_textures.bundle',          hash: 'tex-hash-b',     size: BigInt(10500), guid: 'assets_textures',  streamed_size: BigInt(0) },
    { rid: 3, class_name: 'BuildLayout/File',          name: 'CAB-textures-b',                  hash: null,             size: BigInt(5500),  guid: null,               streamed_size: BigInt(0) },
    { rid: 4, class_name: 'BuildLayout/ExplicitAsset', name: 'Assets/Textures/Logo.png',        hash: 'logo-hash-b',    size: BigInt(2500),  guid: 'logo-guid-0001',   streamed_size: BigInt(0) },
    { rid: 5, class_name: 'BuildLayout/ExplicitAsset', name: 'Assets/Textures/Background.png',  hash: 'bg-hash-same',   size: BigInt(3000),  guid: 'bg-guid-0001',     streamed_size: BigInt(0) },
    { rid: 6, class_name: 'BuildLayout/Bundle',        name: 'assets_prefabs.bundle',           hash: 'prefab-hash-b',  size: BigInt(9000),  guid: 'assets_prefabs',   streamed_size: BigInt(0) },
    { rid: 7, class_name: 'BuildLayout/File',          name: 'CAB-prefabs-b',                   hash: null,             size: BigInt(4500),  guid: null,               streamed_size: BigInt(0) },
    { rid: 8, class_name: 'BuildLayout/ExplicitAsset', name: 'Assets/Prefabs/Enemy.prefab',     hash: 'enemy-hash-b',   size: BigInt(4500),  guid: 'enemy-guid-0001',  streamed_size: BigInt(0) },
];

/**
 * Links are identical in structure for both snapshots (same rids).
 * Direction: from_id → to_id
 *   Tree traversal (buildAssetTree) follows from_id → to_id downward.
 *   Upstream traversal (collectAllAncestors) follows to_id → from_id upward.
 */
const BASE_LINKS: LinkRow[] = [
    // ── Downward (tree): Group → Bundles
    { from_id: 1, to_id: 2, link_type: 'BuildLayout/Bundle_Group' },
    { from_id: 1, to_id: 6, link_type: 'BuildLayout/Bundle_Group' },
    // ── Downward: Bundles → Files
    { from_id: 2, to_id: 3, link_type: 'BuildLayout/File_Bundle' },
    { from_id: 6, to_id: 7, link_type: 'BuildLayout/File_Bundle' },
    // ── Downward: Bundles → Assets (direct, used by collectDiffFileInBundle)
    { from_id: 2, to_id: 4, link_type: 'BuildLayout/ExplicitAsset_Bundles' },
    { from_id: 2, to_id: 5, link_type: 'BuildLayout/ExplicitAsset_Bundles' },
    { from_id: 6, to_id: 8, link_type: 'BuildLayout/ExplicitAsset_Bundles' },
    // ── Downward: Files → Assets
    { from_id: 3, to_id: 4, link_type: 'BuildLayout/ExplicitAsset_Files' },
    { from_id: 3, to_id: 5, link_type: 'BuildLayout/ExplicitAsset_Files' },
    { from_id: 7, to_id: 8, link_type: 'BuildLayout/ExplicitAsset_Files' },
    // ── Upward (reverse): Bundles → Group
    { from_id: 2, to_id: 1, link_type: 'BuildLayout/Group_Bundles' },
    { from_id: 6, to_id: 1, link_type: 'BuildLayout/Group_Bundles' },
    // ── Upward: Files → Bundles
    { from_id: 3, to_id: 2, link_type: 'BuildLayout/Bundle_Files' },
    { from_id: 7, to_id: 6, link_type: 'BuildLayout/Bundle_Files' },
    // ── Upward: Assets → Files
    { from_id: 4, to_id: 3, link_type: 'BuildLayout/File_Assets' },
    { from_id: 5, to_id: 3, link_type: 'BuildLayout/File_Assets' },
    { from_id: 8, to_id: 7, link_type: 'BuildLayout/File_Assets' },
];

async function createSnapshot(
    playerVersion: string,
    buildTime: Date,
    entries: EntryRow[],
    links: LinkRow[],
) {
    const snapshot = await prisma.asset_snapshots.create({
        data: {
            platform: PLATFORM,
            player_version: playerVersion,
            build_time: buildTime,
            tag: TAG,
            comment: `seed data v${playerVersion}`,
            version: '1.0',
        },
    });

    await prisma.asset_entries.createMany({
        data: entries.map(e => ({ ...e, snapshot_id: snapshot.id })),
    });

    await prisma.asset_links.createMany({
        data: links.map(l => ({ ...l, snapshot_id: snapshot.id })),
    });

    console.log(`  snapshot ${snapshot.id} (${playerVersion}): ${entries.length} entries, ${links.length} links`);
    return snapshot;
}

async function main() {
    console.log('Seeding database...');

    // ── Idempotent cleanup ──────────────────────────────────────
    const existing = await prisma.asset_snapshots.findMany({
        where: { tag: TAG },
        select: { id: true },
    });
    if (existing.length > 0) {
        const ids = existing.map(s => s.id);
        await prisma.asset_links.deleteMany({ where: { snapshot_id: { in: ids } } });
        await prisma.asset_entries.deleteMany({ where: { snapshot_id: { in: ids } } });
        await prisma.asset_snapshots.deleteMany({ where: { id: { in: ids } } });
        console.log(`  cleaned up ${ids.length} existing snapshot(s) for tag="${TAG}"`);
    }

    // ── Create snapshot A (v1.0.0) ─────────────────────────────
    const buildTimeA = new Date('2026-01-01T00:00:00Z');
    await createSnapshot('1.0.0', buildTimeA, ENTRIES_A, BASE_LINKS);

    // ── Create snapshot B (v1.0.1) ─────────────────────────────
    const buildTimeB = new Date('2026-01-02T00:00:00Z');
    await createSnapshot('1.0.1', buildTimeB, ENTRIES_B, BASE_LINKS);

    console.log('Done.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
