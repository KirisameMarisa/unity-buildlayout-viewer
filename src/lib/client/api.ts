import { AssetEntry, AssetLink, DiffEntry, Snapshot, UploadStepMsg, UpstreamLine } from "../types";

export async function fetchDiff(snapAId: number, snapBId: number): Promise<{ diffEntries: DiffEntry[]; diffBundleMap: Map<string, Set<string>> }> {
    const res = await fetch(`/api/diff?snap_a=${snapAId}&snap_b=${snapBId}`)
    if (!res.ok) throw new Error(`fetchDiff failed: ${res.status}`)
    const raw = await res.json()
    const diffBundleMap = new Map<string, Set<string>>(
        Object.entries(raw.diffBundleMap).map(([k, v]) => [k, new Set(v as string[])])
    )
    return { diffEntries: raw.diffEntries as DiffEntry[], diffBundleMap }
}

export async function fetchEntriesForSnapshot(snapshot: number): Promise<AssetEntry[]> {
    const [entriesRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/${snapshot}/entries`),
    ]);

    const entries: AssetEntry[] = await entriesRes.json();
    return entries;
}

export async function fetchLinksForSnapshot(snapshot: number): Promise<AssetLink[]> {
    const [linksRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/${snapshot}/links`),
    ]);

    const links: AssetLink[] = await linksRes.json();
    return links;
}

export async function fetchLinksAndEntriesForSnapshot(snapshot: number): Promise<{ entries: AssetEntry[]; links: AssetLink[] }> {
    const [entriesRes, linksRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/${snapshot}/entries`),
        fetch(`/api/analyze/buildlayout/${snapshot}/links`),
    ]);

    const entries: AssetEntry[] = await entriesRes.json();
    const links: AssetLink[] = await linksRes.json();
    return { entries, links };
}

export async function getAssetEntry(snapshot: number, rid: number): Promise<AssetEntry> {
    const [entryRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/${snapshot}/${rid}/entry`),
    ]);

    const entry: AssetEntry = await entryRes.json();
    return entry;
}

export async function getPlatforms(): Promise<string[]> {
    const [snapPlatformRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/snapshots/platforms`),
    ]);

    const platforms: string[] = [];
    for (const v of await snapPlatformRes.json()) {
        platforms.push(v.platform);
    }
    return platforms;
}

export async function getReleaseTags(platform: string): Promise<string[]> {
    const [snapRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/snapshots/tags?platform=${platform}`),
    ]);

    const manualUpload = "Manual Upload from Web";

    let releaseTags: string[] = [];
    for (const v of await snapRes.json()) {
        releaseTags.push(v.tag);
    }
    releaseTags = [...releaseTags, manualUpload]
    return releaseTags;
}

export async function getSnapshots(platform: string, releaseTag: string, all: boolean = false): Promise<Snapshot[]> {
    const paramPlatform = platform !== "" ? `?platform=${platform}` : "";
    const paramReleaseTag = releaseTag !== "" ? `&tag=${releaseTag}` : "";
    const paramAll = all ? `&all` : "";

    const [snapRes] = await Promise.all([
        fetch(`/api/analyze/buildlayout/snapshots${paramPlatform}${paramReleaseTag}${paramAll}`),
    ]);

    const snapshots: Snapshot[] = await snapRes.json();
    return snapshots;
}

export async function EditSnapshot(id: number, tag: string, comment: string, del: boolean): Promise<boolean> {
    const [response] = await Promise.all([
        fetch(`/api/analyze/buildlayout/snapshots/edit/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag: tag, comment: comment, del: del })
        }),
    ]);
    return true;
}

export async function uploadBuildLayout(uuid: string, File: File, tag: string, comment: string): Promise<boolean> {
    const formData = new FormData();
    formData.append('file', File);
    formData.append('tag', tag);
    formData.append('comment', comment);
    formData.append('uuid', uuid);

    const res = await fetch("/api/analyze/buildlayout/upload", {
        method: "POST",
        body: formData,
    });

    if (res.ok) {
        const data = await res.json();
        return true;
    } else {
        const err = await res.json();
        return false;
    }
}

export async function prepareUpload(): Promise<{ uuid: string }> {
    const res = await fetch("/api/analyze/buildlayout/upload/prepare", {
        method: "POST",
    });

    if (!res.ok) {
        throw new Error(`prepareUpload failed: ${res.status}`);
    }
    return res.json();
}

export async function getUploadProgress(uuid: string): Promise<{ uuid: string; step: string }> {
    const res = await fetch(`/api/analyze/buildlayout/upload/progress?uuid=${uuid}`, {
        method: "GET",
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`getUploadProgress failed: ${res.status}`);
    }

    return res.json();
}

export async function clearUpload(uuid: string): Promise<void> {
    const res = await fetch(`/api/analyze/buildlayout/upload/clear?uuid=${uuid}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error(`clearUpload failed: ${res.status}`);
    }
}

export async function fetchUpstreamChain(
    snapshotId: number,
    rid: number,
    maxDepth: number,
    maxChildren: number
): Promise<{ lines: UpstreamLine[]; entries: Record<string, AssetEntry> }> {
    const res = await fetch(
        `/api/analyze/buildlayout/${snapshotId}/upstream-chain/${rid}?maxDepth=${maxDepth}&maxChildren=${maxChildren}`
    );
    if (!res.ok) throw new Error(`fetchUpstreamChain failed: ${res.status}`);
    return res.json();
}
