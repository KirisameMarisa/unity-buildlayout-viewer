'use client';

import { addFavoriteSearch, getFavoriteSearches, removeFavoriteSearch } from '@/lib/client/storage';
import React, { useEffect, useState } from 'react';
import { Input } from './input';
import ComboBox from './combo-box';

interface ComboBoxProps {
    onChangedText: (v: string) => void;
}

export default function SearchBox({
    onChangedText,
}: ComboBoxProps) {
    const [searchText, setSearchText] = useState('');
    const [favSearchTexts, setFavSearchTexts] = useState<string[]>([]);

    useEffect(() => {
        setFavSearchTexts(getFavoriteSearches());
    }, []);


    useEffect(() => {
        const handle = setTimeout(() => {
            onChangedText(searchText);
        }, 1000);

        return () => clearTimeout(handle);
    }, [searchText]);

    function addFavorite(v: string) {
        if (!isFavorited(v)) {
            addFavoriteSearch(v);
        } else {
            removeFavoriteSearch(v);
        }
        setFavSearchTexts(getFavoriteSearches());
    }

    function isFavorited(v: string): boolean {
        return favSearchTexts.includes(v);
    }

    return (
        <div className="flex gap-4 items-end">
            <div className="relative w-full">
                <Input
                    type="text"
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="bg-gray-750 text-white border border-gray-600 mb-2 selection:bg-blue-300 selection:text-black" />
                <button onClick={() => addFavorite(searchText)} className="absolute right-2 top-1.5">
                    {isFavorited(searchText) ? "⭐️" : "☆"}
                </button>
            </div>
            <div className="text-white py-1 rounded  mb-1" style={{ width: '350px' }}>
                <ComboBox label="お気に入り検索" options={favSearchTexts} value="" setValue={setSearchText} />
            </div>
        </div>
    );
}
