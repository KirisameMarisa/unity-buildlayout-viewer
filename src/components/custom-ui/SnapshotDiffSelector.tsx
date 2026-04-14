"use client";

import React, { useEffect, useMemo } from 'react';
import { Snapshot } from '@/lib/types';
import { formatSnapshotLabel } from '@/lib/utils';
import ComboBox from '../ui/combo-box';
import { useSelectorStore } from '@/store/selectorStore';
import { usePlatforms, useSnapshotData } from '@/hooks/useSnapshotData';

interface SnapshotDiffSelectorProps {
    onChangeSnap?: (snapA: Snapshot, snapB: Snapshot) => void;
}

export default function SnapshotDiffSelector({ onChangeSnap }: SnapshotDiffSelectorProps) {
    const store = useSelectorStore();
    const { diffPlatform, diffSelectorA, diffSelectorB } = store;

    const platforms = usePlatforms();
    const snapA = useSnapshotData(diffPlatform, diffSelectorA.releaseTag);
    const snapB = useSnapshotData(diffPlatform, diffSelectorB.releaseTag);

    const selectedSnapshotA = useMemo(
        () => snapA.snapshots.find(s => formatSnapshotLabel(s) === diffSelectorA.selectedResult),
        [snapA.snapshots, diffSelectorA.selectedResult]
    );
    const selectedSnapshotB = useMemo(
        () => snapB.snapshots.find(s => formatSnapshotLabel(s) === diffSelectorB.selectedResult),
        [snapB.snapshots, diffSelectorB.selectedResult]
    );

    useEffect(() => {
        if (selectedSnapshotA == null || selectedSnapshotB == null) return;
        onChangeSnap?.(selectedSnapshotA, selectedSnapshotB);
    }, [selectedSnapshotA, selectedSnapshotB]);

    return (
        <div className="flex gap-4 items-end">
            <div style={{ width: '200px' }}>
                <ComboBox label="Platform" options={platforms} value={diffPlatform} setValue={store.setDiffPlatform} />
            </div>
            <div className="flex gap-4 border border-gray-500">
                <div style={{ width: '180px' }}>
                    <ComboBox label="Release Tag A" options={snapA.releaseTags} value={diffSelectorA.releaseTag} setValue={(v) => store.setDiffSelectorA({ releaseTag: v })} />
                </div>
                <div style={{ width: '350px' }}>
                    <ComboBox
                        label={`Build A${selectedSnapshotA?.comment?.trim() ? ` / ${selectedSnapshotA.comment}` : ''}`}
                        options={snapA.snapFormattedList}
                        value={diffSelectorA.selectedResult}
                        setValue={(v) => store.setDiffSelectorA({ selectedResult: v })}
                    />
                </div>
            </div>
            <div className="flex gap-4 border border-gray-500">
                <div style={{ width: '180px' }}>
                    <ComboBox label="Release Tag B" options={snapB.releaseTags} value={diffSelectorB.releaseTag} setValue={(v) => store.setDiffSelectorB({ releaseTag: v })} />
                </div>
                <div style={{ width: '350px' }}>
                    <ComboBox
                        label={`Build B${selectedSnapshotB?.comment?.trim() ? ` / ${selectedSnapshotB.comment}` : ''}`}
                        options={snapB.snapFormattedList}
                        value={diffSelectorB.selectedResult}
                        setValue={(v) => store.setDiffSelectorB({ selectedResult: v })}
                    />
                </div>
            </div>
        </div>
    );
}
