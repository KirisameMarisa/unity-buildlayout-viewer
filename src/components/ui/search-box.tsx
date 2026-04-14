'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Input } from './input';
import ComboBox from './combo-box';

interface SearchFavoritesState {
    favorites: string[];
    add: (term: string) => void;
    remove: (term: string) => void;
}

const useSearchFavoritesStore = create<SearchFavoritesState>()(
    persist(
        (set) => ({
            favorites: [],
            add: (term) => set((s) => ({
                favorites: s.favorites.includes(term) ? s.favorites : [term, ...s.favorites],
            })),
            remove: (term) => set((s) => ({
                favorites: s.favorites.filter(t => t !== term),
            })),
        }),
        { name: 'search-favorites' }
    )
);

interface SearchBoxProps {
    onChangedText: (v: string) => void;
}

export default function SearchBox({ onChangedText }: SearchBoxProps) {
    const [searchText, setSearchText] = useState('');
    const { favorites, add, remove } = useSearchFavoritesStore();

    useEffect(() => {
        const handle = setTimeout(() => {
            onChangedText(searchText);
        }, 1000);
        return () => clearTimeout(handle);
    }, [searchText]);

    function toggleFavorite(v: string) {
        favorites.includes(v) ? remove(v) : add(v);
    }

    return (
        <div className="flex gap-4 items-end">
            <div className="relative w-full">
                <Input
                    type="text"
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="bg-gray-750 text-white border border-gray-600 mb-2 selection:bg-blue-300 selection:text-black"
                />
                <button onClick={() => toggleFavorite(searchText)} className="absolute right-2 top-1.5">
                    {favorites.includes(searchText) ? "⭐️" : "☆"}
                </button>
            </div>
            <div className="text-white py-1 rounded mb-1" style={{ width: '350px' }}>
                <ComboBox label="Saved searches" options={favorites} value="" setValue={setSearchText} />
            </div>
        </div>
    );
}
