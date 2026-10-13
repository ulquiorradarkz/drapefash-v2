// Generates placeholder product art (public/assets/products/<id>.svg) and the favicon.
// Original abstract silhouettes, no text, no brand imagery.
// Run: node scripts/gen-images.js   (only creates files that don't exist yet; --force to overwrite)

const fs = require('fs');
const path = require('path');
const { favicon, sparkle } = require('../src/wordmark');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'assets', 'products');
const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });

const SEAM = 'stroke="rgba(10,12,22,.38)" stroke-width="3" fill="none" stroke-linecap="round"';
const GLINT = 'stroke="rgba(255,255,255,.85)" stroke-width="4" fill="none" stroke-linecap="round"';
const body = d => `<path d="${d}" fill="url(#c)" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/>`;
const seam = d => `<path d="${d}" ${SEAM}/>`;

const LONG = 'M150 140L178 128Q200 150 222 128L250 140L300 170L330 340L298 346L266 220L264 370L136 370L134 220L102 346L70 340L100 170Z';

function butterfly(cx, cy, s) {
  const w = (dx, dy1, dx2, dy2) => `M${cx} ${cy}Q${cx + dx * s} ${cy + dy1 * s} ${cx + dx2 * s} ${cy + dy2 * s}`;
  return body(`${w(-44, -56, -54, -8)}Q${cx - 30 * s} ${cy + 8 * s} ${cx} ${cy}Q${cx - 34 * s} ${cy + 18 * s} ${cx - 30 * s} ${cy + 46 * s}Q${cx - 6 * s} ${cy + 36 * s} ${cx} ${cy}Z`) +
    body(`${w(44, -56, 54, -8)}Q${cx + 30 * s} ${cy + 8 * s} ${cx} ${cy}Q${cx + 34 * s} ${cy + 18 * s} ${cx + 30 * s} ${cy + 46 * s}Q${cx + 6 * s} ${cy + 36 * s} ${cx} ${cy}Z`) +
    `<rect x="${cx - 4 * s}" y="${cy - 26 * s}" width="${8 * s}" height="${60 * s}" rx="${4 * s}" fill="#E8ECF5"/>`;
}

const SHAPES = {
  puffer: () => body('M140 150Q200 118 260 150L306 178Q330 260 330 330L292 338L272 236L276 352Q200 372 124 352L128 236L108 338L70 330Q70 260 94 178Z') +
    [200, 240, 280, 320].map(y => seam(`M128 ${y}Q200 ${y + 14} 272 ${y}`)).join('') +
    seam('M96 230Q84 234 76 260M304 230Q316 234 324 260') +
    body('M168 152L172 112Q200 102 228 112L232 152Q200 138 168 152Z') + `<path d="M150 170Q170 160 186 166" ${GLINT}/>`,
  jacket: () => body(LONG) + seam('M206 140L190 368') + seam('M178 128L196 196M222 128L212 180') +
    `<path d="M104 176L78 334M296 176L322 334" stroke="#A78BFA" stroke-width="6" fill="none"/>` + `<path d="M150 160Q170 150 190 156" ${GLINT}/>`,
  windbreaker: () => body(LONG) + body('M170 136Q172 90 200 86Q228 90 230 136Q200 150 170 136Z') +
    seam('M136 236L200 268L264 236') + seam('M200 150L200 250') + seam('M186 146L182 172M214 146L218 172'),
  coat: () => `<path d="M150 130L178 120Q200 150 222 120L250 130L298 165L318 330L290 336L270 210L282 430L118 430L130 210L110 336L82 330L102 165Z" fill="url(#c)" stroke="rgba(255,255,255,.9)" stroke-width="10" stroke-dasharray="2 9" stroke-linecap="round"/>` +
    seam('M178 120L200 230L222 120') + seam('M200 230L200 420'),
  vest: () => body('M146 140L178 128Q200 168 222 128L254 140L262 200L270 370L130 370L138 200Z') +
    [[150, 240], [212, 240], [150, 296], [212, 296]].map(([x, y]) => `<rect x="${x}" y="${y}" width="38" height="40" rx="4" ${SEAM}/>`).join('') +
    seam('M200 168L200 370'),
  babytee: () => body('M156 150L180 140Q200 158 220 140L244 150L292 184L274 222L252 210L250 320L150 320L148 210L126 222L108 184Z') +
    `<path d="M168 290Q172 250 186 236Q182 262 196 270Q194 236 210 214Q212 248 226 256Q232 272 228 290Z" fill="#0B0D14" opacity=".55"/>`,
  halter: () => body('M186 120L214 120L226 170Q262 220 254 300L146 300Q138 220 174 170Z') + seam('M186 120L168 90M214 120L232 90') +
    `<path d="M170 200Q190 180 200 210" ${GLINT}/>`,
  longsleeve: () => body(LONG) + `<path d="${sparkle(200, 250, 46)}" fill="#0B0D14" opacity=".55"/>` + `<path d="${sparkle(236, 214, 14)}" fill="#0B0D14" opacity=".45"/>`,
  meshtop: () => `<clipPath id="mk"><path d="${LONG}"/></clipPath>` + `<path d="${LONG}" fill="url(#c)" opacity=".35" stroke="rgba(255,255,255,.8)" stroke-width="1.5"/>` +
    `<rect x="60" y="120" width="280" height="260" fill="url(#mesh)" clip-path="url(#mk)"/>`,
  hoodie: () => body('M150 150L178 138Q200 158 222 138L250 150L300 180L326 330L294 336L266 226L264 320L136 320L134 226L106 336L74 330L100 180Z') +
    body('M168 146Q170 96 200 92Q230 96 232 146Q200 160 168 146Z') + seam('M200 158L200 318') + `<rect x="194" y="170" width="12" height="22" rx="3" fill="#FFFFFF"/>`,
  cargo: () => body('M130 120L270 120L292 400L218 400L200 210L182 400L108 400Z') + seam('M130 142L270 142') +
    `<rect x="112" y="250" width="36" height="52" rx="4" ${SEAM}/><rect x="252" y="250" width="36" height="52" rx="4" ${SEAM}/>` + seam('M112 386L182 386M218 386L288 386'),
  flare: () => body('M146 120L254 120L250 270L300 410L214 410L200 200L186 410L100 410L150 270Z') + seam('M146 140L254 140') +
    `<circle cx="160" cy="152" r="4" fill="#FFFFFF"/><circle cx="240" cy="152" r="4" fill="#FFFFFF"/>`,
  skirt: () => body('M140 170L260 170L300 330L100 330Z') + `<rect x="136" y="166" width="128" height="20" rx="3" fill="#0B0D14" opacity=".6"/>` +
    `<rect x="186" y="162" width="28" height="28" rx="4" fill="none" stroke="#FFFFFF" stroke-width="4"/>` + `<path d="M150 220L130 310" ${GLINT}/>`,
  track: () => body('M140 120L260 120L270 400L214 400L200 210L186 400L130 400Z') +
    `<path d="M146 132L136 396M254 132L264 396" stroke="#FFFFFF" stroke-width="7" fill="none"/>` + seam('M140 140L260 140'),
  shorts: () => body('M130 160L270 160L286 330L210 330L200 230L190 330L114 330Z') + seam('M130 180L270 180') +
    seam('M262 200L276 260') + `<rect x="230" y="220" width="30" height="40" rx="3" ${SEAM}/>`,
  boot: () => body('M160 100L236 100L240 300Q300 306 318 340L320 372L150 372L150 330L158 300Z') +
    `<rect x="142" y="370" width="186" height="42" rx="8" fill="#1A1E2C" stroke="rgba(255,255,255,.6)" stroke-width="2"/>` +
    seam('M174 130L222 150M174 160L222 180M174 190L222 210M174 220L222 240M174 250L222 270') + seam('M150 392L320 392'),
  sneaker: () => body('M70 330Q76 262 140 246L200 232Q232 262 286 270Q336 280 336 320L336 340L70 340Z') +
    `<path d="M62 338L344 338Q346 380 316 386L90 386Q58 380 62 338Z" fill="#E8ECF5" stroke="rgba(10,12,22,.3)" stroke-width="2"/>` +
    seam('M60 362Q120 350 180 364T300 362') + seam('M168 250L200 280M184 244L214 272M200 240L230 266') + `<path d="M100 300Q150 280 230 300" stroke="#A78BFA" stroke-width="6" fill="none"/>`,
  runner: () => body('M70 340Q80 290 150 276L210 266Q240 290 290 296Q336 304 336 334L336 346L70 346Z') +
    `<path d="M66 344L340 344Q342 366 320 370L86 370Q64 366 66 344Z" fill="#C79A6B"/>` + `<path d="M110 322Q170 296 250 318" stroke="#9FD8FF" stroke-width="7" fill="none"/>` + seam('M180 276L206 300M196 272L222 296'),
  sandal: () => `<path d="M120 330Q120 300 170 296L300 300Q332 306 330 330Q326 356 296 358L160 360Q120 358 120 330Z" fill="url(#c)" opacity=".75" stroke="rgba(255,255,255,.8)" stroke-width="2"/>` +
    `<path d="M168 302Q200 246 236 302M242 304Q272 258 302 306" stroke="url(#c)" stroke-width="16" fill="none" stroke-linecap="round" opacity=".9"/>` +
    [[190, 270], [214, 262], [262, 272], [286, 282]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#FFFFFF"/>`).join(''),
  slide: () => `<rect x="96" y="330" width="228" height="48" rx="22" fill="#1A1E2C" stroke="rgba(255,255,255,.6)" stroke-width="2"/>` +
    `<path d="M128 336Q200 220 296 336Z" fill="url(#c)" stroke="rgba(255,255,255,.95)" stroke-width="12" stroke-dasharray="1 10" stroke-linecap="round"/>`,
  shades: () => body('M80 230Q200 186 320 230Q326 284 276 296Q232 302 212 270L188 270Q168 302 124 296Q74 284 80 230Z') +
    `<path d="M80 232L46 218M320 232L354 218" stroke="#E8ECF5" stroke-width="7" stroke-linecap="round"/>` + `<path d="M110 240Q150 222 190 232" ${GLINT}/>`,
  clips: () => butterfly(140, 220, 1) + butterfly(268, 250, 0.8) + butterfly(190, 340, 0.65),
  belt: () => Array.from({ length: 11 }, (_, i) => {
    const x = 70 + i * 26; const y = 250 + Math.sin(i / 10 * Math.PI) * 50;
    return `<ellipse cx="${x}" cy="${y}" rx="15" ry="10" fill="none" stroke="url(#c)" stroke-width="7" transform="rotate(${i % 2 ? 30 : -30} ${x} ${y})"/>`;
  }).join('') + `<path d="${sparkle(300, 330, 30)}" fill="url(#c)" stroke="#FFFFFF" stroke-width="1.5"/>` + `<path d="M330 252L330 300" stroke="url(#c)" stroke-width="5"/>`,
  bag: () => Array.from({ length: 13 }, (_, i) => {
    const t = i / 12; const x = 130 + t * 140; const y = 220 - Math.sin(t * Math.PI) * 100;
    return `<ellipse cx="${x}" cy="${y}" rx="8" ry="5" fill="none" stroke="#E8ECF5" stroke-width="4" transform="rotate(${(t - 0.5) * 120} ${x} ${y})"/>`;
  }).join('') + body('M100 250Q100 220 132 220L268 220Q300 220 300 250L300 320Q300 345 270 345L130 345Q100 345 100 320Z') +
    `<path d="M100 248L300 248L280 290L120 290Z" fill="#0B0D14" opacity=".35"/>` + `<rect x="188" y="280" width="24" height="18" rx="4" fill="#FFFFFF"/>`
};

const SHAPE_FOR = {
  p01: 'puffer', p02: 'jacket', p03: 'windbreaker', p04: 'coat', p05: 'vest',
  p06: 'babytee', p07: 'halter', p08: 'longsleeve', p09: 'meshtop', p10: 'hoodie',
  p11: 'cargo', p12: 'flare', p13: 'skirt', p14: 'track', p15: 'shorts',
  p16: 'boot', p17: 'sneaker', p18: 'sandal', p19: 'runner', p20: 'slide',
  p21: 'shades', p22: 'clips', p23: 'belt', p24: 'bag'
};

function art(id, i) {
  const hue = (200 + i * 37) % 360;
  const hue2 = (hue + 70) % 360;
  const shape = SHAPES[SHAPE_FOR[id]] || SHAPES.longsleeve;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
<defs>
<radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="hsl(${hue},45%,20%)"/><stop offset=".55" stop-color="#0B0D14"/><stop offset="1" stop-color="#05060A"/></radialGradient>
<linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".3" stop-color="hsl(${hue},85%,84%)"/><stop offset=".55" stop-color="#DDE3EE"/><stop offset=".8" stop-color="hsl(${hue2},70%,74%)"/><stop offset="1" stop-color="#7F74C4"/></linearGradient>
<pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="hsl(${hue},60%,70%)" stroke-opacity=".12"/></pattern>
<pattern id="mesh" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5L5 0L10 5L5 10Z" fill="none" stroke="#FFFFFF" stroke-opacity=".75" stroke-width="1.2"/></pattern>
</defs>
<rect width="400" height="500" fill="url(#bg)"/>
<rect width="400" height="500" fill="url(#grid)"/>
<circle cx="200" cy="250" r="150" fill="none" stroke="hsl(${hue},70%,75%)" stroke-opacity=".18" stroke-width="1.5"/>
<ellipse cx="200" cy="440" rx="130" ry="14" fill="#000" opacity=".5"/>
${shape()}
<path d="${sparkle(332, 74, 18)}" fill="#FFFFFF" opacity=".9"/>
<path d="${sparkle(64, 420, 10)}" fill="hsl(${hue},90%,85%)" opacity=".8"/>
<path d="${sparkle(360, 140, 6)}" fill="#FFFFFF" opacity=".6"/>
</svg>
`;
}

const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));
let made = 0;
products.forEach((p, i) => {
  const file = path.join(ROOT, 'public', p.image);
  if (/^data:/.test(p.image) || (fs.existsSync(file) && !force)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, art(p.id, i));
  made++;
});
fs.writeFileSync(path.join(ROOT, 'public', 'assets', 'favicon.svg'), favicon());

// Store badges: text placeholders in each store's colour. Replace the files in
// public/assets/stores/ with the official logos from each affiliate program's brand kit.
const BADGE = {
  aliexpress: { text: 'AliExpress', fill: '#FF4747', spacing: 0, size: 13 },
  shein: { text: 'SHEIN', fill: '#111111', spacing: 2.5, size: 14 },
  bulchic: { text: 'BULCHIC', fill: '#C2185B', spacing: 1.5, size: 12.5 }
};
const stores = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8'));
let logos = 0;
stores.forEach(s => {
  const file = path.join(ROOT, 'public', s.logo);
  if (fs.existsSync(file) && !force) return;
  const b = BADGE[s.id] || { text: s.name, fill: s.color || '#111111', spacing: 0, size: 13 };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 24" width="96" height="24"><rect width="96" height="24" rx="12" fill="#FFFFFF"/><text x="48" y="16.6" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${b.size}" letter-spacing="${b.spacing}" fill="${b.fill}">${b.text}</text></svg>\n`);
  logos++;
});
console.log(`placeholder images written: ${made}, store badges: ${logos}, favicon updated`);
