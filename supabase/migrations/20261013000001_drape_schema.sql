-- Drape schema: products, categories, clicks, page_views + RLS + admin analytics.
-- Admin = the single Supabase Auth user whose email is ahmedqlila99@gmail.com.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
do $$ begin
  create type public.store_type as enum ('aliexpress', 'shein', 'bulchic', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gender_type as enum ('women', 'men', 'unisex');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'ahmedqlila99@gmail.com', false)
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------- tables
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  gender      public.gender_type not null default 'unisex',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (char_length(title) between 1 and 300),
  description     text not null default '',
  price           numeric(12, 2) check (price is null or price >= 0),
  currency        text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  original_price  numeric(12, 2) check (original_price is null or original_price >= 0),
  images          text[] not null default '{}',
  category_id     uuid references public.categories (id) on delete set null,
  store           public.store_type not null default 'other',
  source_url      text,
  affiliate_url   text not null check (affiliate_url ~* '^https?://'),
  gender          public.gender_type not null default 'unisex',
  is_published    boolean not null default false,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_published_idx on public.products (is_published, created_at desc);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_gender_idx on public.products (gender);
create index if not exists products_store_idx on public.products (store);

create table if not exists public.clicks (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  created_at    timestamptz not null default now(),
  country       text,
  device        text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text
);
create index if not exists clicks_created_idx on public.clicks (created_at desc);
create index if not exists clicks_product_idx on public.clicks (product_id, created_at desc);

create table if not exists public.page_views (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,
  created_at  timestamptz not null default now(),
  country     text,
  device      text,
  referrer    text
);
create index if not exists page_views_created_idx on public.page_views (created_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.clicks     enable row level security;
alter table public.page_views enable row level security;

-- categories: everyone reads, only admin writes
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated using (true);
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products: public reads published only, admin reads/writes all
drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

-- clicks / page_views: inserted only by server routes (service role bypasses RLS);
-- admin may read; nobody else can read or write.
drop policy if exists clicks_admin_read on public.clicks;
create policy clicks_admin_read on public.clicks for select to authenticated using (public.is_admin());
drop policy if exists page_views_admin_read on public.page_views;
create policy page_views_admin_read on public.page_views for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.clicks, public.page_views from anon, authenticated;

-- ---------------------------------------------------------------- storage (product images)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------- admin analytics
create or replace function public.admin_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz;
  today timestamptz := date_trunc('day', now());
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  p_days := greatest(1, least(coalesce(p_days, 30), 365));
  since := today - make_interval(days => p_days - 1);

  select jsonb_build_object(
    'range_days', p_days,
    'products', jsonb_build_object(
      'total', (select count(*) from products),
      'published', (select count(*) from products where is_published),
      'featured', (select count(*) from products where is_featured)
    ),
    'views', jsonb_build_object(
      'today', (select count(*) from page_views where created_at >= today),
      'd7',    (select count(*) from page_views where created_at >= today - interval '6 days'),
      'd30',   (select count(*) from page_views where created_at >= today - interval '29 days')
    ),
    'clicks', jsonb_build_object(
      'today', (select count(*) from clicks where created_at >= today),
      'd7',    (select count(*) from clicks where created_at >= today - interval '6 days'),
      'd30',   (select count(*) from clicks where created_at >= today - interval '29 days')
    ),
    'top_products', coalesce((
      select jsonb_agg(t) from (
        select p.id, p.title, p.slug, p.store, p.images[1] as image, count(c.id)::int as clicks
        from clicks c join products p on p.id = c.product_id
        where c.created_at >= since
        group by p.id
        order by clicks desc, p.title
        limit 10
      ) t), '[]'::jsonb),
    'by_store', coalesce((
      select jsonb_agg(t) from (
        select p.store::text as store, count(*)::int as clicks
        from clicks c join products p on p.id = c.product_id
        where c.created_at >= since
        group by p.store order by clicks desc
      ) t), '[]'::jsonb),
    'by_country', coalesce((
      select jsonb_agg(t) from (
        select coalesce(nullif(c.country, ''), 'Unknown') as country, count(*)::int as clicks
        from clicks c
        where c.created_at >= since
        group by 1 order by clicks desc
        limit 15
      ) t), '[]'::jsonb),
    'series', coalesce((
      select jsonb_agg(t order by t.day) from (
        select to_char(d, 'YYYY-MM-DD') as day,
          (select count(*) from page_views v where v.created_at >= d and v.created_at < d + interval '1 day')::int as views,
          (select count(*) from clicks c where c.created_at >= d and c.created_at < d + interval '1 day')::int as clicks
        from generate_series(since, today, interval '1 day') d
      ) t), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_dashboard(integer) from public, anon;
grant execute on function public.admin_dashboard(integer) to authenticated;
