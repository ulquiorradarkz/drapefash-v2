import { extractProduct } from "@/lib/import/extract";

const url = process.argv[2];
const r = await extractProduct({ url, affiliate_url: "" }, [
  { id: "00000000-0000-4000-8000-000000000001", name: "Jackets & Coats", slug: "outerwear", gender: "unisex", sort_order: 0 },
  { id: "00000000-0000-4000-8000-000000000002", name: "Tops & Tees", slug: "tops", gender: "unisex", sort_order: 1 },
]);
console.log(JSON.stringify({ ...r, data: { ...r.data, description: r.data.description.slice(0, 80) } }, null, 1));
