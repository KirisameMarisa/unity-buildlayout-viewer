"use client";

// SnapshotSelectorContext.tsx
import React, { useEffect, useState } from 'react';
import { getPlatforms, getReleaseTags, getSnapshots } from '@/lib/client/api';
import { Snapshot } from '@/lib/types';
import { format } from 'date-fns/format';
import { ja } from 'date-fns/locale/ja';
import ComboBox from '../ui/combo-box';

interface SnapshotDiffSelectorProps {
    onChangeSnap?: (snapA: Snapshot, snapB: Snapshot) => void;
}

export function useSnapshotData(platform: string) {
    const [releaseTags, setReleaseTags] = useState<string[]>([]);
    const [selectedReleaseTag, setSelectedReleaseTag] = useState('');
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [selectedResult, setSelectedResult] = useState('');
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | undefined>();

    useEffect(() => {
        if (!platform) return;
        getReleaseTags(platform).then(setReleaseTags);
    }, [platform]);

    useEffect(() => {
        if (!platform || !selectedReleaseTag) return;
        getSnapshots(platform, selectedReleaseTag).then(setSnapshots);
    }, [platform, selectedReleaseTag]);

    useEffect(() => {
        const match = snapshots.find(s => snapFormatted(s) === selectedResult);
        setSelectedSnapshot(match);
    }, [selectedResult, snapshots]);

    return {
        releaseTags,
        selectedReleaseTag,
        setSelectedReleaseTag,
        snapshots,
        snapFormattedList: snapshots.map(snapFormatted).sort((x, y) => x > y ? -1 : 1),
        selectedResult,
        setSelectedResult,
        selectedSnapshot,
    };
}

function snapFormatted(v: Snapshot): string {
    const date = new Date(v.build_time);
    const formatted = format(date, "yyyy/MM/dd HH:mm", { locale: ja });
    return `${formatted} / ${v.player_version}`;
}

export default function SnapshotDiffSelector(props: SnapshotDiffSelectorProps) {
    const [platforms, setPlatforms] = useState<string[]>([]);

    const [selectedPlatform, setSelectedPlatform] = useState('');

    const snapA = useSnapshotData(selectedPlatform);
    const snapB = useSnapshotData(selectedPlatform);

    useEffect(() => {
        getPlatforms().then(setPlatforms);
    }, []);

    useEffect(() => {
        if (snapA.selectedSnapshot?.id == undefined || snapB.selectedSnapshot?.id === undefined) {
            return;
        }
        if (props.onChangeSnap) {
            props.onChangeSnap(snapA.selectedSnapshot, snapB.selectedSnapshot);
        }
    }, [snapA.selectedSnapshot, snapB.selectedSnapshot])

    return (
        <div className="flex gap-4 items-end">
            <div style={{ width: '200px' }}>
                <ComboBox label="Platform" options={platforms} value={selectedPlatform} setValue={setSelectedPlatform} />
            </div>
            <div className="flex gap-4 border border-gray-500 ">
                <div style={{ width: '180px' }}>
                    <ComboBox label="Release Tag A" options={snapA.releaseTags} value={snapA.selectedReleaseTag} setValue={snapA.setSelectedReleaseTag} />
                </div>
                <div style={{ width: '350px' }}>
                    <ComboBox label={`Build A / ${snapA?.selectedSnapshot?.comment?.trim() ? snapA?.selectedSnapshot?.comment : ""}`} options={snapA.snapFormattedList} value={snapA.selectedResult} setValue={snapA.setSelectedResult} />
                </div>
            </div>
            <div className="flex gap-4 border border-gray-500 ">
                <div style={{ width: '180px' }}>
                    <ComboBox label="Release Tag B" options={snapB.releaseTags} value={snapB.selectedReleaseTag} setValue={snapB.setSelectedReleaseTag} />
                </div>
                <div style={{ width: '350px' }}>
                    <ComboBox label={`Build B / ${snapB?.selectedSnapshot?.comment?.trim() ? snapB?.selectedSnapshot?.comment : ""}`} options={snapB.snapFormattedList} value={snapB.selectedResult} setValue={snapB.setSelectedResult} />
                </div>
            </div>
        </div>
    );
}
