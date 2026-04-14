"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { AssetEntry, classColorMap, Filter, Snapshot } from '@/lib/types';
import SnapshotSearchSelector from './snapshot-search-selector';
import SearchBox from '@/components/ui/search-box';
import FilterRadioSelector from '@/components/ui/filter-radio-selector';
import ProgressBar from '@/components/ui/progress-bar';
import AssetList from './asset-list';

export default function SearchPage() {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<AssetEntry[]>([]);
    const [filter, setFilter] = useState<Filter>();
    const [progress, setProgress] = useState<number>(0);
    const [extFilterMap, setExtFilterMap] = useState<Record<string, string>>({});

    const [totalEntryCount, setTotalEntryCount] = useState<number>();
    const [entryCount, setEntryCount] = useState<number>();

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
        const extMap: Record<string, string> = {};
        entry.forEach((e) => {
            const ext = getExt(e.name!);
            if (ext !== "") extMap[ext] = "text-white";
        });
        setExtFilterMap(extMap);
        setTotalEntryCount(assetEntries.length);
        setEntryCount(entry.length);
    }, [assetEntries, filteredEntries]);

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
                        if (!nameLower.includes(qLower) && !guidLower.includes(qLower)) return false;
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
                    onChangedText={(x) => setFilter((prev) => ({ ...prev, searchText: x }))}
                />
                <FilterRadioSelector
                    colorMap={classColorMap}
                    onChage={(x) => setFilter((prev) => ({ ...prev, className: x }))}
                />
                <FilterRadioSelector
                    colorMap={extFilterMap}
                    onChage={(x) => setFilter((prev) => ({ ...prev, extName: x }))}
                />
                <div className="relative">
                    <div className="absolute top-2 right-2 z-20 pointer-events-none" aria-live="polite">
                        <span className="px-2 py-1 rounded-full text-xs text-white bg-black/60 border border-white/20 backdrop-blur">
                            {entryCount} / {totalEntryCount}
                        </span>
                    </div>
                </div>
                <AssetList filteredEntries={filteredEntries} snapshot={snapshot} />
            </div>
        </div>
    );
}
