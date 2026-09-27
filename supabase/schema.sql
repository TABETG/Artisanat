-- =====================================================================
-- Boutique Tamurt — base de données
-- À coller UNE FOIS dans Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Produits ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 200),
  description  text not null default '',
  category     text not null default 'tapis',
  price_cents  integer not null check (price_cents >= 0),
  stock        integer not null default 1 check (stock >= 0),
  width_cm     integer check (width_cm is null or width_cm > 0),
  length_cm    integer check (length_cm is null or length_cm > 0),
  material     text not null default 'Laine de mouton',
  origin       text not null default '',
  images       text[] not null default '{}',
  featured     boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- Administrateurs (le ou les propriétaires) ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Commandes (créées uniquement par le serveur après paiement) ----------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text not null unique,
  stripe_payment_id   text,
  email               text,
  customer_name       text,
  phone               text,
  shipping_name       text,
  shipping_address    jsonb,
  subtotal_cents      integer not null default 0,
  shipping_cents      integer not null default 0,
  total_cents         integer not null default 0,
  status              text not null default 'paid'
                      check (status in ('paid','check_stock','shipped','delivered','cancelled')),
  tracking_number     text,
  note                text,
  created_at          timestamptz not null default now()
);

create table if not exists public.order_items (
  id                bigint generated always as identity primary key,
  order_id          uuid not null references public.orders(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,
  name              text not null,
  unit_price_cents  integer not null,
  quantity          integer not null
);

-- ---------- Décrément de stock (appelé par le serveur uniquement) ----------
create or replace function public.decrement_stock(p_product_id uuid, p_quantity integer)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.products
     set stock = stock - p_quantity, updated_at = now()
   where id = p_product_id and stock >= p_quantity;
  if found then return true; end if;
  update public.products set stock = 0, updated_at = now() where id = p_product_id;
  return false;
end;
$$;
revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

-- ---------- Sécurité : Row Level Security ----------
alter table public.products    enable row level security;
alter table public.admins      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "produits visibles" on public.products;
create policy "produits visibles" on public.products
  for select using (active or public.is_admin());

drop policy if exists "admin gere produits" on public.products;
create policy "admin gere produits" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin se voit" on public.admins;
create policy "admin se voit" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin lit commandes" on public.orders;
create policy "admin lit commandes" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "admin modifie commandes" on public.orders;
create policy "admin modifie commandes" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin lit lignes" on public.order_items;
create policy "admin lit lignes" on public.order_items
  for select to authenticated using (public.is_admin());

-- ---------- Photos des produits ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "admin envoie photos" on storage.objects;
create policy "admin envoie photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin modifie photos" on storage.objects;
create policy "admin modifie photos" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin supprime photos" on storage.objects;
create policy "admin supprime photos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

create index if not exists products_active_created_idx on public.products (active, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);
