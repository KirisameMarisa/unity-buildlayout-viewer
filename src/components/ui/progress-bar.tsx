"use client";

import React from 'react';

interface ProgressBarProps {
    progress: number;
}

export default function ProgressBar(props: ProgressBarProps) {
    return (
        <div>
            {props.progress > 0 && props.progress < 1 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-none">
                    <div className="w-1/2">
                        <div className="h-2 rounded bg-gray-700 overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${props.progress * 100}%` }}></div>
                        </div>
                        <div className="text-white text-center text-sm mt-2">Loading... ({Math.floor(props.progress * 100)}%)</div>
                    </div>
                </div>
            )}
        </div>
    );
}
