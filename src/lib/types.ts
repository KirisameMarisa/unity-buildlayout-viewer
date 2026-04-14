export type AssetEntry = {
    hash: string | null;
    size: bigint | null;
    name: string | null;
    rid: number | null;
    class_name: string | null;
    streamed_size: bigint | null;
    guid: string | null;
};

export type AssetLink = {
    from_id: number | null;
    to_id: number | null;
    link_type: string | null;
};

export type AssetLinkByName = {
    from_id: string;
    to_id: string;
    link_type: string;
}

export type ParentEdge = { 
    parent: number; 
    type: string 
};

export type DiffEntry = {
    name: string;
    class_name: string;
    guid: string;
    a_hash: string;
    b_hash: string;
    a_size: bigint;
    b_size: bigint;
    size_diff: boolean;
    hash_diff: boolean;
    isAdd: boolean;
    isMissing: boolean;
}

export type Snapshot = {
    id: number;
    player_version: string;
    platform: string;
    created_at: string;
    build_time: string;
    tag: string;
    comment: string;
    delete: boolean;
    version: string;
}

export enum FetchState {
    None,
    Start,
    End,
}

export type Filter = {
    searchText?: string;
    className?: string | null;
    diffType?: DiffType;
    extName?: string | null;
    bundleKeys?: string[] | null;
    bundleDiffType?: BundleDiffType;
}

export const classColorMap: Record<string, string> = {
    "BuildLayout/DataFromOtherAsset": "text-pink-400",
    "BuildLayout/Bundle": "text-blue-400",
    "BuildLayout/ExplicitAsset": "text-green-400",
    "BuildLayout/File": "text-yellow-400",
    "BuildLayout/Group": "text-purple-400",
    "BuildLayout/SubFile": "text-red-400",
};

export type DiffType = 'hash' | 'missing' | 'add' | 'size';
export const DiffTypeColorMap: Record<DiffType, string> = {
    "hash": "text-pink-400",
    "missing": "text-yellow-400",
    "add": "text-red-400",
    "size": "text-green-400",
}

export type BundleDiffType = 'Size' | 'Hash' | 'Moved' | 'Removed' | 'Added RefTo' | 'Added RefBy' | 'Added FromBundle';
export const BundleDiffTypeColorMap: Record<BundleDiffType, string> = {
    "Size": "text-pink-400",
    "Hash": "text-yellow-400",
    "Moved": "text-blue-400",
    "Removed": "text-green-400",
    "Added RefTo": "text-red-200",
    "Added RefBy": "text-red-400",
    "Added FromBundle": "text-red-500",
}

export type AssetTreeNode = {
    id: string,
    label: string,
    fullPath?: string;
    children?: AssetTreeNode[];
    userData: AssetEntry | null;
    diffFlags?: DiffType[];
};

export type TreeRow =
  | { kind: 'parent'; id: string; label: string; depth: number; color: string; }
  | { kind: 'child';  id: string; label: string; depth: number; parent: string; color: string; };

export type UploadStepMsg = {
    step: string,
}

export type UpstreamLine = {
    rid: number;
    depth: number;
    isRoot?: boolean;
    linkType?: string;
    truncated?: boolean;
};