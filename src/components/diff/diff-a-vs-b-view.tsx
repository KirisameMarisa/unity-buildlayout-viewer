"use client";

import { useRef } from "react";
import { DiffEntry, DiffType, DiffTypeColorMap } from "@/lib/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import FilterRadioSelector from "@/components/ui/filter-radio-selector";

interface DiffAvsBViewProps {
    filteredDiffEntries: DiffEntry[];
    onFilterChange: (diffType: DiffType | null) => void;
}

export default function DiffAvsBView({ filteredDiffEntries, onFilterChange }: DiffAvsBViewProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filteredDiffEntries.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 10,
    });

    const AddLabel = (name: string) => (
        <span className="px-2 py-0.5 text-xs rounded-full border border-gray-500 text-white bg-gray-700">
            {name}
        </span>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                    <FilterRadioSelector
                        colorMap={DiffTypeColorMap}
                        onChage={(x) => onFilterChange(x as DiffType | null)}
                    />
                </div>
            </div>

            <div ref={parentRef} className="overflow-auto max-h-[65vh] border border-gray-600 rounded-md">
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const entry = filteredDiffEntries[virtualRow.index];

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
