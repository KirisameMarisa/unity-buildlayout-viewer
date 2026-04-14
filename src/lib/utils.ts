import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns/format';
import { ja } from 'date-fns/locale/ja';
import { DiffEntry, Snapshot } from "./types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function logTime<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
}

export async function logAsyncTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
}

const now =
    (typeof globalThis !== 'undefined' && globalThis.performance && typeof globalThis.performance.now === 'function')
        ? () => globalThis.performance.now()
        : () => Date.now();

export class Profiler {
    private t0 = new Map<string, number>();
    private dt = new Map<string, number>();
    start(k: string) { this.t0.set(k, now()); }
    end(k: string) { this.dt.set(k, (this.dt.get(k) ?? 0) + (now() - (this.t0.get(k) ?? now()))); }
    add(k: string, v = 1) { this.dt.set(k, (this.dt.get(k) ?? 0) + v); }
    report(label = "profile") {
        const rows = [...this.dt.entries()].sort((a, b) => b[1] - a[1]);
        console.log(`\n=== ${label} ===`);
        for (const [k, v] of rows) console.log(`${k.padEnd(28)} ${v.toFixed(3)} ms`);
    }
}

export function BuildDiffResultText(
    diffBundleMap: Map<string, Set<string>>,
    entries: DiffEntry[],
    aLabel: string,
    bLabel: string,
    metaA?: any,
    metaB?: any) {

    function formatHeader(aLabel: string, bLabel: string, metaA?: any, metaB?: any) {
        const lines = [
            ``,
            `A: ${aLabel}`,
            ...(metaA ? Object.entries(metaA).map(([k, v]) => `  - ${k}: ${v}`) : []),
            ``,
            `B: ${bLabel}`,
            ...(metaB ? Object.entries(metaB).map(([k, v]) => `  - ${k}: ${v}`) : []),
            ``,
        ];
        return lines.join("\n");
    }

    function formatEntry(e: DiffEntry) {
        return `\t - ${e.name}`;
    }

    function formatEntryAppendSize(e: DiffEntry) {
        if (e.a_size === e.b_size) {
            return `\t - ${e.name}`;
        } else {
            return `\t - ${e.name} A:${e.a_size}  --->  B:${e.b_size}`;
        }
    }

    function isBundleOrGroup(className: string | undefined): boolean {
        return className === "BuildLayout/Group" || className === "BuildLayout/Bundle";
    }

    if (diffBundleMap === undefined || !entries || entries.length === 0) {
        return formatHeader(aLabel, bLabel, metaA, metaB) + "\n(no entries)\n";
    }

    // グルーピング
    const missing = entries.filter(e => e.isMissing);
    const added = entries.filter(e => e.isAdd);
    const guidBundlesChanged = entries.filter(e =>
        !e.isAdd && !e.isMissing && e.a_hash && isBundleOrGroup(e.class_name)
    );
    const hashAssetsChanged = entries.filter(e =>
        !e.isAdd && !e.isMissing && e.a_hash && !isBundleOrGroup(e.class_name)
    );
    const sizeChanged = entries.filter(e => !e.isAdd && !e.isMissing && e.size_diff);

    // 並び順（名前昇順）
    const byName = (a: DiffEntry, b: DiffEntry) => a.name.localeCompare(b.name);

    missing.sort(byName);
    added.sort(byName);
    guidBundlesChanged.sort(byName);
    hashAssetsChanged.sort(byName);
    sizeChanged.sort(byName);

    const parts: string[] = [];
    parts.push(formatHeader(aLabel, bLabel, metaA, metaB));

    parts.push(`## Missing in B (${missing.length})`);
    if (missing.length === 0) parts.push(`(none)\n`);
    else parts.push(...missing.map(formatEntry), "");

    parts.push(`## Added in B (${added.length})`);
    if (added.length === 0) parts.push(`(none)\n`);
    else parts.push(...added.map(formatEntry), "");

    parts.push(`## GUID changed bundles (${guidBundlesChanged.length})`);
    if (guidBundlesChanged.length === 0) parts.push(`(none)\n`);
    else parts.push(...guidBundlesChanged.map(formatEntryAppendSize), "");

    parts.push(`## hash changed assets/files (${hashAssetsChanged.length})`);
    if (hashAssetsChanged.length === 0) parts.push(`(none)\n`);
    else parts.push(...hashAssetsChanged.map(formatEntryAppendSize), "");

    parts.push(`## Size changed (${sizeChanged.length})`);
    if (sizeChanged.length === 0) parts.push(`(none)\n`);
    else parts.push(...sizeChanged.map(formatEntryAppendSize), "");

    if (diffBundleMap) {
        parts.push(`## diff Bundle/Group Map (${diffBundleMap.size})`);
        for (const v of diffBundleMap) {
            const key = v[0];
            const value = v[1].values();
            parts.push(`\t ${key}`)
            parts.push(...value.map(e => {
                const m = e.match(/^(.*?)(\[[^\[\]]+\])\s*$/);
                if (m) {
                    return `\t\t - ${m[1]}\n\t\t\t - ${m[2]}`;
                } else {
                    return `\t\t - ${e}`;
                }
            }), "");
        }
    }
    return parts.join("\n");
}

export function formatSnapshotLabel(v: Snapshot): string {
    const formatted = format(new Date(v.build_time), "yyyy/MM/dd HH:mm", { locale: ja });
    return `${formatted} / ${v.player_version}`;
}

export function formatElapsed(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // ゼロ埋め（2桁表示）
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${mm}:${ss}`;
}