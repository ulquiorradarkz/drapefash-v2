// Deletes products created by the e2e test (affiliate links tagged drape-e2e).
// Usage: node --env-file=.env.local scripts/cleanup-e2e.mjs [--keep-latest]
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await db.from("products").select("id, slug, created_at").ilike("affiliate_url", "%drape-e2e%").order("created_at", { ascending: false });
if (error) throw error;
const keep = process.argv.includes("--keep-latest") ? 2 : 0;
const remove = data.slice(keep);
for (const p of remove) {
  const { data: files } = await db.storage.from("product-images").list(p.id);
  if (files?.length) await db.storage.from("product-images").remove(files.map((f) => `${p.id}/${f.name}`));
  await db.from("products").delete().eq("id", p.id);
  console.log("deleted", p.slug);
}
console.log(`kept ${Math.min(keep, data.length)}, deleted ${remove.length}`);
