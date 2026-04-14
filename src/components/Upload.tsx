"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { uploadBuildLayout, prepareUpload, getUploadProgress, clearUpload } from '@/lib/client/api';
import path from 'path'
import { formatElapsed } from '@/lib/utils';

interface UploadDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function UploadDialog({ open, onClose }: UploadDialogProps) {
    const TimeoutMs: number = Number(process.env.NEXT_PUBLIC_UPLOAD_TIMEOUT_MS ?? 300000);

    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [tag, setTag] = useState('');
    const [comment, setComment] = useState('');

    const [elapsedStatus, setElapsedStatus] = useState('');
    const [status, setStatus] = useState('');

    const [startTime, setStartTime] = useState(0)
    const [isCancel, setCancel] = useState(false);

    const handleUpload = async () => {
        if (!file) {
            return;
        }

        const session_id = (await prepareUpload()).uuid;
        const start = Date.now();
        const status = "アップロード準備中なう";
        setStatus(status);
        setCancel(false);
        setIsUploading(true);

        const elapsedUpdater = setInterval(() => {
            setElapsedStatus(formatElapsed(Date.now() - start));
        }, 1000);

        let stepUpdater = undefined;
        const stepPolling = (start: number) => {
            stepUpdater = setTimeout(async () => {
                const status = await getUploadProgress(session_id);
                setStatus(status.step);

                const elapsed_ms = Date.now() - start;

                if(elapsed_ms > TimeoutMs) {
                    setCancel(true);
                }
                
                if(!isCancel) {
                    stepPolling(start);
                }
            }, Number(process.env.NEXT_PUBLIC_UPLOAD_POLLING_MS ?? 5000));
        };

        setStartTime(start)
        stepPolling(start);

        const releaseTag = tag.trim();
        await uploadBuildLayout(session_id, file!, releaseTag === "" ? "Manual Upload from Web" : releaseTag, comment);

        setIsUploading(false);
        setCancel(false);
        clearInterval(elapsedUpdater);
        clearTimeout(stepUpdater);
        clearUpload(session_id);
        onClose();
    };

    useEffect(() => {
        const filename = path.parse(file?.name ?? "").name
        const start = filename.lastIndexOf('-') + 1;
        const releaseTag = filename.substring(start).replaceAll('_', '/')
        setTag(releaseTag);
    }, [file])
  
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="p-4 bg-gray-900 text-white rounded-md border border-gray-700 w-[500px]">
                <DialogHeader>
                    <DialogTitle>ビルドレイアウトのアップロード</DialogTitle>
                </DialogHeader>
                <div>
                    <div className="mb-4">
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer inline-block bg-gray-700 hover:bg-gray-600 text-white font-medium py-1 px-4 rounded"
                        >
                            {file?.name ? file?.name : 'ファイルを選択'}
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".json"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                    </div>
                    <div className="mb-4" style={{ width: '180px' }}>
                        <input
                            className="bg-zinc-800 p-2 rounded text-white w-full"
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            placeholder="Release Tag を入力"
                        />
                    </div>
                    <div className="mb-4" style={{ width: '250px' }}>
                        <input
                            className="bg-zinc-800 p-2 rounded text-white w-full"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="コメント を入力"
                        />
                    </div>
                    <button
                        className={`${isCancel ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700" } text-white font-semibold py-1 px-4 rounded disabled:opacity-50`}
                        disabled={isUploading}
                        onClick={handleUpload}
                    >
                        {isCancel ? "エラーが発生しました！！！！" 
                                  : isUploading ? `${status} ${elapsedStatus}` : 'アップロード'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
