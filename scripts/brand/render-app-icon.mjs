import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const images = resolve(root, 'assets/images');

const EGG = 'M60 16 C34 16 22 52 22 88 C22 126 38 146 60 146 C82 146 98 126 98 88 C98 52 86 16 60 16 Z';
const HIGHLIGHT = 'M46 34 C38 58 40 92 52 118';

function artwork({ monochrome = false, includeBackground = true, scale = 1 }) {
  const shell = monochrome ? '#FFFFFF' : 'url(#shell)';
  const stroke = monochrome ? '#FFFFFF' : '#C9A56A';
  const shine = monochrome ? 'rgba(255,255,255,0)' : 'rgba(255,248,230,0.85)';
  const ember = monochrome ? 'rgba(255,255,255,0)' : 'url(#ember)';
  const spark = monochrome ? 'rgba(255,255,255,0)' : '#FFF8E8';
  const ring = monochrome ? '#FFFFFF' : '#D0893C';
  const track = monochrome ? 'rgba(255,255,255,0)' : '#3A322B';
  const bowl = monochrome ? 'rgba(255,255,255,0)' : 'rgba(58,42,28,0.5)';
  const mote = monochrome ? 'rgba(255,255,255,0)' : '#E7B15A';
  const background = includeBackground
    ? '<rect width="1024" height="1024" fill="#0E0E10"/>'
    : '';
  const bloom = monochrome ? '' : '<circle cx="512" cy="488" r="340" fill="url(#bloom)"/>';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bloom" cx="512" cy="470" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C4783A" stop-opacity="0.42"/>
      <stop offset="46%" stop-color="#C4783A" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#C4783A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF8E8"/>
      <stop offset="42%" stop-color="#F3E4B8"/>
      <stop offset="100%" stop-color="#E4C98A"/>
    </linearGradient>
    <radialGradient id="ember" cx="0.4" cy="0.36" r="0.42">
      <stop offset="0%" stop-color="#FFF6DE" stop-opacity="0.95"/>
      <stop offset="42%" stop-color="#E7B15A" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#E7B15A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${background}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${bloom}
    <circle cx="278" cy="250" r="5" fill="${mote}" opacity="0.8"/>
    <circle cx="748" cy="286" r="3.5" fill="${mote}" opacity="0.7"/>
    <circle cx="246" cy="690" r="3.2" fill="${mote}" opacity="0.55"/>
    <circle cx="790" cy="640" r="4.4" fill="${mote}" opacity="0.75"/>
    <circle cx="512" cy="500" r="292" fill="none" stroke="${track}" stroke-width="26"/>
    <circle cx="512" cy="500" r="292" fill="none" stroke="${ring}" stroke-width="26" stroke-linecap="round" stroke-dasharray="1138 1835" transform="rotate(-90 512 500)"/>
    <ellipse cx="512" cy="734" rx="128" ry="14" fill="${bowl}"/>
    <g transform="translate(512 492) scale(3.52) translate(-60 -81)">
      <path d="${EGG}" fill="${shell}"/>
      <ellipse cx="52" cy="66" rx="16" ry="22" fill="${ember}"/>
      <path d="${HIGHLIGHT}" fill="none" stroke="${shine}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="${EGG}" fill="none" stroke="${stroke}" stroke-width="2.1"/>
      <circle cx="58" cy="76" r="2.6" fill="${spark}"/>
    </g>
  </g>
</svg>`;
}

function writePng(svg, file, size, background) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: background ?? 'rgba(0,0,0,0)',
  });
  writeFileSync(resolve(images, file), resvg.render().asPng());
}

const icon = artwork({ includeBackground: true, scale: 1 });
const foreground = artwork({ includeBackground: false, scale: 0.66 });
const monochrome = artwork({ monochrome: true, includeBackground: false, scale: 0.66 });
const splash = artwork({ includeBackground: false, scale: 0.9 });

writeFileSync(resolve(root, 'assets/brand/app-icon.svg'), icon);
writeFileSync(resolve(images, 'splash-icon.svg'), splash);

writePng(icon, 'icon.png', 1024, '#0E0E10');
writePng(icon, 'icon-ios.png', 1024, '#0E0E10');
writePng(foreground, 'android-icon-foreground.png', 1024);
writePng(monochrome, 'android-icon-monochrome.png', 1024);
writePng(splash, 'splash-icon.png', 1024);
writePng(icon, 'favicon.png', 48, '#0E0E10');

console.log('rendered hatchpal icons');
