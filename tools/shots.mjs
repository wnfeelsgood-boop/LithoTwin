// Screenshots for the README and the submission: npm run build && npm run shots
// Starts `vite preview`, opens the main screens at laptop and phone width, saves PNGs to docs/screenshots/.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4179;
const PAGES = [
  ['world', '#/?pair=1'],
  ['russia', '#/russia?pair=4'],
  ['dossier', '#/site/ru_batagaika?pair=4'],
  ['about', '#/about'],
];
const SIZES = [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;
try {
  for (const [sizeName, viewport] of SIZES) {
    for (const [name, hash] of PAGES) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`http://localhost:${PORT}/${hash}`);
      await page.waitForTimeout(name === 'world' ? 5000 : 1500);
      const file = `docs/screenshots/${name}-${sizeName}.png`;
      await page.screenshot({ path: file });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      console.log(`${file}${overflow ? '  ⚠ horizontal scroll' : ''}${errors.length ? `  ✗ ${errors.join('; ')}` : ''}`);
      if (errors.length || overflow) failed = true;
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
