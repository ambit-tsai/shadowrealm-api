import { defineConfig } from 'vite';
import { resolve } from 'path';

const root = resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig({
    root,
    base: '/shadowrealm-api/',
    build: {
        outDir: resolve(root, '../docs'),
        emptyOutDir: true,
    },
});
