// Single-file build: everything (code, styles, fonts, data, maps, country outlines) in one HTML file
// that opens straight from disk, with no server. Run: npm run build:single → dist-single/LithoTwin.html
import { build } from 'vite';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, 'dist-single', '.tmp');
rmSync(join(root, 'dist-single'), { recursive: true, force: true });

await build({
  root,
  base: './',
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: tmp,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // fonts become data: URIs inside the CSS
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

const assetsDir = join(tmp, 'assets');
const files = readdirSync(assetsDir);
const js = readFileSync(join(assetsDir, files.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(assetsDir, files.find((f) => f.endsWith('.css'))), 'utf8');

const MIME = { '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const embedded = {};
for (const dir of ['data', 'maps', 'geo', 'photos', 'brand']) {
  for (const f of readdirSync(join(root, 'public', dir))) {
    const buf = readFileSync(join(root, 'public', dir, f));
    embedded[`${dir}/${f}`] = `data:${MIME[extname(f)]};base64,${buf.toString('base64')}`;
  }
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>LithoTwin</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpolygon points='16,2 30,12 25,29 7,29 2,12' fill='%23F2A93B'/%3E%3C/svg%3E">
<style>${css}</style>
<script>window.__LT_ASSETS__ = ${JSON.stringify(embedded)};</script>
</head>
<body>
<div id="app"></div>
<script type="module">${js}</script>
</body>
</html>
`;
mkdirSync(join(root, 'dist-single'), { recursive: true });
const out = join(root, 'dist-single', 'LithoTwin.html');
writeFileSync(out, html);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}: ${(html.length / 1e6).toFixed(1)} MB`);
