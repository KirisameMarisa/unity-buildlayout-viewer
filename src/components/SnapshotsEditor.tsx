"use client";

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns/format';
import { Snapshot } from '@/lib/types';
import { EditSnapshot, getPlatforms, getReleaseTags, getSnapshots } from '@/lib/client/api';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Label } from "@/components/ui/label";
import { Input } from './ui/input';
import ComboBox from './ui/combo-box';
import { ja } from 'date-fns/locale/ja';

export default function SnapshotsEditor() {
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [releaseTags, setReleaseTags] = useState<string[]>([]);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedReleaseTag, setSelectedReleaseTag] = useState('');

    useEffect(() => {
        getPlatforms().then(setPlatforms);
    }, []);

    useEffect(() => {
        getReleaseTags(selectedPlatform).then(setReleaseTags);
    }, [selectedPlatform])

    useEffect(() => {
        getSnapshots(selectedPlatform, selectedReleaseTag, true).then(setSnapshots);
    }, [selectedPlatform, selectedReleaseTag])

    function snapFormatted(v: Snapshot): string {
        const date = new Date(v.build_time);
        const formatted = format(date, "yyyy/MM/dd HH:mm", { locale: ja });
        return `${v.platform} / ${formatted} / ${v.player_version}`;
    }

    const handleEdit = (index: number, field: keyof Snapshot, value: any) => {
        setSnapshots((prev) =>
            prev.map((snap, i) =>
                i === index ? { ...snap, [field]: value } : snap
            )
        );
    };

    const editApply = (snapshot: Snapshot): void => {
        EditSnapshot(snapshot.id, snapshot.tag, snapshot.comment, snapshot.delete);
    };

    return (
        <div>

            <div className="flex gap-4 items-end">
                <div style={{ width: '200px' }}>
                    <ComboBox label="Platform" options={platforms} value={selectedPlatform} setValue={setSelectedPlatform} />
                </div>
                <div style={{ width: '200px' }}>
                    <ComboBox label="Release Tag" options={releaseTags} value={selectedReleaseTag} setValue={setSelectedReleaseTag} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.map((snapshot, index) => (
                    <Card
                        key={snapshot.id}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-4 space-y-2"
                    >
                        {/* Header */}
                        <div className="text-sm text-zinc-400 font-medium">
                            {snapFormatted(snapshot)}
                        </div>

                        {/* Tag + Comment */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={snapshot.delete}
                                    onCheckedChange={(e) => handleEdit(index, "delete", !snapshot.delete)}
                                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm"
                                />
                                <label className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm">
                                    Hide
                                </label>
                            </div>

                            <Input
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm"
                                value={snapshot.tag ?? ""}
                                onChange={(e) => handleEdit(index, "tag", e.target.value)}
                                placeholder="Tag"
                            />
                            <Input
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm"
                                value={snapshot.comment ?? ""}
                                onChange={(e) => handleEdit(index, "comment", e.target.value)}
                                placeholder="Comment"
                            />
                        </div>

                        {/* Button */}
                        <div className="flex justify-end">
                            <Button
                                onClick={() => editApply(snapshot)}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm h-8 px-3"
                            >
                                Apply
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};