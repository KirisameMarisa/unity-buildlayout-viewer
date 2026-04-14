import { useEffect, useState } from 'react';
import { getPlatforms, getReleaseTags, getSnapshots } from '@/lib/api';
import { Snapshot } from '@/lib/types';
import { formatSnapshotLabel } from '@/lib/utils';

export function usePlatforms(): string[] {
    const [platforms, setPlatforms] = useState<string[]>([]);
    useEffect(() => {
        getPlatforms().then(setPlatforms);
    }, []);
    return platforms;
}

export function useSnapshotData(platform: string, releaseTag: string) {
    const [releaseTags, setReleaseTags] = useState<string[]>([]);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

    useEffect(() => {
        if (!platform) return;
        getReleaseTags(platform).then(setReleaseTags);
    }, [platform]);

    useEffect(() => {
        if (!platform || !releaseTag) return;
        getSnapshots(platform, releaseTag).then(setSnapshots);
    }, [platform, releaseTag]);

    return {
        releaseTags,
        snapshots,
        snapFormattedList: snapshots.map(formatSnapshotLabel).sort((x, y) => x > y ? -1 : 1),
    };
}
