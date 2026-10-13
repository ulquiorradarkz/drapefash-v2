// Local preview.
//   node scripts/serve.js            -> live app (artifact/) at http://localhost:8080
//                                       static site (dist/)  at http://localhost:8081
// The artifact page is a fragment; it is wrapped in the same skeleton claude.ai adds.
// Outside claude.ai there is no Claude runtime, so the dashboard shows its "open inside Claude" notice.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const wrap = s => `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${s}</body></html>`;

function serve(dir, port, wrapIndex) {
  http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    let file = path.join(dir, rel);
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) { file = path.join(file, 'index.html'); rel = path.join(rel, 'index.html'); }
    if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (wrapIndex && rel.replace(/\\/g, '/') === 'index.html') return res.end(wrap(fs.readFileSync(file, 'utf8')));
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`${path.basename(dir)}/ -> http://localhost:${port}`));
}

serve(path.join(ROOT, 'artifact'), 8080, true);
serve(path.join(ROOT, 'dist'), 8081, false);
