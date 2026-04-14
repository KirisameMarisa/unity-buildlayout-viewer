import { AssetEntry, Snapshot } from '@/lib/types';
import { create } from 'zustand';

interface SelectAsset {
    snapshot: Snapshot;
    asset: AssetEntry;
}

interface NavigationState {
    currentPage: string;
    setPage: (v: string) => void;
    selectAsset: SelectAsset | null;
    setSelectAsset: (select: SelectAsset) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    currentPage: "",
    selectAsset: null,
    setPage: (v) => {
        set({ currentPage: v })
    },
    setSelectAsset: (select) => {
        set({ selectAsset: select })
    }
}));
