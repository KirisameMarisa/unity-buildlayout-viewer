"use client";

import React, { useEffect, useState } from "react";
import { AssetEntry, UpstreamLine } from "@/lib/types";
import { fetchUpstreamChain } from "@/lib/client/api";
import { useNavigationStore } from "@/store/navigationStore";

export default function DependencyViewer() {
    const appState = useNavigationStore();
    const selectAsset = appState.selectAsset;
    if (!selectAsset) return null;

    const snapshot = selectAsset?.snapshot ?? null;
    const selectedRid = selectAsset?.asset?.rid ?? null;

    const [lines, setLines] = useState<UpstreamLine[]>([]);
    const [entries, setEntries] = useState<Record<string, AssetEntry>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [maxDepth, setMaxDepth] = useState<number>(6);
    const [maxChildrenPerNode, setMaxChildrenPerNode] = useState<number>(50);

    const LINK_STYLE: Record<string, string> = {
        "BuildLayout/Bundle_Group" : "text-yellow-300",
        "BuildLayout/DataFromOtherAsset_ReferencingAssets": "text-emerald-400",
        "BuildLayout/ExplicitAsset_ExternallyReferencedAssets": "text-sky-400",
        "BuildLayout/ExplicitAsset_ReferencingAssets": "text-cyan-400",
        "BuildLayout/Bundle_Dependencies": "text-amber-400",
        "BuildLayout/Bundle_DependentBundles": "text-fuchsia-400",
        "BuildLayout/File_Bundle": "text-rose-400",
        "BuildLayout/File_OtherAssets": "text-lime-400",
        "": "text-zinc-300",
    };

    useEffect(() => {
        if (!snapshot || !selectedRid) return;

        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchUpstreamChain(snapshot.id, selectedRid, maxDepth, maxChildrenPerNode);
                setLines(result.lines);
                setEntries(result.entries);
            } catch (e: any) {
                setError(e?.message ?? String(e));
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [snapshot, selectedRid, maxDepth, maxChildrenPerNode]);

    const rootEntry = entries[String(selectedRid)];

    return (
        <div className="p-3 space-y-3">
            <div className="flex items-center gap-3">
                <div className="text-sm">
                    <div className="text-zinc-400">Snapshot</div>
                    <div className="font-mono text-zinc-200">
                        <span className="ml-2 text-emerald-400">[{snapshot.platform}]</span>
                        <span className="ml-2 text-white">{snapshot.created_at} : {snapshot.player_version}</span>
                    </div>
                </div>
                <div className="text-sm">
                    <div className="text-zinc-400">Root (selected)</div>
                    <div className="font-mono text-zinc-200">
                        {rootEntry?.name}
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1">
                        Depth
                        <input
                            className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5"
                            type="number" value={maxDepth} min={0} max={99}
                            onChange={e => setMaxDepth(Math.max(0, Number(e.target.value)))}
                        />
                    </label>
                    <label className="flex items-center gap-1">
                        Max per node
                        <input
                            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5"
                            type="number" value={maxChildrenPerNode} min={1} max={10000}
                            onChange={e => setMaxChildrenPerNode(Math.max(1, Number(e.target.value)))}
                        />
                    </label>
                </div>
            </div>

            {loading && <div className="text-sm text-zinc-400">Loading...</div>}
            {error && <div className="text-sm text-red-400">Error: {error}</div>}

            <div className="border border-zinc-700 rounded p-2 bg-zinc-900 max-h-[85vh] overflow-auto font-mono text-sm">
                {lines.map((ln, i) => {
                    if (ln.truncated) {
                        return (
                            <div key={`t-${i}`} style={{ paddingLeft: (ln.depth * 14) }}>
                                … and more
                            </div>
                        );
                    }
                    const e = entries[String(ln.rid)];
                    const label = e?.name ?? `RID:${ln.rid}`;
                    const link_style = LINK_STYLE[ln.linkType ?? ""];
                    return (
                        <div key={i} style={{ paddingLeft: (ln.depth * 14) }}>
                            {ln.isRoot ? (
                                <span className="text-zinc-200">●</span>
                            ) : (
                                <span className={link_style}>↳</span>
                            )}
                            {label} <span className={link_style}>{ln.linkType ? `[${ln.linkType}]` : ""}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
