/**
 * Rasterizes build/icon.svg into the app icons electron-builder needs:
 *   build/icon.png  (1024×1024, used for macOS/Linux; builder derives .icns)
 *   build/icon.ico  (multi-size, used for Windows)
 *
 * Run with `npm run make-icons` whenever the logo changes; the generated PNG/ICO
 * are committed so packaging itself does not need a rasterizer.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const svg = readFileSync(new URL('../build/icon.svg', import.meta.url), 'utf8');

function renderPng(size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

writeFileSync(new URL('../build/icon.png', import.meta.url), renderPng(1024));

const ico = await pngToIco([renderPng(256), renderPng(128), renderPng(64), renderPng(32)]);
writeFileSync(new URL('../build/icon.ico', import.meta.url), ico);

console.log('Generated build/icon.png (1024) and build/icon.ico');
