"use client";

import { useEffect } from 'react';
import SearchPage from '@/components/search';
import DiffPage from '@/components/diff';
import DependencyViewer from '@/components/search/dependency-viewer';
import UploadDialog from '@/components/upload';
import SnapshotsEditor from '@/components/snapshots-editor';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { 
    faMagnifyingGlass,
    faCodeCompare,
    faPenSquare,
    faUpload

} from '@fortawesome/free-solid-svg-icons'
import { useNavigationStore } from '@/store/navigation-store';

interface ToolButtonProps {
    icon: IconDefinition;
    label: string;
    onClick: () => void;
}

export default function Home() {
    const DEFAULT_PAGE = "search";

    const { currentPage, setPage } = useNavigationStore();

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
            <div className="w-14 bg-gray-800 flex flex-col items-center py-4 space-y-4">
                <ToolButton icon={faMagnifyingGlass} label='search' onClick={() => setPage("search")} />
                <ToolButton icon={faCodeCompare} label='diff' onClick={() => setPage("diff")} />
                <ToolButton icon={faUpload} label='upload' onClick={() => setPage("upload")} />
                <ToolButton icon={faPenSquare} label='edit' onClick={() => setPage("edit")} />
            </div>

            <div className="flex-grow bg-gray-900 p-4 overflow-hidden">
                {currentPage === "search" && <SearchPage />}
                {currentPage === "diff" && <DiffPage />}
                {currentPage === "depend" && <DependencyViewer />}
                <UploadDialog open={currentPage === "upload"} onClose={() => { setPage("search"); }}/>
                {currentPage === "edit" && <SnapshotsEditor />}
            </div>
        </div>
    );
}
