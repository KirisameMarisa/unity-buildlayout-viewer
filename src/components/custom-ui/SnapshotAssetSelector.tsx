"use client";

// SnapshotSelectorContext.tsx
import React, { useEffect, useState } from 'react';
import { fetchEntriesForSnapshot, fetchLinksForSnapshot, getPlatforms, getReleaseTags, getSnapshots } from '@/lib/client/api';
import { AssetEntry, AssetLink, FetchState, Snapshot } from '@/lib/types';
import { format } from 'date-fns/format';
import { ja } from 'date-fns/locale/ja';
import ComboBox from '../ui/combo-box';
import { useAppStore } from '@/store/appStore';
import { Label } from '../ui/label';

interface SnapshotAssetSelectorProps {
    onChangeSnapshot?: (snapshot: Snapshot) => void;
    setProgress: (value: number) => void;
    setAssetEntries?: (value: AssetEntry[]) => void;
    setAssetLinks?: (value: AssetLink[]) => void;
}

export default function SnapshotAssetSelector({ onChangeSnapshot, setProgress, setAssetEntries, setAssetLinks }: SnapshotAssetSelectorProps) {
    const appState = useAppStore();
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [releaseTags, setReleaseTags] = useState<string[]>([]);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedReleaseTag, setSelectedReleaseTag] = useState('');
    const [selectedResult, setSelectedResult] = useState("");
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot>();

    useEffect(() => {
        getPlatforms().then(setPlatforms);

        const snapshot = appState.selectAsset?.snapshot;
        if (snapshot) {
            setSelectedPlatform(snapshot.platform);
            setSelectedReleaseTag(snapshot.tag);
            setSelectedResult(snapFormatted(snapshot));
            setSelectedSnapshot(snapshot);
        }
    }, []);

    useEffect(() => {
        if (selectedPlatform === "") {
            return;
        }
        getReleaseTags(selectedPlatform).then(setReleaseTags);
    }, [selectedPlatform]);

    useEffect(() => {
        if (selectedPlatform === "" || selectedReleaseTag === "") {
            return;
        }
        getSnapshots(selectedPlatform, selectedReleaseTag).then(setSnapshots);
    }, [selectedPlatform, selectedReleaseTag]);

    useEffect(() => {
        const snapshot = snapshots.find(s => snapFormatted(s) === selectedResult);
        if (snapshot) {
            setSelectedSnapshot(snapshot);
        }
    }, [selectedResult]);

    useEffect(() => {
        const run = async () => {
            setProgress(0);

            if (onChangeSnapshot && selectedSnapshot) {
                onChangeSnapshot(selectedSnapshot);
            }

            try {
                const entriesRes = await fetchEntriesForSnapshot(selectedSnapshot?.id!);
                setProgress(0.4);
                if (Array.isArray(entriesRes)) {
                    setAssetEntries?.(entriesRes);
                }

                const linksRes = await fetchLinksForSnapshot(selectedSnapshot?.id!);
                setProgress(0.8);
                if (Array.isArray(linksRes)) {
                    setAssetLinks?.(linksRes);
                }

            } catch (e) {
                console.error("fetch error", e);
            }
            finally {
                setProgress(1);
            }
        };
        run();
    }, [selectedSnapshot])

    function snapFormatted(v: Snapshot): string {
        const date = new Date(v.build_time);
        const formatted = format(date, "yyyy/MM/dd HH:mm", { locale: ja });
        return `${formatted} / ${v.player_version}`;
    }

    return (
        <div className="flex gap-4 items-end">
            <div style={{ width: '200px' }}>
                <ComboBox label="Platform" options={platforms} value={selectedPlatform} setValue={setSelectedPlatform} />
            </div>
            <div style={{ width: '200px' }}>
                <ComboBox label="Release Tag" options={releaseTags} value={selectedReleaseTag} setValue={setSelectedReleaseTag} />
            </div>
            <div style={{ width: '350px' }}>
                <ComboBox label="Build" options={[...snapshots.map(v => snapFormatted(v)).sort((x, y) => x > y ? -1 : 1)]} value={selectedResult} setValue={setSelectedResult} />
            </div>
            {selectedSnapshot?.comment?.trim() && (
                <div className="flex-1">
                    <div className="h-[38px] flex items-center border border-input bg-background rounded-md px-3 text-sm text-muted-foreground">
                        {selectedSnapshot?.comment}
                    </div>
                </div>
            )}
        </div>
    );
}