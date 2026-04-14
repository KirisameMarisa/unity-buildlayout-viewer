"use client";

import React, { useEffect, useState } from 'react';
import { DiffType } from '@/lib/types';

interface FilterRadioSelectorProps {
    colorMap: Record<string | DiffType, string>;
    onChage: (value: string | null) => void;
}

export default function FilterRadioSelector(props: FilterRadioSelectorProps) {
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        props.onChage(selected);
    }, [selected]);

    return (
        <div className="mb-4 overflow-x-auto whitespace-nowrap px-1 scrollbar-hide">
            <div className="inline-flex gap-2">
                {Object.keys(props.colorMap).map((key) => {
                    const color = props.colorMap[key];
                    const isSelected = selected === key;

                    return (
                        <button
                            key={key}
                            onClick={() => setSelected(key)}
                            className={`
                                inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
                                border border-gray-500
                                ${isSelected ? "bg-white text-black font-semibold" : "bg-transparent text-white hover:border-white"}
                            `}
                        >
                            <span className={`text-sm ${color}`}>■</span>
                            <span>{key.replace("BuildLayout/", "")}</span>
                        </button>
                    );
                })}

                {/* "All" button */}
                <button
                    onClick={() => setSelected(null)}
                    className={`
                        inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
                        border border-gray-500
                        ${selected === null ? "bg-white text-black font-semibold" : "bg-transparent text-white hover:border-white"}
                    `}
                >
                    <span>All</span>
                </button>
            </div>
        </div>
    );
}
