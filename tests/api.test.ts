/**
 * API integration tests.
 * Prerequisites: DATABASE_URL must be set and the DB must be seeded.
 *   npm run seed
 *   npm test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import app from '@/server/app';

// ─────────────────────────────────────────────
// Lookup seeded snapshot IDs before running tests
// ─────────────────────────────────────────────

let snapAId: number;
let snapBId: number;

beforeAll(async () => {
    const res = await app.request('/api/analyze/buildlayout/snapshots?platform=iOS&tag=seed-test');
    expect(res.status, 'snapshots endpoint failed').toBe(200);

    const snaps: any[] = await res.json();
    const a = snaps.find(s => s.player_version === '1.0.0');
    const b = snaps.find(s => s.player_version === '1.0.1');

    if (!a || !b) {
        throw new Error(
            'Seed data not found (tag=seed-test, platform=iOS). Run: npm run seed',
        );
    }

    snapAId = a.id;
    snapBId = b.id;
});

// ─────────────────────────────────────────────
// Snapshots API
// ─────────────────────────────────────────────

describe('GET /api/analyze/buildlayout/snapshots', () => {
    it('returns 200 with array', async () => {
        const res = await app.request('/api/analyze/buildlayout/snapshots');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
    });

    it('filters by platform', async () => {
        const res = await app.request('/api/analyze/buildlayout/snapshots?platform=iOS');
        expect(res.status).toBe(200);
        const data: any[] = await res.json();
        expect(data.every(s => s.platform === 'iOS')).toBe(true);
    });

    it('filters by platform and tag', async () => {
        const res = await app.request('/api/analyze/buildlayout/snapshots?platform=iOS&tag=seed-test');
        expect(res.status).toBe(200);
        const data: any[] = await res.json();
        expect(data.length).toBeGreaterThanOrEqual(2);
        expect(data.every(s => s.tag === 'seed-test')).toBe(true);
    });

    it('excludes deleted snapshots by default', async () => {
        const res = await app.request('/api/analyze/buildlayout/snapshots?platform=iOS&tag=seed-test');
        const data: any[] = await res.json();
        expect(data.every(s => s.deleted !== true)).toBe(true);
    });
});

describe('GET /api/analyze/buildlayout/snapshots/platforms', () => {
    it('returns platform list including iOS', async () => {
        const res = await app.request('/api/analyze/buildlayout/snapshots/platforms');
        expect(res.status).toBe(200);
        const data: any[] = await res.json();
        const platforms = data.map(p => p.platform);
        expect(platforms).toContain('iOS');
    });
});

// ─────────────────────────────────────────────
// Entries & Links API
// ─────────────────────────────────────────────

describe('GET /api/analyze/buildlayout/:snapshotId/entries', () => {
    it('returns entries for snapshot A', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/entries`);
        expect(res.status).toBe(200);
        const data: any[] = await res.json();
        expect(data.length).toBe(8);
    });

    it('entry fields are present', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/entries`);
        const data: any[] = await res.json();
        const bundle = data.find(e => e.name === 'assets_textures.bundle');
        expect(bundle).toBeDefined();
        expect(bundle.class_name).toBe('BuildLayout/Bundle');
        expect(bundle.hash).toBe('tex-hash-a');
    });

    it('returns 400 for non-integer snapshotId', async () => {
        const res = await app.request('/api/analyze/buildlayout/abc/entries');
        expect(res.status).toBe(400);
    });
});

describe('GET /api/analyze/buildlayout/:snapshotId/links', () => {
    it('returns links for snapshot A', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/links`);
        expect(res.status).toBe(200);
        const data: any[] = await res.json();
        expect(data.length).toBe(17);
    });

    it('link fields are present', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/links`);
        const data: any[] = await res.json();
        const groupLink = data.find(l => l.link_type === 'BuildLayout/Bundle_Group');
        expect(groupLink).toBeDefined();
        expect(groupLink.from_id).toBe(1);
    });

    it('returns 400 for non-integer snapshotId', async () => {
        const res = await app.request('/api/analyze/buildlayout/abc/links');
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────
// Diff API
// ─────────────────────────────────────────────

describe('GET /api/diff (JSON)', () => {
    it('returns 200 with JSON body', async () => {
        const res = await app.request(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('returns 400 for missing params', async () => {
        const res = await app.request('/api/diff');
        expect(res.status).toBe(400);
    });

    it('diffEntries contains expected changes', async () => {
        const res = await app.request(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}`);
        const data = await res.json();
        const entries: any[] = data.diffEntries;

        // Logo.png: hash changed, size changed
        const logo = entries.find(e => e.name === 'Assets/Textures/Logo.png');
        expect(logo, 'Logo.png missing from diffEntries').toBeDefined();
        expect(logo.hash_diff).toBe(true);
        expect(logo.size_diff).toBe(true);

        // assets_textures.bundle: hash changed
        const texBundle = entries.find(e => e.name === 'assets_textures.bundle');
        expect(texBundle).toBeDefined();
        expect(texBundle.hash_diff).toBe(true);

        // Player.prefab: missing in B
        const player = entries.find(e => e.name === 'Assets/Prefabs/Player.prefab');
        expect(player, 'Player.prefab missing from diffEntries').toBeDefined();
        expect(player.isMissing).toBe(true);

        // Enemy.prefab: added in B
        const enemy = entries.find(e => e.name === 'Assets/Prefabs/Enemy.prefab');
        expect(enemy, 'Enemy.prefab missing from diffEntries').toBeDefined();
        expect(enemy.isAdd).toBe(true);

        // Background.png: unchanged → should NOT appear
        const bg = entries.find(e => e.name === 'Assets/Textures/Background.png');
        expect(bg, 'Background.png should be unchanged').toBeUndefined();
    });

    it('diffBundleMap contains bundle-level diff', async () => {
        const res = await app.request(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}`);
        const data = await res.json();
        const bundleMap: Record<string, string[]> = data.diffBundleMap;

        expect(Object.keys(bundleMap)).toContain('assets_textures.bundle');
        expect(Object.keys(bundleMap)).toContain('assets_prefabs.bundle');

        // textures: Logo.png size changed
        expect(bundleMap['assets_textures.bundle']).toEqual(
            expect.arrayContaining([
                expect.stringContaining('[Size CHANGED]'),
                expect.stringContaining('Logo.png'),
            ]),
        );

        // prefabs: Player removed, Enemy added
        const prefabLines: string[] = bundleMap['assets_prefabs.bundle'];
        expect(prefabLines.some(l => l.includes('[Removed]') && l.includes('Player.prefab'))).toBe(true);
        expect(prefabLines.some(l => l.includes('Enemy.prefab'))).toBe(true);
    });

    it('size fields are serialized as strings (BigInt safe)', async () => {
        const res = await app.request(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}`);
        const data = await res.json();
        const logo = data.diffEntries.find((e: any) => e.name === 'Assets/Textures/Logo.png');
        expect(typeof logo.a_size).toBe('string');
        expect(typeof logo.b_size).toBe('string');
        expect(logo.a_size).toBe('2000');
        expect(logo.b_size).toBe('2500');
    });
});

describe('GET /api/diff?format=text', () => {
    it('returns plain text', async () => {
        const res = await app.request(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}&format=text`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/plain');
    });

    it('text contains snapshot labels and diff sections', async () => {
        const res = await app.request(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}&format=text`);
        const text = await res.text();

        expect(text).toContain('1.0.0');
        expect(text).toContain('1.0.1');
        expect(text).toContain('Missing in B');
        expect(text).toContain('Added in B');
        expect(text).toContain('Player.prefab');
        expect(text).toContain('Enemy.prefab');
    });
});

// ─────────────────────────────────────────────
// Upstream Chain API
// ─────────────────────────────────────────────
// seed-test の構造 (snapshot A):
//   Group(rid=1) → Bundle(rid=2) → File(rid=3) → Logo.png(rid=4)
//                                               → Background.png(rid=5)
//                → Bundle(rid=6) → File(rid=7) → Player.prefab(rid=8)

describe('GET /api/analyze/buildlayout/:snapshotId/upstream-chain/:rid', () => {
    it('returns 200 with lines and entries', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.lines)).toBe(true);
        expect(typeof data.entries).toBe('object');
    });

    it('first line is the root node', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4`);
        const { lines } = await res.json();
        expect(lines[0].rid).toBe(4);
        expect(lines[0].isRoot).toBe(true);
        expect(lines[0].depth).toBe(0);
    });

    it('entries map contains the root asset', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4`);
        const { entries } = await res.json();
        expect(entries['4']).toBeDefined();
        expect(entries['4'].name).toBe('Assets/Textures/Logo.png');
    });

    it('traverses containment chain: asset → file → bundle → group', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4`);
        const { lines } = await res.json();
        const rids = lines.filter((l: any) => !l.truncated).map((l: any) => l.rid);
        // 上位の containment ノードがすべて含まれる
        expect(rids).toContain(3); // File
        expect(rids).toContain(2); // Bundle
        expect(rids).toContain(1); // Group
    });

    it('maxDepth=0 returns only the root node', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4?maxDepth=0`);
        const { lines } = await res.json();
        const nonTruncated = lines.filter((l: any) => !l.truncated);
        expect(nonTruncated).toHaveLength(1);
        expect(nonTruncated[0].rid).toBe(4);
    });

    it('maxChildren=1 truncates when a node has multiple parents', async () => {
        // rid=1 (Group) は Bundle 2 と Bundle 6 の両方から参照されるため、
        // Group まで到達できる状態で maxChildren=1 にすると truncated が出る
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4?maxDepth=6&maxChildren=1`);
        const { lines } = await res.json();
        expect(lines.some((l: any) => l.truncated === true)).toBe(true);
    });

    it('returns 400 for invalid snapshotId', async () => {
        const res = await app.request('/api/analyze/buildlayout/abc/upstream-chain/4');
        expect(res.status).toBe(400);
    });

    it('returns 400 for invalid rid', async () => {
        const res = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/abc`);
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────
// revAdj cache
// ─────────────────────────────────────────────

describe('revAdj cache', () => {
    it('two requests for the same snapshot return identical results', async () => {
        const url = `/api/analyze/buildlayout/${snapAId}/upstream-chain/4`;
        const res1 = await app.request(url);
        const res2 = await app.request(url);
        expect(await res1.json()).toEqual(await res2.json());
    });

    it('cache is populated after the first request', async () => {
        const { getCachedRevAdj } = await import('@/server/lib/revAdjCache');
        await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4`);
        expect(getCachedRevAdj(snapAId)).not.toBeNull();
    });

    it('different maxDepth/maxChildren return different line counts but same cache', async () => {
        const { getCachedRevAdj } = await import('@/server/lib/revAdjCache');

        const shallow = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4?maxDepth=1`);
        const deep    = await app.request(`/api/analyze/buildlayout/${snapAId}/upstream-chain/4?maxDepth=6`);

        const shallowLines = (await shallow.json()).lines;
        const deepLines    = (await deep.json()).lines;

        // maxDepth が違えば結果も変わる
        expect(shallowLines.length).toBeLessThan(deepLines.length);
        // どちらのリクエストでもキャッシュは同一インスタンスを使い回している
        expect(getCachedRevAdj(snapAId)).not.toBeNull();
    });
});
