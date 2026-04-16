"use client";

import React, { useRef } from 'react';
import { AssetEntry, classColorMap, Snapshot } from '@/lib/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useNavigationStore } from '@/store/navigation-store';

interface AssetListProps {
    filteredEntries: AssetEntry[];
    snapshot: Snapshot | null;
}

export default function AssetList({ filteredEntries, snapshot }: AssetListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredEntries.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 36,
        overscan: 10,
    });

    return (
        <div
            ref={parentRef}
            className="overflow-auto max-h-[69vh] border border-gray-600 rounded-md"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
        >
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const entry = filteredEntries[virtualRow.index];
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
                                    <div className="flex border-b border-gray-700 px-4 py-2 hover:bg-gray-800 truncate">
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
