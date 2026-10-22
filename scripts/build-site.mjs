/**
 * build-site.mjs — assembles the GitHub Pages site into _site/:
 *   _site/              ← landing page (site/)
 *   _site/play/         ← the game (www/)
 *   _site/screenshots/  ← README/landing images (assets/screenshots/)
 */
import { cp, rm, mkdir } from 'node:fs/promises';
await rm('_site', { recursive: true, force: true });
await mkdir('_site', { recursive: true });
await cp('site', '_site', { recursive: true });
await cp('www', '_site/play', { recursive: true });
await cp('assets', '_site/assets', { recursive: true });
console.log('✅ Site built in _site/  (landing at /, game at /play/)');
