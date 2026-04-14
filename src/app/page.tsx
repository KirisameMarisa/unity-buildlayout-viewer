"use client";

import { Suspense, useEffect, useState } from 'react';
import SearchPage from '@/components/SearchPage';
import DiffPage from '@/components/DiffPage';
import DependencyViewer from '@/components/DependencyViewer';
import UploadDialog from '@/components/Upload';
import SnapshotsEditor from '@/components/SnapshotsEditor';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { 
    faMagnifyingGlass,
    faCodeCompare,
    faPenSquare,
    faUpload

} from '@fortawesome/free-solid-svg-icons'
import { useAppStore } from '@/store/appStore';

interface ToolButtonProps {
    icon: IconDefinition;
    label: string;
    onClick: () => void;
}

export default function Home() {
    const DEFAULT_PAGE = "search";

    const { currentPage, setPage } = useAppStore();

    useEffect(() => setPage(DEFAULT_PAGE), [])

    function ToolButton({ icon, label, onClick }: ToolButtonProps) {
        return (
            <button className={`toolButton flex flex-col items-center transition-all w-16`} onClick={onClick}>
                <FontAwesomeIcon icon={icon} size="2x" style={{ color: "#ffffff" }} />
                <span className="text-xy mt-3 w-20">{label}</span>

            </button>
        );
    }
    return (
        <div className="flex h-screen">
            {/* 左ナビ */}
            <div className="w-14 bg-gray-800 flex flex-col items-center py-4 space-y-4">
                <ToolButton icon={faMagnifyingGlass} label='search' onClick={() => setPage("search")} />
                <ToolButton icon={faCodeCompare} label='diff' onClick={() => setPage("diff")} />
                <ToolButton icon={faUpload} label='upload' onClick={() => setPage("upload")} />
                <ToolButton icon={faPenSquare} label='snapEdit' onClick={() => setPage("snapEdit")} />
            </div>

            {/* メイン表示 */}
            <div className="flex-grow bg-gray-900 p-4 overflow-hidden">
                {currentPage === "search" && <SearchPage />}
                {currentPage === "diff" && <DiffPage />}
                {currentPage === "depend" && <DependencyViewer />}
                <UploadDialog open={currentPage === "upload"} onClose={() => { setPage("search"); }}/>
                {currentPage === "snapEdit" && <SnapshotsEditor />}
            </div>
        </div>
    );
}
