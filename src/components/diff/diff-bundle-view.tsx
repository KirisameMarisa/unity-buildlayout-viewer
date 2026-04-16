"use client";

import { useRef } from "react";
import { BundleDiffType, BundleDiffTypeColorMap, Filter, TreeRow } from "@/lib/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import FilterRadioSelector from "@/components/ui/filter-radio-selector";
import MultiComboBox from "@/components/ui/multi-combobox";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface DiffBundleViewProps {
    diffBundleMap: Map<string, Set<string>> | undefined;
    filteredBundleDiffs: [TreeRow[], TreeRow[]];
    filter: Filter | undefined;
    onFilterChange: (partial: Partial<Filter>) => void;
}

export default function DiffBundleView({ diffBundleMap, filteredBundleDiffs, filter, onFilterChange }: DiffBundleViewProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [onlyParents, allRows] = filteredBundleDiffs;

    const virtualizer = useVirtualizer({
        count: allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 0,
    });

    if (diffBundleMap === undefined || diffBundleMap.size === 0) {
        return <div />;
    }

    const virtualItems = virtualizer.getVirtualItems();
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
    const nextParentTopRel = nextParentVI != null ? nextParentVI.start - scrollTop : Infinity;
    const pushUp = Math.max(0, 32 - nextParentTopRel);
    const translateY = pushUp > 0 ? -pushUp : 0;

    const bundleKeys = onlyParents.map(x => x.label);

    return (
        <div>
            <MultiComboBox
                label="Filter Bundle"
                options={bundleKeys}
                value={filter?.bundleKeys ?? []}
                setValue={(x) => onFilterChange({ bundleKeys: x })}
            />

            <FilterRadioSelector
                colorMap={BundleDiffTypeColorMap}
                onChage={(x) => onFilterChange({ bundleDiffType: x as BundleDiffType })}
            />

            <div ref={parentRef} className="overflow-auto max-h-[60vh] border border-gray-600 rounded-md" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}>
                {/* sticky header overlay (one at a time) */}
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

                {/* virtual list */}
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {virtualItems.map((virtualRow) => {
                        const row = allRows[virtualRow.index];
                        const isParent = row.kind === 'parent';

                        return (
                            <div
                                key={virtualRow.key}
                                ref={virtualizer.measureElement}
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
                                            Copy row
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
}
