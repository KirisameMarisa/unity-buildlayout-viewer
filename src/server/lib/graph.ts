import { AssetEntry, AssetLink, AssetTreeNode, DiffEntry, DiffType, ParentEdge, UpstreamLine } from '@/lib/types';
import { Profiler } from '@/lib/utils';

export function collectUpstreamRecursive(
    currentRid: number,
    entryMap: Map<number, AssetEntry>,
    links: AssetLink[],
    outCollectedEntries: AssetEntry[],
    outCollectedLinks: AssetLink[],
    depth: number = 2,
) {
    if (depth <= 0) {
        return;
    }

    if (outCollectedEntries.length === 0) {
        const target = entryMap.get(currentRid);
        if (!target) {
            return;
        }
        outCollectedEntries.push(target);
    }

    const directLinks = links.filter(l => l.to_id === currentRid);
    for (const link of directLinks) {
        const parent = entryMap.get(link.from_id!);
        if (!parent) {
            continue;
        }
        outCollectedEntries.push(parent);
        outCollectedLinks.push(link);

        collectUpstreamRecursive(link.from_id!, entryMap, links, outCollectedEntries, outCollectedLinks, depth - 1);
    }
}

export function collectSubGraphRecursive(
    currentRid: number,
    entryMap: Map<number, AssetEntry>,
    links: AssetLink[],
    outCollectedEntries: AssetEntry[],
    outCollectedLinks: AssetLink[],
    depth: number = -1,
    visited: Set<number> = new Set()
) {
    if (visited.has(currentRid)) {
        return;
    }

    visited.add(currentRid);

    const current = entryMap.get(currentRid);
    if (!current) return;

    outCollectedEntries.push(current);

    if (depth === 0) return;

    const outgoingLinks = links.filter(l => l.from_id === currentRid);

    for (const link of outgoingLinks) {
        outCollectedLinks.push(link);
        collectSubGraphRecursive(
            link.to_id!,
            entryMap,
            links,
            outCollectedEntries,
            outCollectedLinks,
            depth > 0 ? depth - 1 : -1,
            visited
        );
    }
}

export function findRootNodes(entries: AssetEntry[]): AssetEntry[] {
    const roots = entries
        .filter(v => v.class_name!.includes("BuildLayout/Group"));
    return roots;
}

export function findRootNodeIdsFromBoth(
    entryMapA: Map<number, AssetEntry>,
    entryMapB: Map<number, AssetEntry>
): number[] {
    const rootRids = new Set<number>();

    for (const [rid, entry] of entryMapA.entries()) {
        if (entry.class_name === 'BuildLayout/Group') {
            rootRids.add(rid);
        }
    }

    for (const [rid, entry] of entryMapB.entries()) {
        if (entry.class_name === 'BuildLayout/Group') {
            rootRids.add(rid);
        }
    }
    return Array.from(rootRids);
}

export function buildEntryMap(entries: AssetEntry[]): Map<number, AssetEntry> {
    return new Map<number, AssetEntry>(entries.map(e => [e.rid!, e]))
}

export function buildLinkMap(links: AssetLink[]): Map<number, AssetLink[]> {
    const map = new Map<number, AssetLink[]>();
    for (const link of links) {
        if (!map.has(link.from_id!)) {
            map.set(link.from_id!, []);
        }
        map.get(link.from_id!)!.push(link);
    }
    return map;
}

export function buildAssetTree(
    rootRid: number,
    entryMap: Map<number, AssetEntry>,
    linkMap: Map<number, AssetLink[]>,
    visited: Set<number> = new Set(),
    isRoot: boolean = true
): AssetTreeNode | null {
    if (visited.has(rootRid)) {
        return null;
    }
    visited.add(rootRid);

    const entry = entryMap.get(rootRid);
    if (!entry) return null;

    if (!isRoot && entry.class_name === 'BuildLayout/Group') return null;

    const links = linkMap.get(rootRid) || [];
    const children: AssetTreeNode[] = [];

    for (const link of links) {
        const child = buildAssetTree(link.to_id!, entryMap, linkMap, visited, false);
        if (child) {
            children.push(child);
        }
    }

    return {
        id: "",
        label: entry.name!,
        children,
        userData: entry,
    };
}

export function compareAssetTrees(
    a: AssetTreeNode | null,
    b: AssetTreeNode | null,
    outDiffAssetEntry: Map<string, DiffEntry>,
): AssetTreeNode | null {
    if (!a && !b) return null;

    let diffFlags: DiffType[] = [];
    if (!a) {
        diffFlags.push('add');
    } else if (!b) {
        diffFlags.push('missing');
    } else {
        if (a.userData?.hash !== b.userData?.hash)
            diffFlags.push('hash');
    }

    const isBundleA = a?.userData?.name!.includes(".bundle");
    const isBundleB = b?.userData?.name!.includes(".bundle");
    const isSubFileA = a?.userData?.name!.includes("CAB-");
    const isSubFileB = b?.userData?.name!.includes("CAB-");

    if ((isBundleA || isBundleB) || (isSubFileA || isSubFileB)) {
        diffFlags = [];
    }

    if (diffFlags.length > 0) {
        const name = b?.label ?? a?.label ?? '(unknown)';

        if (!outDiffAssetEntry.has(name)) {
            outDiffAssetEntry.set(name, {
                name,
                class_name: b?.userData?.class_name ?? "",
                guid: b?.userData?.guid ?? "",
                a_hash: a?.userData?.hash ?? "",
                b_hash: b?.userData?.hash ?? "",
                a_size: a?.userData?.size ?? BigInt(0),
                b_size: b?.userData?.size ?? BigInt(0),
                size_diff: diffFlags.includes('size'),
                hash_diff: diffFlags.includes('hash'),
                isAdd: diffFlags.includes('add'),
                isMissing: diffFlags.includes('missing')
            });
        }
    }

    const children: AssetTreeNode[] = [];
    const needVisitChildren = !diffFlags.includes('missing') && !diffFlags.includes('add');
    if (needVisitChildren) {
        const childrenMapA = new Map(a?.children?.map(c => [c.label, c]) ?? []);
        const childrenMapB = new Map(b?.children?.map(c => [c.label, c]) ?? []);
        const allKeys = new Set([...childrenMapA.keys(), ...childrenMapB.keys()]);

        for (const key of allKeys) {
            const diffed = compareAssetTrees(childrenMapA.get(key) ?? null, childrenMapB.get(key) ?? null, outDiffAssetEntry);
            if (diffed) children.push(diffed);
        }
    }

    if (diffFlags.length === 0 && children.length === 0) return null;
    return {
        id: "",
        label: b?.label ?? a?.label ?? '(unknown)',
        diffFlags,
        userData: b?.userData ?? null,
        children
    };
}

export function collectAllAncestors(startRid: number, revAdj: Map<number, ParentEdge[]>) {
    const seen = new Set<number>();
    const stack = [startRid];
    while (stack.length) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const parents = revAdj.get(cur) ?? [];
        for (const p of parents) stack.push(p.parent);
    }
    return seen;
}

export function collectDiffFileInBundle(entriesA: AssetEntry[], assetLinkA: AssetLink[], entriesB: AssetEntry[], assetLinkB: AssetLink[], diffEntries: DiffEntry[]) {
    const p = new Profiler();

    function isBundleOrGroup(className: string | undefined): boolean {
        return className === "BuildLayout/Group" || className === "BuildLayout/Bundle";
    }

    function isFile(className: string | undefined): boolean {
        return className === "BuildLayout/ExplicitAsset" || className === "BuildLayout/DataFromOtherAsset";
    }

    p.start('build:indices');
    const byNameA = new Map(entriesA.map(e => [e.name!, e]));
    const byRidA = new Map(entriesA.map(e => [e.rid!, e]));
    const byNameB = new Map(entriesB.map(e => [e.name!, e]));
    const byRidB = new Map(entriesB.map(e => [e.rid!, e]));
    p.end('build:indices');

    p.start('build:linksFrom');
    const linksFromA = new Map<number, { id: number, type: string }[]>();
    for (const l of assetLinkA) {
        if (!linksFromA.has(l.from_id!)) linksFromA.set(l.from_id!, []);
        linksFromA.get(l.from_id!)!.push({ id: l.to_id!, type: l.link_type! });
    }
    const linksFromB = new Map<number, { id: number, type: string }[]>();
    for (const l of assetLinkB) {
        if (!linksFromB.has(l.from_id!)) linksFromB.set(l.from_id!, []);
        linksFromB.get(l.from_id!)!.push({ id: l.to_id!, type: l.link_type! });
    }
    p.end('build:linksFrom');

    p.start('scan:changedNames');
    const changedNames = new Set<string>();
    for (const d of diffEntries) {
        if (!d.hash_diff) continue;
        const a = byNameA.get(d.name);
        const b = byNameB.get(d.name);
        if ((a && isBundleOrGroup(a.class_name!)) || (b && isBundleOrGroup(b.class_name!))) {
            changedNames.add(d.name);
        }
    }
    p.end('scan:changedNames');

    p.start('build:bundlesRoots');
    const rootsA: { name: string; rid: number }[] = [];
    const rootsB: { name: string; rid: number }[] = [];
    for (const name of changedNames) {
        const a = byNameA.get(name);
        const b = byNameB.get(name);
        if (a && a.rid !== 0) rootsA.push({ name, rid: a.rid! });
        if (b && b.rid !== 0) rootsB.push({ name, rid: b.rid! });
    }
    p.end('build:bundlesRoots');

    type Asset = { name: string; hash: string; size: bigint, type: string };

    const collectSide = (
        roots: { name: string; rid: number }[],
        byRid: Map<number, AssetEntry>,
        linksFrom: Map<number, { id: number, type: string }[]>
    ): Map<string, Map<string, Asset>> => {
        p.start('collectSide');

        const out: Map<string, Map<string, Asset>> = new Map;
        const outSets = new Map<string, Set<Asset>>();

        const dfs = (
            rid: number,
            toLink: string,
            currentRoot: string,
            visited: Map<string, Set<number>>
        ) => {
            if (currentRoot !== "") {
                if (!visited.has(currentRoot)) {
                    visited.set(currentRoot, new Set<number>());
                }
                if (visited.get(currentRoot)?.has(rid)) {
                    return;
                }
                visited.get(currentRoot)?.add(rid);
            }

            const asset = byRid.get(rid);
            if (!asset) {
                return;
            }

            if (isBundleOrGroup(asset.class_name!)) {
                if (!changedNames.has(asset.name!)) {
                    return;
                }

                if (currentRoot !== "" && asset.name !== currentRoot) {
                    if (changedNames.has(asset.name!)) return;
                }

                currentRoot = asset.name!;
                if (!outSets.has(currentRoot)) {
                    outSets.set(currentRoot, new Set<Asset>());
                }

                const tos = linksFrom.get(rid);
                if (!tos) {
                    return;
                }
                for (const to of tos) {
                    dfs(to.id, to.type, currentRoot, visited);
                }
            }
            else if (isFile(asset.class_name!)) {
                if (!outSets.has(currentRoot)) {
                    outSets.set(currentRoot, new Set<Asset>());
                }
                outSets.get(currentRoot)!.add({ name: asset.name!, hash: asset.hash!, size: asset.size!, type: toLink });

                const tos = linksFrom.get(rid);
                if (!tos) {
                    return;
                }
                for (const to of tos) {
                    if (to.type.includes("_InternalReferencedOtherAssets")
                        || to.type.includes("_InternalReferencedExplicitAssets")
                        || to.type.includes("_ExternallyReferencedAssets")) {
                        dfs(to.id, to.type, currentRoot, visited);
                    }
                }
            }
        };

        p.start('collectSide:dfs');
        for (const root of roots) {
            dfs(root.rid, "", "", new Map<string, Set<number>>());
        }
        p.end('collectSide:dfs');

        p.start('collectSide:aggregate');
        for (const [root, set] of outSets.entries()) {
            out.set(root, new Map);
            for (const asset of set) {
                out.get(root)?.set(asset.name, asset);
            }
        }
        p.end('collectSide:aggregate');
        p.end('collectSide');
        return out;
    }

    function diffStrings(aMap: Map<string, Asset>, bMap: Map<string, Asset>, depA: Map<string, Map<string, Asset>>, depB: Map<string, Map<string, Asset>>) {
        const out = {
            added: [] as string[],
            addedRefTo: [] as string[],
            addedRefBy: [] as string[],
            addedFromBundle: [] as string[],
            moved: [] as string[],
            removed: [] as string[],
            sizeChanged: [] as string[],
            hashChanged: [] as string[],
        };

        const allKeys = new Set<string>([...aMap.keys(), ...bMap.keys()]);
        const moveToFiles = (file: string, dep: Map<string, Map<string, Asset>>) => {
            let move: string[] = []
            for (const [key, assetMap] of dep) {
                if (assetMap.get(file)) {
                    move.push(key);
                }
            }
            return move;
        };

        for (const k of allKeys) {
            const a = aMap.get(k);
            const b = bMap.get(k);

            if (a && b) {
                if (a.hash !== b.hash) {
                    if (a.size === b.size) {
                        out.hashChanged.push(`${a.name}[hash:${a.hash}→${b.hash}]`);
                    } else {
                        out.sizeChanged.push(`${a.name}[size:${a.size}→${b.size}]`);
                    }
                }
            } else if (!a && b) {
                let move: string[] = moveToFiles(b.name, depA);
                if (move.length > 0) {
                    out.moved.push(`${b.name}[${move.join(',')}]`);
                } else {
                    if (b.type.includes("_InternalReferencedExplicitAssets")) {
                        out.addedRefTo.push(`${b.name}`);
                    } else if (b.type.includes("_ExternallyReferencedAssets")) {
                        out.addedRefBy.push(`${b.name}`);
                    } else if (b.type.includes("_Bundle")) {
                        out.addedFromBundle.push(`${b.name}`);
                    } else {
                        out.added.push(`${b.name} [${b.type}]`);
                    }
                }
            } else if (a && !b) {
                out.removed.push(`${a.name}`);
            }
        }
        return out;
    }

    p.start('collectSide:A'); const depA = collectSide(rootsA, byRidA!, linksFromA); p.end('collectSide:A');
    p.start('collectSide:B'); const depB = collectSide(rootsB, byRidB!, linksFromB); p.end('collectSide:B');

    p.start('diff:dep');
    let depA_vs_depB: Map<string, Set<string>> = new Map();
    for (const key of changedNames) {
        const aAssets: Map<string, Asset> = depA.get(key) ?? new Map;
        const bAssets: Map<string, Asset> = depB.get(key) ?? new Map;

        const { added, addedRefTo, addedRefBy, addedFromBundle, moved, removed, sizeChanged, hashChanged } = diffStrings(aAssets, bAssets, depA, depB);
        const bucket = new Set<string>();

        for (const line of sizeChanged) bucket.add(`[Size CHANGED] ${line}`);
        for (const line of hashChanged) bucket.add(`[Hash CHANGED] ${line}`);
        for (const line of addedRefTo) bucket.add(`[Added RefTo] ${line}`);
        for (const line of addedRefBy) bucket.add(`[Added RefBy] ${line}`);
        for (const line of addedFromBundle) bucket.add(`[Added FromBundle] ${line}`);
        for (const line of added) bucket.add(`[Added] ${line}`);
        for (const line of moved) bucket.add(`[Moved] ${line}`);
        for (const line of removed) bucket.add(`[Removed] ${line}`);

        if (bucket.size > 0) depA_vs_depB.set(key, bucket);
    }
    p.end('diff:dep');

    p.report('collectDiff profile');

    return depA_vs_depB;
}

export function constructDiffEntries(entriesA: AssetEntry[], entriesB: AssetEntry[]) {
    const isValid = (entry: AssetEntry) =>
        entry.class_name !== "BuildLayout/File" &&
        entry.class_name !== "BuildLayout/SubFile";

    const mapA = new Map<string, AssetEntry>();
    const mapB = new Map<string, AssetEntry>();
    const diffs: DiffEntry[] = [];

    for (const entry of entriesA) {
        if (isValid(entry)) {
            mapA.set(entry.name!, entry);
        }
    }
    for (const entry of entriesB) {
        if (isValid(entry)) {
            mapB.set(entry.name!, entry);
        }
    }

    for (const [name, entryA] of mapA) {
        const entryB = mapB.get(name);
        if (entryB) {
            if (entryA.hash != entryB.hash) {
                diffs.push({
                    name,
                    class_name: entryA.class_name!,
                    guid: entryB.guid! ?? entryA.guid!,
                    a_hash: entryA.hash ?? "",
                    b_hash: entryB.hash ?? "",
                    a_size: entryA.size ?? BigInt(0),
                    b_size: entryB.size ?? BigInt(0),
                    size_diff: entryA.hash !== entryB.hash && entryA.size != entryB.size,
                    hash_diff: true,
                    isAdd: false,
                    isMissing: false,
                });
            }
            mapB.delete(name);
        } else {
            diffs.push({
                name,
                class_name: entryA.class_name!,
                guid: entryA.guid!,
                a_hash: entryA.hash ?? "",
                b_hash: "",
                a_size: entryA.size ?? BigInt(0),
                b_size: BigInt(0),
                size_diff: false,
                hash_diff: false,
                isAdd: false,
                isMissing: true,
            });
        }
    }

    for (const [name, entryB] of mapB) {
        diffs.push({
            name,
            class_name: entryB.class_name!,
            guid: entryB.guid!,
            a_hash: "",
            b_hash: entryB.hash ?? "",
            a_size: BigInt(0),
            b_size: entryB.size ?? BigInt(0),
            size_diff: false,
            hash_diff: false,
            isAdd: true,
            isMissing: false,
        });
    }

    return diffs;
}

export function buildRevAdj(
    links: { from_id: number | null; to_id: number | null; link_type: string | null }[]
): Map<number, ParentEdge[]> {
    const revAdj = new Map<number, ParentEdge[]>();
    for (const l of links) {
        if (l.to_id == null || l.from_id == null) continue;
        const arr = revAdj.get(l.to_id) ?? [];
        arr.push({ parent: l.from_id, type: l.link_type ?? "" });
        revAdj.set(l.to_id, arr);
    }
    return revAdj;
}

export function computeUpstreamChain(
    revAdj: Map<number, ParentEdge[]>,
    startRid: number,
    maxDepth: number,
    maxChildrenPerNode: number
): UpstreamLine[] {
    const out: UpstreamLine[] = [];
    const visited = new Set<number>();

    function dfs(rid: number, depth: number, linkType: string) {
        if (depth > maxDepth) return;
        if (visited.has(rid)) return;
        visited.add(rid);

        out.push({ rid, depth, isRoot: depth === 0, linkType: linkType || undefined });

        const parents = revAdj.get(rid) ?? [];
        const sliced = parents.slice(0, maxChildrenPerNode);
        if (parents.length > maxChildrenPerNode) {
            out.push({ rid: -1, depth: depth + 1, truncated: true });
        }
        for (const p of sliced) {
            dfs(p.parent, depth + 1, p.type);
        }
    }

    dfs(startRid, 0, "");
    return out;
}
