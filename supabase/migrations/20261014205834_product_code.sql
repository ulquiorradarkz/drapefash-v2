-- Item IDs: a short code the owner gives each piece (for example DRP-014).
-- Visitors type it in the search box (or open /<lang>/id/<code>) and land on that piece,
-- so a code seen on Instagram or in a story leads straight to the product.
--
-- Codes are stored in capitals: letters A–Z, digits and dashes, 2 to 24 characters,
-- never starting or ending with a dash. Each code belongs to one product only.

alter table public.products add column if not exists code text;

alter table public.products drop constraint if exists products_code_format;
alter table public.products add constraint products_code_format
  check (code is null or code ~ '^[A-Z0-9]([A-Z0-9-]{0,22}[A-Z0-9])?$');

create unique index if not exists products_code_key on public.products (code);

-- Seed products from the first version of the site: p01.svg … p24.svg become DRP-001 … DRP-024.
update public.products
  set code = 'DRP-' || lpad(substring(images[1] from '^/legacy/products/p(\d+)\.svg$'), 3, '0')
  where code is null and images[1] ~ '^/legacy/products/p\d+\.svg$';
