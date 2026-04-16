import { create } from 'zustand';

interface SnapshotSelection {
    platform: string;
    releaseTag: string;
    selectedResult: string;
}

interface SelectorState {
    // SnapshotAssetSelector (SearchPage)
    assetSelector: SnapshotSelection;
    setAssetSelector: (v: Partial<SnapshotSelection>) => void;
    setAssetSelectorPlatform: (v: string) => void;

    // SnapshotDiffSelector (DiffPage) — platform is shared between A and B
    diffPlatform: string;
    setDiffPlatform: (v: string) => void;
    diffSelectorA: Omit<SnapshotSelection, 'platform'>;
    setDiffSelectorA: (v: Partial<Omit<SnapshotSelection, 'platform'>>) => void;
    diffSelectorB: Omit<SnapshotSelection, 'platform'>;
    setDiffSelectorB: (v: Partial<Omit<SnapshotSelection, 'platform'>>) => void;
}

const emptySelection = (): SnapshotSelection => ({ platform: '', releaseTag: '', selectedResult: '' });
const emptySubSelection = () => ({ releaseTag: '', selectedResult: '' });

export const useSelectorStore = create<SelectorState>((set) => ({
    assetSelector: emptySelection(),
    setAssetSelector: (v) => set((s) => ({ assetSelector: { ...s.assetSelector, ...v } })),
    setAssetSelectorPlatform: (v) => set({ assetSelector: { platform: v, releaseTag: '', selectedResult: '' } }),

    diffPlatform: '',
    setDiffPlatform: (v) => set({ diffPlatform: v, diffSelectorA: emptySubSelection(), diffSelectorB: emptySubSelection() }),
    diffSelectorA: emptySubSelection(),
    setDiffSelectorA: (v) => set((s) => ({ diffSelectorA: { ...s.diffSelectorA, ...v } })),
    diffSelectorB: emptySubSelection(),
    setDiffSelectorB: (v) => set((s) => ({ diffSelectorB: { ...s.diffSelectorB, ...v } })),
}));
