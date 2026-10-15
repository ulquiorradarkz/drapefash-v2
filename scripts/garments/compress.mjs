// Compresses the garment GLBs written by build.py into public/models/garments/<body>/ (meshopt).
// node scripts/garments/compress.mjs <build output dir>   (it holds male/ and female/)
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/garments/compress.mjs <build output dir>");
  process.exit(1);
}
const out = path.join(process.cwd(), "public", "models", "garments");
let total = 0;
for (const body of ["male", "female"]) {
  const dir = path.join(src, body);
  if (!fs.existsSync(dir)) continue;
  fs.mkdirSync(path.join(out, body), { recursive: true });
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".glb"))) {
    const target = path.join(out, body, file);
    const q = (p) => JSON.stringify(p);
    execSync(`npx --yes @gltf-transform/cli@4 optimize ${q(path.join(dir, file))} ${q(target)} --compress meshopt --simplify false --texture-compress false`, { stdio: "ignore" });
    const size = fs.statSync(target).size;
    total += size;
    console.log(`${body}/${file}`.padEnd(32), `${(size / 1024).toFixed(0)} KB`);
  }
}
console.log("total", `${(total / 1024 / 1024).toFixed(2)} MB`);
