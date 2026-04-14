import * as React from 'react';
import { Box, Avatar, Typography } from '@mui/material';
import {
    useTreeItem,
    UseTreeItemParameters,
    TreeItemContent,
    TreeItemIconContainer,
    TreeItemGroupTransition,
    TreeItemLabel,
    TreeItemRoot,
    TreeItemCheckbox,
    TreeItemIcon,
    TreeItemProvider,
    TreeItemDragAndDropOverlay,
    TreeItemProps,
    useTreeItemModel,
    TreeItem,
} from '@mui/x-tree-view';
import { AssetTreeNode, DiffType } from '@/lib/types';
import { Label } from '@radix-ui/react-context-menu';
import clsx from 'clsx';

interface CustomLabelProps {
    children: string;
    diffFlags: string[];
}

function CustomLabel({ children, diffFlags }: CustomLabelProps) {
    return (
        <div>
            <Typography>{children}</Typography>
            <div className="flex flex-wrap gap-2 mb-4">
                {diffFlags.map((x) => {
                    return (
                        <button key={children}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border border-gray-500 "bg-transparent text-white hover:border-white"`}>
                            
                            <span>{x}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
    props: TreeItemProps,
    ref: React.Ref<HTMLLIElement>,
) {
    const item = useTreeItemModel<AssetTreeNode>(props.itemId)!;

    const diffFlags = item?.diffFlags || [];
    let labelColor = 'text-white'; // default

    if (diffFlags.includes('hash')) {
        labelColor = 'text-red-400';
    } else if (diffFlags.includes('missing')) {
        labelColor = 'text-blue-400';
    }

    return (
        <TreeItem
            {...props}
            ref={ref}
            slots={{
                label: CustomLabel,
            }}
            slotProps={{
                label: { diffFlags: item?.diffFlags } as CustomLabelProps,
            }}
        />
    );
});

export default CustomTreeItem;
