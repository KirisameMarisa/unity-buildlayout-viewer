const KEY = "asset-viewer-favorites";

export function getFavoriteSearches(): string[] {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
}

export function addFavoriteSearch(term: string) {
    const current = getFavoriteSearches();
    if (!current.includes(term)) {
        localStorage.setItem(KEY, JSON.stringify([term, ...current]));
    }
}

export function removeFavoriteSearch(term: string) {
    const current = getFavoriteSearches().filter(t => t !== term);
    localStorage.setItem(KEY, JSON.stringify(current));
}
