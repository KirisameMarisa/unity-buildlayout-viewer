import { AssetEntry, Snapshot } from '@/lib/types';
import { create } from 'zustand';

interface SelectAsset {
    snapshot: Snapshot;
    asset: AssetEntry;
}

interface appState {
    currentPage: string;
    setPage: (v: string) => void;
    selectAsset: SelectAsset | null;
    setSelectAsset: (select: SelectAsset) => void;
}

export const useAppStore = create<appState>((set, get) => ({
    currentPage: "",
    selectAsset: null,
    setPage: (v) => {
        set({ currentPage: v })
    },
    setSelectAsset: (select) => {
        set({ selectAsset: select })
    }
}));
