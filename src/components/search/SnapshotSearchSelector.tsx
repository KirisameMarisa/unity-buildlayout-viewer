"use client";

import React, { useEffect, useMemo } from 'react';
import { fetchEntriesForSnapshot, fetchLinksForSnapshot } from '@/lib/client/api';
import { AssetEntry, AssetLink, Snapshot } from '@/lib/types';
import { formatSnapshotLabel } from '@/lib/utils';
import ComboBox from '@/components/ui/combo-box';
import { useNavigationStore } from '@/store/navigationStore';
import { useSelectorStore } from '@/store/selectorStore';
import { usePlatforms, useSnapshotData } from '@/lib/hooks/useSnapshotData';

interface SnapshotSearchSelectorProps {
    onChangeSnapshot?: (snapshot: Snapshot) => void;
    setProgress: (value: number) => void;
    setAssetEntries?: (value: AssetEntry[]) => void;
    setAssetLinks?: (value: AssetLink[]) => void;
}

export default function SnapshotSearchSelector({ onChangeSnapshot, setProgress, setAssetEntries, setAssetLinks }: SnapshotSearchSelectorProps) {
    const navigationState = useNavigationStore();
    const store = useSelectorStore();
    const { platform, releaseTag, selectedResult } = store.assetSelector;

    const platforms = usePlatforms();
    const { releaseTags, snapshots, snapFormattedList } = useSnapshotData(platform, releaseTag);

    const selectedSnapshot = useMemo(
        () => snapshots.find(s => formatSnapshotLabel(s) === selectedResult),
        [snapshots, selectedResult]
    );

    // Hydrate from navigation state (when navigating back from DependencyViewer)
    useEffect(() => {
        const snapshot = navigationState.selectAsset?.snapshot;
        if (snapshot) {
            store.setAssetSelector({
                platform: snapshot.platform,
                releaseTag: snapshot.tag,
                selectedResult: formatSnapshotLabel(snapshot),
            });
        }
    }, []);

    // Fetch entries and links when snapshot changes
    useEffect(() => {
        if (!selectedSnapshot) return;

        const run = async () => {
            setProgress(0);
            onChangeSnapshot?.(selectedSnapshot);

            try {
                const entriesRes = await fetchEntriesForSnapshot(selectedSnapshot.id);
                setProgress(0.4);
                if (Array.isArray(entriesRes)) {
                    setAssetEntries?.(entriesRes);
                }

                const linksRes = await fetchLinksForSnapshot(selectedSnapshot.id);
                setProgress(0.8);
                if (Array.isArray(linksRes)) {
                    setAssetLinks?.(linksRes);
                }
            } catch (e) {
                console.error("fetch error", e);
            } finally {
                setProgress(1);
            }
        };
        run();
    }, [selectedSnapshot]);

    return (
        <div className="flex gap-4 items-end">
            <div style={{ width: '200px' }}>
                <ComboBox label="Platform" options={platforms} value={platform} setValue={(v) => store.setAssetSelector({ platform: v })} />
            </div>
            <div style={{ width: '200px' }}>
                <ComboBox label="Release Tag" options={releaseTags} value={releaseTag} setValue={(v) => store.setAssetSelector({ releaseTag: v })} />
            </div>
            <div style={{ width: '350px' }}>
                <ComboBox label="Build" options={snapFormattedList} value={selectedResult} setValue={(v) => store.setAssetSelector({ selectedResult: v })} />
            </div>
            {selectedSnapshot?.comment?.trim() && (
                <div className="flex-1">
                    <div className="h-[38px] flex items-center border border-input bg-background rounded-md px-3 text-sm text-muted-foreground">
                        {selectedSnapshot.comment}
                    </div>
                </div>
            )}
        </div>
    );
}
