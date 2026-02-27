import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    base: './',
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'assets', dest: '.' },
            ],
        }),
    ],
    build: {
        outDir: 'dist',
        assetsDir: '_js',
    },
    server: {
        open: true,
    },
});
