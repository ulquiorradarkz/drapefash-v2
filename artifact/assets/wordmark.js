// "Drape" wordmark: angular tribal letterforms (capital D + lowercase r-a-p-e),
// 4-point sparkles, chrome fill. Single source for header, footer, root page, favicon.
// UMD: require() in Node (build), window.DrapeWordmark in the browser (SPA).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DrapeWordmark = factory();
})(this, function () {
  const LETTERS = {
    D: 'M-6 -6L30 0L48 16L48 46L30 64L-6 70L6 54L6 10Z M18 12L27 12L36 21L36 43L27 52L18 52Z',
    r: 'M52 14L66 20L66 28L80 18L98 15L90 30L77 31L66 41L66 58L57 70L56 24Z',
    a: 'M100 25L124 17L141 26L141 59L148 70L131 64L127 59L112 66L98 58L98 46L110 37L129 35L129 30L121 28L104 35Z M110 50L129 45L129 54L114 58Z',
    p: 'M150 14L164 20L178 15L195 24L195 52L180 61L164 58L164 76L155 89L154 24Z M164 30L178 27L183 33L183 46L176 50L164 48Z',
    e: 'M201 31L215 17L236 17L247 30L247 43L214 43L216 51L226 55L249 50L240 64L217 67L201 56Z M213 30L234 30L236 35L213 35Z'
  };
  const VIEWBOX = '-22 -26 296 120';

  function sparkle(cx, cy, r) {
    const k = r * 0.14;
    return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
  }

  const SPARKS = [
    { x: 258, y: 2, r: 12 },
    { x: -13, y: 64, r: 6 },
    { x: 124, y: -2, r: 5 }
  ];

  function defs(id) {
    return `<defs>
<linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#FFFFFF"/><stop offset=".28" stop-color="#C9D1DF"/><stop offset=".5" stop-color="#9FD8FF"/><stop offset=".68" stop-color="#EEF1F8"/><stop offset="1" stop-color="#A78BFA"/>
</linearGradient>
<linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#BFE6FF"/></linearGradient>
<filter id="${id}-f" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#A78BFA" flood-opacity=".55"/></filter>
</defs>`;
  }

  // Full wordmark. `id` must be unique per document (gradient ids).
  function wordmark(id, className) {
    const letters = Object.values(LETTERS).map(d => `<path d="${d}" fill-rule="evenodd"/>`).join('');
    const sparks = SPARKS.map((s, i) => `<path class="wm-spark wm-spark-${i}" d="${sparkle(s.x, s.y, s.r)}" fill="url(#${id}-s)"/>`).join('');
    return `<svg class="${className || 'wordmark'}" viewBox="${VIEWBOX}" aria-hidden="true" focusable="false">${defs(id)}<g fill="url(#${id}-g)" stroke="rgba(255,255,255,.55)" stroke-width=".8" filter="url(#${id}-f)">${letters}</g>${sparks}</svg>`;
  }

  // Favicon: the D glyph with its sparkle, on the void background.
  function favicon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-17 -10 80 80">${defs('fv')}<rect x="-17" y="-10" width="80" height="80" rx="16" fill="#05060A"/><path d="${LETTERS.D}" fill-rule="evenodd" fill="url(#fv-g)" filter="url(#fv-f)"/><path d="${sparkle(51, 0, 9)}" fill="url(#fv-s)"/></svg>`;
  }

  return { wordmark, favicon, sparkle };
});
