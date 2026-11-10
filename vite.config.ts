/// <reference types="vitest/config" />
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * En dev, `/api/*` est redirigé vers le PHP local (Docker, voir docker/README.md).
 * Si l'API ne répond pas, le front retombe sur `public/data.json`.
 */
const apiTarget = process.env.MYOS_API ?? 'http://localhost:8080';

const MIME: Record<string, string> = {
  '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.pdf': 'application/pdf', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.json': 'application/json',
};

/**
 * Sert le dossier `img/` (assets du site, non versionnés, 59 Mo) pendant le dev.
 * En prod il est déjà dans public_html/img : le build ne le copie pas.
 */
function serveImgDir(): Plugin {
  const root = resolve(fileURLToPath(new URL('./img', import.meta.url)));
  return {
    name: 'myos-serve-img',
    configureServer(server) {
      server.middlewares.use('/img', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
        const file = normalize(join(root, rel));
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Content-Length', statSync(file).size);
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [serveImgDir()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // three.js / pdf.js / shiki sont chargés à la demande, dans leurs propres chunks.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
