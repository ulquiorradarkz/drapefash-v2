// Redraws the 24 placeholder product pictures (public/legacy/products/pNN.svg) in the store's style:
// a flat pale concrete ground, the garment as a flat print in charcoal, off-white, white or grey (a few in sage),
// with halftone dots.
// Same silhouettes as the first version of the site; only the treatment changes.
// Decorations stay faint so the fitting room's cut-out keeps only the garment.
// Run: node scripts/gen-seed-art.mjs

import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "legacy", "products");

const sparkle = (cx, cy, r) => {
  const k = r * 0.12;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
};

const INKS = {
  ink: { fill: "#1c1c1c", dot: "#2e2e2e", seam: "rgba(241,241,239,.55)", glint: "#d9d9d6", accent: "#8fa68e", trim: "#f1f1ef" },
  silver: { fill: "#e4e3de", dot: "#cfcdc6", seam: "rgba(10,10,10,.5)", glint: "#ffffff", accent: "#0a0a0a", trim: "#0a0a0a" },
  white: { fill: "#f7f7f5", dot: "#dcdcd8", seam: "rgba(10,10,10,.42)", glint: "#0a0a0a", accent: "#0a0a0a", trim: "#0a0a0a" },
  grey: { fill: "#6b6b6b", dot: "#575757", seam: "rgba(251,251,250,.55)", glint: "#f0f0ee", accent: "#0a0a0a", trim: "#0a0a0a" },
  oxblood: { fill: "#8fa68e", dot: "#7f967e", seam: "rgba(28,28,28,.45)", glint: "#f1f1ef", accent: "#1c1c1c", trim: "#1c1c1c" },
};

function shapes(c) {
  const SEAM = `stroke="${c.seam}" stroke-width="3" fill="none" stroke-linecap="round"`;
  const GLINT = `stroke="${c.glint}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"`;
  const body = (d) => `<path d="${d}" fill="url(#c)" stroke="${c.trim}" stroke-opacity=".35" stroke-width="1.5"/>`;
  const seam = (d) => `<path d="${d}" ${SEAM}/>`;
  const LONG = "M150 140L178 128Q200 150 222 128L250 140L300 170L330 340L298 346L266 220L264 370L136 370L134 220L102 346L70 340L100 170Z";
  const butterfly = (cx, cy, s) => {
    const w = (dx, dy1, dx2, dy2) => `M${cx} ${cy}Q${cx + dx * s} ${cy + dy1 * s} ${cx + dx2 * s} ${cy + dy2 * s}`;
    return (
      body(`${w(-44, -56, -54, -8)}Q${cx - 30 * s} ${cy + 8 * s} ${cx} ${cy}Q${cx - 34 * s} ${cy + 18 * s} ${cx - 30 * s} ${cy + 46 * s}Q${cx - 6 * s} ${cy + 36 * s} ${cx} ${cy}Z`) +
      body(`${w(44, -56, 54, -8)}Q${cx + 30 * s} ${cy + 8 * s} ${cx} ${cy}Q${cx + 34 * s} ${cy + 18 * s} ${cx + 30 * s} ${cy + 46 * s}Q${cx + 6 * s} ${cy + 36 * s} ${cx} ${cy}Z`) +
      `<rect x="${cx - 4 * s}" y="${cy - 26 * s}" width="${8 * s}" height="${60 * s}" fill="${c.accent}"/>`
    );
  };
  return {
    puffer: () =>
      body("M140 150Q200 118 260 150L306 178Q330 260 330 330L292 338L272 236L276 352Q200 372 124 352L128 236L108 338L70 330Q70 260 94 178Z") +
      [200, 240, 280, 320].map((y) => seam(`M128 ${y}Q200 ${y + 14} 272 ${y}`)).join("") +
      seam("M96 230Q84 234 76 260M304 230Q316 234 324 260") +
      body("M168 152L172 112Q200 102 228 112L232 152Q200 138 168 152Z") +
      `<path d="M150 170Q170 160 186 166" ${GLINT}/>`,
    jacket: () =>
      body(LONG) + seam("M206 140L190 368") + seam("M178 128L196 196M222 128L212 180") + `<path d="M104 176L78 334M296 176L322 334" stroke="${c.accent}" stroke-width="6" fill="none"/>`,
    windbreaker: () => body(LONG) + body("M170 136Q172 90 200 86Q228 90 230 136Q200 150 170 136Z") + seam("M136 236L200 268L264 236") + seam("M200 150L200 250") + seam("M186 146L182 172M214 146L218 172"),
    coat: () =>
      `<path d="M150 130L178 120Q200 150 222 120L250 130L298 165L318 330L290 336L270 210L282 430L118 430L130 210L110 336L82 330L102 165Z" fill="url(#c)" stroke="${c.glint}" stroke-width="10" stroke-dasharray="2 9" stroke-linecap="round"/>` +
      seam("M178 120L200 230L222 120") +
      seam("M200 230L200 420"),
    vest: () =>
      body("M146 140L178 128Q200 168 222 128L254 140L262 200L270 370L130 370L138 200Z") +
      [[150, 240], [212, 240], [150, 296], [212, 296]].map(([x, y]) => `<rect x="${x}" y="${y}" width="38" height="40" ${SEAM}/>`).join("") +
      seam("M200 168L200 370"),
    babytee: () =>
      body("M156 150L180 140Q200 158 220 140L244 150L292 184L274 222L252 210L250 320L150 320L148 210L126 222L108 184Z") +
      `<path d="M168 290Q172 250 186 236Q182 262 196 270Q194 236 210 214Q212 248 226 256Q232 272 228 290Z" fill="${c.accent}"/>`,
    halter: () => body("M186 120L214 120L226 170Q262 220 254 300L146 300Q138 220 174 170Z") + seam("M186 120L168 90M214 120L232 90") + `<path d="M170 200Q190 180 200 210" ${GLINT}/>`,
    longsleeve: () => body(LONG) + `<path d="${sparkle(200, 250, 46)}" fill="${c.accent}"/>` + `<path d="${sparkle(236, 214, 14)}" fill="${c.accent}"/>`,
    meshtop: () =>
      `<clipPath id="mk"><path d="${LONG}"/></clipPath>` +
      `<path d="${LONG}" fill="url(#c)" opacity=".45" stroke="${c.trim}" stroke-opacity=".5" stroke-width="1.5"/>` +
      `<rect x="60" y="120" width="280" height="260" fill="url(#mesh)" clip-path="url(#mk)"/>`,
    hoodie: () =>
      body("M150 150L178 138Q200 158 222 138L250 150L300 180L326 330L294 336L266 226L264 320L136 320L134 226L106 336L74 330L100 180Z") +
      body("M168 146Q170 96 200 92Q230 96 232 146Q200 160 168 146Z") +
      seam("M200 158L200 318") +
      `<rect x="194" y="170" width="12" height="22" fill="${c.glint}"/>`,
    cargo: () =>
      body("M130 120L270 120L292 400L218 400L200 210L182 400L108 400Z") +
      seam("M130 142L270 142") +
      `<rect x="112" y="250" width="36" height="52" ${SEAM}/><rect x="252" y="250" width="36" height="52" ${SEAM}/>` +
      seam("M112 386L182 386M218 386L288 386"),
    flare: () => body("M146 120L254 120L250 270L300 410L214 410L200 200L186 410L100 410L150 270Z") + seam("M146 140L254 140") + `<circle cx="160" cy="152" r="4" fill="${c.glint}"/><circle cx="240" cy="152" r="4" fill="${c.glint}"/>`,
    skirt: () =>
      body("M140 170L260 170L300 330L100 330Z") +
      `<rect x="136" y="166" width="128" height="20" fill="${c.accent}"/>` +
      `<rect x="186" y="162" width="28" height="28" fill="none" stroke="${c.glint}" stroke-width="4"/>` +
      `<path d="M150 220L130 310" ${GLINT}/>`,
    track: () => body("M140 120L260 120L270 400L214 400L200 210L186 400L130 400Z") + `<path d="M146 132L136 396M254 132L264 396" stroke="${c.accent}" stroke-width="7" fill="none"/>` + seam("M140 140L260 140"),
    shorts: () => body("M130 160L270 160L286 330L210 330L200 230L190 330L114 330Z") + seam("M130 180L270 180") + seam("M262 200L276 260") + `<rect x="230" y="220" width="30" height="40" ${SEAM}/>`,
    boot: () =>
      body("M160 100L236 100L240 300Q300 306 318 340L320 372L150 372L150 330L158 300Z") +
      `<rect x="142" y="370" width="186" height="42" fill="${c.accent}"/>` +
      seam("M174 130L222 150M174 160L222 180M174 190L222 210M174 220L222 240M174 250L222 270") +
      seam("M150 392L320 392"),
    sneaker: () =>
      body("M70 330Q76 262 140 246L200 232Q232 262 286 270Q336 280 336 320L336 340L70 340Z") +
      `<path d="M62 338L344 338Q346 380 316 386L90 386Q58 380 62 338Z" fill="#f4f4f2" stroke="#0b0b0e" stroke-width="2"/>` +
      seam("M168 250L200 280M184 244L214 272M200 240L230 266") +
      `<path d="M100 300Q150 280 230 300" stroke="${c.accent}" stroke-width="6" fill="none"/>`,
    runner: () =>
      body("M70 340Q80 290 150 276L210 266Q240 290 290 296Q336 304 336 334L336 346L70 346Z") +
      `<path d="M66 344L340 344Q342 366 320 370L86 370Q64 366 66 344Z" fill="#0b0b0e"/>` +
      `<path d="M110 322Q170 296 250 318" stroke="${c.accent}" stroke-width="7" fill="none"/>` +
      seam("M180 276L206 300M196 272L222 296"),
    sandal: () =>
      `<path d="M120 330Q120 300 170 296L300 300Q332 306 330 330Q326 356 296 358L160 360Q120 358 120 330Z" fill="url(#c)" stroke="${c.trim}" stroke-opacity=".4" stroke-width="2"/>` +
      `<path d="M168 302Q200 246 236 302M242 304Q272 258 302 306" stroke="url(#c)" stroke-width="16" fill="none" stroke-linecap="round"/>` +
      [[190, 270], [214, 262], [262, 272], [286, 282]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c.glint}"/>`).join(""),
    slide: () =>
      `<rect x="96" y="330" width="228" height="48" rx="22" fill="#0b0b0e"/>` +
      `<path d="M128 336Q200 220 296 336Z" fill="url(#c)" stroke="${c.glint}" stroke-width="12" stroke-dasharray="1 10" stroke-linecap="round"/>`,
    shades: () =>
      body("M80 230Q200 186 320 230Q326 284 276 296Q232 302 212 270L188 270Q168 302 124 296Q74 284 80 230Z") +
      `<path d="M80 232L46 218M320 232L354 218" stroke="${c.accent}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M110 240Q150 222 190 232" ${GLINT}/>`,
    clips: () => butterfly(140, 220, 1) + butterfly(268, 250, 0.8) + butterfly(190, 340, 0.65),
    belt: () =>
      Array.from({ length: 11 }, (_, i) => {
        const x = 70 + i * 26;
        const y = 250 + Math.sin((i / 10) * Math.PI) * 50;
        return `<ellipse cx="${x}" cy="${y}" rx="15" ry="10" fill="none" stroke="url(#c)" stroke-width="7" transform="rotate(${i % 2 ? 30 : -30} ${x} ${y})"/>`;
      }).join("") +
      `<path d="${sparkle(300, 330, 30)}" fill="url(#c)" stroke="${c.trim}" stroke-width="1.5"/>` +
      `<path d="M330 252L330 300" stroke="url(#c)" stroke-width="5"/>`,
    bag: () =>
      Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        const x = 130 + t * 140;
        const y = 220 - Math.sin(t * Math.PI) * 100;
        return `<ellipse cx="${x}" cy="${y}" rx="8" ry="5" fill="none" stroke="${c.accent}" stroke-width="4" transform="rotate(${(t - 0.5) * 120} ${x} ${y})"/>`;
      }).join("") +
      body("M100 250Q100 220 132 220L268 220Q300 220 300 250L300 320Q300 345 270 345L130 345Q100 345 100 320Z") +
      `<path d="M100 248L300 248L280 290L120 290Z" fill="${c.accent}" opacity=".55"/>` +
      `<rect x="188" y="280" width="24" height="18" fill="${c.glint}"/>`,
  };
}

const SHAPE_FOR = [
  "puffer", "jacket", "windbreaker", "coat", "vest", "babytee", "halter", "longsleeve", "meshtop", "hoodie", "cargo", "flare",
  "skirt", "track", "shorts", "boot", "sneaker", "sandal", "runner", "slide", "shades", "clips", "belt", "bag",
];
const TONE_FOR = ["silver", "ink", "white", "ink", "grey", "ink", "silver", "white", "grey", "ink", "grey", "silver",
  "ink", "white", "silver", "ink", "white", "grey", "oxblood", "ink", "ink", "silver", "silver", "oxblood"];

function art(i) {
  const c = INKS[TONE_FOR[i]];
  const shape = shapes(c)[SHAPE_FOR[i]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
<defs>
<pattern id="c" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${c.fill}"/><circle cx="3" cy="3" r="1.15" fill="${c.dot}"/></pattern>
<pattern id="mesh" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5L5 0L10 5L5 10Z" fill="none" stroke="${c.fill === "#e4e3de" || c.fill === "#f7f7f5" ? "#0a0a0a" : c.fill}" stroke-opacity=".85" stroke-width="1.3"/></pattern>
</defs>
<rect width="400" height="500" fill="#c8c5ba"/>
${shape()}
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
SHAPE_FOR.forEach((_, i) => {
  fs.writeFileSync(path.join(OUT, `p${String(i + 1).padStart(2, "0")}.svg`), art(i));
});
console.log(`wrote ${SHAPE_FOR.length} pictures to ${OUT}`);
