// Inline SVG icons. Directional icons carry the `icon-dir` class, which
// mirrors them under html[dir="rtl"]. Non-directional icons never flip.
// UMD: require() in Node, window.DrapeIcons in the browser.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DrapeIcons = factory();
})(this, function () {
  const svg = (body, cls) =>
    `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  return {
    // Directional: drawn pointing toward inline-end (or inline-start for *Start) in LTR.
    chevronEnd: () => svg('<path d="M9 5l7 7-7 7"/>', 'icon-dir'),
    chevronStart: () => svg('<path d="M15 5l-7 7 7 7"/>', 'icon-dir'),
    arrowEnd: () => svg('<path d="M4 12h15M13 6l6 6-6 6"/>', 'icon-dir'),
    arrowStart: () => svg('<path d="M20 12H5M11 6l-6 6 6 6"/>', 'icon-dir'),
    external: () => svg('<path d="M7 17L17 7M9 7h8v8"/>', 'icon-dir'),
    // Non-directional.
    chevronDown: () => svg('<path d="M6 9l6 6 6-6"/>'),
    globe: () => svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z"/>'),
    search: () => svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    check: () => svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    info: () => svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    chart: () => svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    plus: () => svg('<path d="M12 5v14M5 12h14"/>'),
    list: () => svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    image: () => svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'),
    trash: () => svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    pencil: () => svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
    magic: () => svg('<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20L14 10"/><path d="M19 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>'),
    sparkle: (cls) =>
      `<svg class="${cls || 'sparkle'}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 0Q13.7 10.3 24 12Q13.7 13.7 12 24Q10.3 13.7 0 12Q10.3 10.3 12 0Z" fill="currentColor"/></svg>`
  };
});
