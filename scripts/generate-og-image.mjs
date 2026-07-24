// Generate PNG og-image from SVG via Playwright.
// Usage: node scripts/generate-og-image.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/og-image.svg');
const pngPath = resolve(__dirname, '../public/og-image.png');

const svg = readFileSync(svgPath, 'utf-8');
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(dataUri);
await page.screenshot({ path: pngPath });
await browser.close();

console.log(`✓ OG image saved: ${pngPath}`);
