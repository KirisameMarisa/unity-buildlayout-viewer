"use client";

import { useEffect, useState, useMemo } from "react";
import { DiffEntry, Filter, DiffType, Snapshot, TreeRow, BundleDiffTypeColorMap } from "@/lib/types";
import SnapshotDiffSelector from "./snapshot-diff-selector";
import ProgressBar from "@/components/ui/progress-bar";
import SearchBox from "@/components/ui/search-box";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchDiff } from "@/lib/api";
import { BuildDiffResultText } from "@/lib/utils";
import DiffAvsBView from "./diff-a-vs-b-view";
import DiffBundleView from "./diff-bundle-view";

export default function DiffPage() {
    const [diffEntries, setDiffEntries] = useState<DiffEntry[]>([]);
    const [diffBundleMap, setDiffBundleMap] = useState<Map<string, Set<string>>>();

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
                setDiffBundleMap(diffBundleMap);
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
        downloadTextFile(`${fileSafe(aLabel)}_vs_${fileSafe(bLabel)}.txt`, text);
    }

    const filteredDiffEntries = useMemo<DiffEntry[]>(() => {
        if (filter === undefined) return diffEntries;
        return diffEntries.filter((e) => {
            const matchesDiffType = () => {
                switch (filter.diffType) {
                    case 'add': return e.isAdd;
                    case 'missing': return e.isMissing;
                    case 'hash': return e.hash_diff;
                    case 'size': return e.size_diff;
                }
                return true;
            };
            const matchesSearch = () => !filter.searchText || e.name.toLowerCase().includes(filter.searchText.toLowerCase());
            const matchesGuid = () => !filter.searchText || (e.guid != null && e.guid.toLowerCase().includes(filter.searchText.toLowerCase()));
            return matchesDiffType() && (matchesSearch() || matchesGuid());
        });
    }, [diffEntries, filter]);

    const filteredBundleDiffs = useMemo<[TreeRow[], TreeRow[]]>(() => {
        const rowColorMap = Object.entries(BundleDiffTypeColorMap);
        const onlyParents: TreeRow[] = [];
        const allRows: TreeRow[] = [];

        if (filter === undefined || diffBundleMap === undefined) return [onlyParents, allRows];

        for (const [bundle, set] of diffBundleMap.entries()) {
            onlyParents.push({ kind: 'parent', id: bundle, label: bundle, depth: 0, color: "" });

            const parentHit = filter.bundleKeys && filter.bundleKeys.length > 0 ? filter.bundleKeys.includes(bundle) : true;
            if (!parentHit) continue;

            const children = Array.from(set).sort((a, b) => a.localeCompare(b));
            const childHits = children.filter(c => {
                const matchSearchText = c.toLowerCase().includes(filter.searchText?.toLowerCase() ?? "");
                const matchType = c.includes(filter.bundleDiffType ?? "");
                return matchSearchText && matchType;
            });

            if (childHits.length > 0) {
                allRows.push({ kind: 'parent', id: bundle, label: bundle, depth: 0, color: "" });
                for (const c of childHits) {
                    const find = rowColorMap.find(([key]) => c.includes(key));
                    allRows.push({ kind: 'child', id: `${bundle}__${c}`, label: c, depth: 1, parent: bundle, color: find ? find[1] : "" });
                }
            }
        }
        return [onlyParents, allRows];
    }, [diffBundleMap, filter]);

    return (
        <div>
            <ProgressBar progress={progress} />

            <div className="flex gap-4 items-end">
                <SnapshotDiffSelector onChangeSnap={(a, b) => { setSnapshotA(a); setSnapshotB(b); }} />
            </div>
            <div>
                <SearchBox
                    onChangedText={(x) => setFilter((prev) => ({ ...prev, searchText: x }))}
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
                    <TabsContent value="a_vs_b">
                        <DiffAvsBView
                            filteredDiffEntries={filteredDiffEntries}
                            onFilterChange={(diffType) => setFilter((prev) => ({ ...prev, diffType: diffType as DiffType }))}
                        />
                    </TabsContent>
                    <TabsContent value="bundle_diff">
                        <DiffBundleView
                            diffBundleMap={diffBundleMap}
                            filteredBundleDiffs={filteredBundleDiffs}
                            filter={filter}
                            onFilterChange={(partial) => setFilter((prev) => ({ ...prev, ...partial }))}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
