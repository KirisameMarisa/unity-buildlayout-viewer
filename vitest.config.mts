import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(root, 'src'),
        },
    },
    test: {
        environment: 'node',
        alias: {
            'server-only': fileURLToPath(new URL('./tests/__mocks__/server-only.ts', import.meta.url)),
        },
    },
});
