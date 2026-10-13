"""Generate supabase/migrations/*_seed_v2.sql from _old_v2/data/products.json (English only, drafts)."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
en = json.load(open(root/'_old_v2/i18n/en.json', encoding='utf-8'))
products = json.load(open(root/'_old_v2/data/products.json', encoding='utf-8'))
order = ['tops', 'bottoms', 'outerwear', 'footwear', 'accessories']
def q(s):
    return "'" + str(s).replace("'", "''") + "'"
def slugify(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')
out = ['-- Migrated from drapefash v2 (data/products.json). All imported as drafts (unpublished).',
       '-- Images point to /legacy/products/*.svg placeholders shipped in /public.', '']
out.append('insert into public.categories (name, slug, gender, sort_order) values')
out.append(',\n'.join(f"  ({q(en['cat'][c])}, {q(c)}, 'unisex', {i})" for i, c in enumerate(order))
           + ",\n  ('Dresses', 'dresses', 'women', 5)")
out.append('on conflict (slug) do nothing;\n')
seen = set()
rows = []
for p in products:
    title = p['name']['en']
    slug = slugify(title)
    while slug in seen: slug += '-2'
    seen.add(slug)
    img = '/legacy/products/' + p['image'].split('/')[-1]
    rows.append(
        f"  ({q(slug)}, {q(title)}, {q(p['description']['en'])}, {p['price']}, {q(p['currency'])}, "
        f"array[{q(img)}], (select id from public.categories where slug = {q(p['category'])}), "
        f"{q(p['store'])}::public.store_type, null, {q(p['affiliate_url'])}, 'unisex', false, {str(bool(p.get('featured'))).lower()})")
out.append('insert into public.products (slug, title, description, price, currency, images, category_id, store, source_url, affiliate_url, gender, is_published, is_featured) values')
out.append(',\n'.join(rows))
out.append('on conflict (slug) do nothing;')
(root/'supabase/migrations/20261013000002_seed_v2.sql').write_text('\n'.join(out) + '\n', encoding='utf-8', newline='\n')
print(len(rows), 'products')
