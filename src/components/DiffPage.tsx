"use client";

import { useEffect, useState, useRef, useMemo } from "react";

import "@xyflow/react/dist/style.css";
import { DiffEntry, Filter, DiffTypeColorMap, DiffType, Snapshot, AssetEntry, TreeRow, BundleDiffTypeColorMap, BundleDiffType } from "@/lib/types";
import SnapshotDiffSelector from "./custom-ui/SnapshotDiffSelector";
import ProgressBar from "./custom-ui/ProgressBar";
import SearchBox from "./ui/search-box";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FilterRadioSelector from "./custom-ui/FilterRadioSelector";
import { useVirtualizer } from "@tanstack/react-virtual";
import { fetchDiff } from "@/lib/client/api";
import Box from "@mui/material/Box";
import { SimpleTreeView, TreeItem } from "@mui/x-tree-view";
import { BuildDiffResultText } from "@/lib/utils";
import MultiComboBox from "./ui/multi-combobox";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function DiffPage() {
    const [diffEntries, setDiffEntries] = useState<DiffEntry[]>([]);
    const [diffBundleMap, setdiffBundleMap] = useState<Map<string, Set<string>>>();

    const [progress, setProgress] = useState<number>(0);
    const [filter, setFilter] = useState<Filter>();

    const [snapshotA, setSnapshotA] = useState<Snapshot>();
    const [snapshotB, setSnapshotB] = useState<Snapshot>();

    useEffect(() => {
        if (snapshotA?.id == null || snapshotB?.id == null) return;
        (async () => {
            setProgress(0.2);
            try {
                const { diffEntries, diffBundleMap } = await fetchDiff(snapshotA.id, snapshotB.id);
                setDiffEntries(diffEntries);
                setdiffBundleMap(diffBundleMap);
                setProgress(1);
            } catch (e) {
                console.error("fetchDiff error", e);
                setProgress(0);
            }
        })();
    }, [snapshotA, snapshotB]);

    function handleExport() {
        function downloadTextFile(filename: string, text: string) {
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }

        function fileSafe(s: string) {
            return s.replace(/[\\/:*?"<>|]/g, "_");
        }

        const aLabel = snapshotA ? `${snapshotA.tag}.${snapshotA.player_version}` : "A";
        const bLabel = snapshotB ? `${snapshotB.tag}.${snapshotB.player_version}` : "B";
        const metaA = snapshotA ? { platform: snapshotA.platform, tag: snapshotA.tag, version: snapshotA.player_version, buildTime: snapshotA.build_time, comment: snapshotA.comment } : undefined;
        const metaB = snapshotB ? { platform: snapshotB.platform, tag: snapshotB.tag, version: snapshotB.player_version, buildTime: snapshotB.build_time, comment: snapshotB.comment } : undefined;

        const text = BuildDiffResultText(diffBundleMap!, diffEntries, aLabel, bLabel, metaA, metaB);
        const fname = `${fileSafe(aLabel)}_vs_${fileSafe(bLabel)}.txt`;
        downloadTextFile(fname, text);
    }

    const filteredDiffEntries = useMemo<DiffEntry[]>(() => {
        if (filter === undefined) {
            return diffEntries;
        }

        return diffEntries.filter((e) => {
            const matchesDiffType = () => {
                switch (filter.diffType) {
                    case 'add': return e.isAdd;
                    case 'missing': return e.isMissing;
                    case 'hash': return e.hash_diff;
                    case 'size': return e.size_diff;
                }
                return true;
            }
            const matchesSearch = () => {
                if (!filter.searchText) return true;
                return e.name.toLowerCase().includes(filter.searchText.toLowerCase());
            };
            const matchesGuid = () => {
                if (!filter.searchText) return true;
                return e.guid != null && e.guid.toLowerCase().includes(filter.searchText.toLowerCase());
            };
            return matchesDiffType() && (matchesSearch() || matchesGuid());
        });
    }, [diffEntries, filter])

    const filteredBundleDiffs = useMemo<[TreeRow[], TreeRow[]]>(() => {
        const rowColorMap = Object.entries(BundleDiffTypeColorMap)

        const onlyParents: TreeRow[] = [];
        const allRows: TreeRow[] = [];

        if (filter === undefined || diffBundleMap === undefined) {
            return [onlyParents, allRows];
        }

        for (const [bundle, set] of diffBundleMap.entries()) {
            onlyParents.push({ kind: 'parent', id: bundle, label: bundle, depth: 0, color: "" });

            const parentHit = filter.bundleKeys && filter.bundleKeys.length > 0 ? filter.bundleKeys.includes(bundle) : true;
            if (!parentHit) {
                continue;
            }
            const children = Array.from(set).sort((a, b) => a.localeCompare(b));

            // 子のフィルタ
            const childHits = children.filter(c => {
                const matchSearchText = c.toLowerCase().includes(filter.searchText?.toLowerCase() ?? "");
                const matchType = c.includes(filter.bundleDiffType ?? "");
                return matchSearchText && matchType;
            });

            if (childHits.length > 0) {
                allRows.push({ kind: 'parent', id: bundle, label: bundle, depth: 0, color: "" });
                for (const c of childHits) {
                    const find = rowColorMap.find(([key, color], i) => c.includes(key));

                    allRows.push({
                        kind: 'child',
                        id: `${bundle}__${c}`,
                        label: c,
                        depth: 1,
                        parent: bundle,
                        color: find ? find[1] : ""
                    });
                }
            }
        }
        return [onlyParents, allRows];
    }, [diffBundleMap, filter]);

    const parentRef = useRef<HTMLDivElement>(null);
    const filteredDiffEntriesVirtualizer = useVirtualizer({
        count: filteredDiffEntries.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 10,
    });

    const filteredBundleDiffsVirtualizer = useVirtualizer({
        count: filteredBundleDiffs[1].length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 0,
    });

    const DiffAvsBView = () => {
        const AddLabel = (name: string) => {
            return (
                <span className="px-2 py-0.5 text-xs rounded-full border border-gray-500 text-white bg-gray-700">
                    {name}
                </span>
            );
        }
        return (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                        <FilterRadioSelector
                            colorMap={DiffTypeColorMap}
                            onChage={(x) =>
                                setFilter((prev) => ({ ...prev, diffType: x as DiffType }))
                            }
                        />
                    </div>

                </div>

                <div ref={parentRef} className="overflow-auto max-h-[65vh] border border-gray-600 rounded-md">
                    <div style={{ height: `${filteredDiffEntriesVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {filteredDiffEntriesVirtualizer.getVirtualItems().map((virtualRow) => {
                            const object = filteredDiffEntries;
                            const entry = object[virtualRow.index];

                            return (
                                <div
                                    key={virtualRow.key}
                                    ref={filteredDiffEntriesVirtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                        height: `${virtualRow.size}px`,
                                    }}
                                >
                                    <div className="flex flex-col border-b border-gray-700 px-2 py-1 hover:bg-gray-800 truncate">
                                        <div className="truncate text-white">
                                            <span className="px-1">■</span>
                                            {entry.name}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {entry.isAdd && AddLabel("add")}
                                            {entry.isMissing && AddLabel("missing")}
                                            {entry.hash_diff && AddLabel("hash")}
                                            {entry.size_diff && AddLabel(`size A:${entry.a_size}  --->  B:${entry.b_size}`)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    const DiffBundleView = () => {
        if (diffBundleMap === undefined || diffBundleMap.size == 0) {
            return (<div></div>);
        }

        const [onlyParents, allRows] = filteredBundleDiffs;
        const virtualItems = filteredBundleDiffsVirtualizer.getVirtualItems();
        const firstIndex = virtualItems[0]?.index ?? 0;
        const getCurrentParentIndex = (i: number) => {
            for (let k = i; k >= 0; k--) {
                if (allRows[k]?.kind === "parent") return k;
            }
            return -1;
        };
        const currentParentIdx = getCurrentParentIndex(firstIndex);
        const currentParent =
            currentParentIdx >= 0 && allRows[currentParentIdx].kind === "parent"
                ? allRows[currentParentIdx]
                : undefined;

        const scrollTop = parentRef.current?.scrollTop ?? 0;
        const nextParentVI = virtualItems.find(
            (vi) => vi.index > currentParentIdx && allRows[vi.index]?.kind === "parent"
        );

        const nextParentTopRel =
            nextParentVI != null ? nextParentVI.start - scrollTop : Infinity;
        const pushUp = Math.max(0, 32 - nextParentTopRel);
        const translateY = pushUp > 0 ? -pushUp : 0;

        const bundleKeys = onlyParents.map(x => x.label);

        return (
            <div>
                <MultiComboBox
                    label="Filter Bundle"
                    options={bundleKeys}
                    value={filter?.bundleKeys ?? []}
                    setValue={(x) => setFilter((prev) => ({ ...prev, bundleKeys: x }))} />

                <FilterRadioSelector
                    colorMap={BundleDiffTypeColorMap}
                    onChage={(x) =>
                        setFilter((prev) => ({ ...prev, bundleDiffType: x as BundleDiffType }))
                    }
                />

                <div
                    ref={parentRef}
                    className="overflow-auto max-h-[60vh] border border-gray-600 rounded-md"
                >
                    {/* ← オーバーレイの sticky ヘッダ（常に1枚だけ） */}
                    {currentParent && (
                        <div className="sticky top-0 z-20 pointer-events-none">
                            <div
                                className="bg-gray-900 border-b border-gray-700 flex items-center text-white font-medium"
                                style={{ height: 32, transform: `translateY(${translateY}px)` }}
                            >
                                <span className="truncate">{currentParent.label}</span>
                            </div>
                        </div>
                    )}

                    {/* 既存の仮想リスト */}
                    <div style={{ height: `${filteredBundleDiffsVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {virtualItems.map((virtualRow) => {
                            const row = allRows[virtualRow.index];
                            const isParent = row.kind === 'parent';

                            return (
                                <div
                                    key={virtualRow.key}
                                    ref={filteredBundleDiffsVirtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                        height: `${virtualRow.size}px`,
                                    }}
                                >
                                    <ContextMenu>
                                        <ContextMenuTrigger asChild>
                                            <div
                                                className={[
                                                    "flex items-center border-b border-gray-700 px-2",
                                                    isParent ? "hover:bg-gray-800 font-medium" : "hover:bg-gray-800"
                                                ].join(" ")}
                                                style={{ paddingLeft: `${row.depth * 32}px`, height: 32 }}
                                            >

                                                {isParent ? (
                                                    <span className="inline-block select-none" />
                                                ) : (
                                                    <span className="inline-block text-gray-400 select-none">•</span>
                                                )}
                                                <span className={`truncate ${row.color}`}>
                                                    {row.label}
                                                </span>
                                            </div>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem onClick={() => {
                                                navigator.clipboard.writeText(row.label);
                                            }}>
                                                行をコピーする
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <ProgressBar progress={progress} />

            <div className="flex gap-4 items-end">
                <SnapshotDiffSelector
                    onChangeSnap={(a, b) => {
                        setSnapshotA(a);
                        setSnapshotB(b);
                    }} />
            </div>
            <div>
                <SearchBox
                    onChangedText={(x) =>
                        setFilter((prev) => ({ ...prev, searchText: x }))
                    }
                />
                <Tabs defaultValue="a_vs_b">
                    <div className="flex items-center justify-between mb-2">
                        <TabsList>
                            <TabsTrigger value="a_vs_b">A vs B</TabsTrigger>
                            <TabsTrigger value="bundle_diff">Bundle diff</TabsTrigger>
                        </TabsList>
                        <button
                            onClick={handleExport}
                            className="ml-3 px-3 py-1 rounded border border-gray-500 text-white hover:bg-white hover:text-black"
                            title="A_vs_B.txt を出力"
                        >
                            Export
                        </button>
                    </div>
                    <TabsContent value="a_vs_b">{DiffAvsBView()}</TabsContent>
                    <TabsContent value="bundle_diff">{DiffBundleView()}</TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
