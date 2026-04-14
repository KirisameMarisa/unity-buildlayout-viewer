"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { AssetEntry, classColorMap, Filter, Snapshot } from '@/lib/types';
import SnapshotSearchSelector from './SnapshotSearchSelector';
import SearchBox from '../ui/search-box';
import FilterRadioSelector from '../ui/filter-radio-selector';
import ProgressBar from '../ui/progress-bar';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useNavigationStore } from '@/store/navigationStore';

export default function SearchPage() {

    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<AssetEntry[]>([]);
    const [filter, setFilter] = useState<Filter>();
    const [progress, setProgress] = useState<number>(0);
    const [extFilterMap, setExtFilterMap] = useState<Record<string, string>>({});

    const [totalEntryCount, setTotalEntryCount] = useState<number>();
    const [entryCount, setEntryCount] = useState<number>();

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredEntries.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 36,
        overscan: 10,
    });

    const collator = useMemo(
        () => new Intl.Collator(undefined, { sensitivity: "base" }),
        []
    );

    function getExt(name: string): string {
        const i = name.lastIndexOf(".");
        return i >= 0 ? name.slice(i) : "";
    }

    function toWildcardRegex(pattern: string): RegExp | null {
        try {
            let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
            if (pattern.includes("*")) {
                escaped = escaped.replace(/\*/g, ".*");
            } else {
                return null;
            }
            return new RegExp(escaped, "i");
        } catch {
            return null;
        }
    }

    useEffect(() => {
        const entry = filteredEntries.length === 0 ? assetEntries : filteredEntries;
        let extMap: Record<string, string> = {}
        entry.forEach((e) => {
            const ext = getExt(e.name!);
            if (ext !== "")
                extMap[ext] = "text-white";
        })

        setExtFilterMap(extMap);
        setTotalEntryCount(assetEntries.length);
        setEntryCount(entry.length);
    }, [assetEntries, filteredEntries])

    useEffect(() => {
        const f = filter;
        let result = assetEntries;

        if (f) {
            const wantsClass = !!f.className;
            const wantsExt = !!f.extName;
            const q = (f.searchText ?? "").trim();
            const hasWildcard = q.includes("*");
            const qLower = q.toLowerCase();
            const rx = q ? (hasWildcard ? toWildcardRegex(q) : null) : null;

            // filter
            result = result.filter((e) => {
                if (wantsClass && e.class_name !== f!.className) return false;
                if (wantsExt && getExt(e.name!) !== f!.extName) return false;

                if (q) {
                    if (rx) {
                        if (!rx.test(e.name!) && !(e.guid && rx.test(e.guid))) return false;
                    } else {
                        // fast path (no wildcard): includes(lowercase)
                        const nameLower = e.name!.toLowerCase();
                        const guidLower = e.guid ? e.guid.toLowerCase() : "";

                        if (!nameLower.includes(qLower) && !guidLower.includes(qLower))
                            return false;
                    }
                }
                return true;
            });
        }

        // non-destructive sort (do not mutate original)
        if (result.length > 1) {
            result = result.slice().sort((a, b) => collator.compare(a.name!, b.name!));
        }

        setFilteredEntries(result);
    }, [filter, assetEntries, collator]);

    const VirtualScrollTable = () => {
        return (
            <div
                ref={parentRef}
                className="overflow-auto max-h-[69vh] border border-gray-600 rounded-md"
            >
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const object = filteredEntries;
                        const entry = object[virtualRow.index];
                        const color = classColorMap[entry.class_name!] ?? "bg-gray-700";

                        return (
                            <div
                                key={virtualRow.key}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger asChild>
                                        <div className={`flex border-b border-gray-700 px-4 py-2 hover:bg-gray-800 truncate`}>
                                            <span className={`${color} px-1`}>■</span>
                                            <span className="text-white truncate">{entry.name}</span>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem onClick={() => {
                                            useNavigationStore.getState().setSelectAsset({
                                                snapshot: snapshot!,
                                                asset: entry
                                            });
                                            useNavigationStore.getState().setPage("depend");
                                        }}>
                                            Open dependency details
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div>
            <ProgressBar progress={progress} />

            <div className="flex gap-4 items-end">
                <SnapshotSearchSelector
                    setAssetEntries={x => {
                        setAssetEntries(x);
                        setFilteredEntries(x);
                    }}
                    setProgress={setProgress}
                    onChangeSnapshot={(x) => setSnapshot(x)}
                />
            </div>
            <div>
                <SearchBox
                    onChangedText={(x) =>
                        setFilter((prev) => ({ ...prev, searchText: x }))
                    }
                />
                <FilterRadioSelector
                    colorMap={classColorMap}
                    onChage={(x) =>
                        setFilter((prev) => ({ ...prev, className: x }))
                    }
                />
                <FilterRadioSelector
                    colorMap={extFilterMap}
                    onChage={(x) =>
                        setFilter((prev) => ({ ...prev, extName: x }))
                    }
                />

                <div className="relative">
                    <div
                        className="absolute top-2 right-2 z-20 pointer-events-none"
                        aria-live="polite"
                    >
                        <span className="px-2 py-1 rounded-full text-xs text-white bg-black/60 border border-white/20 backdrop-blur">
                            {entryCount} / {totalEntryCount}
                        </span>
                    </div>
                </div>

                {VirtualScrollTable()}
            </div>
        </div>
    );
};
