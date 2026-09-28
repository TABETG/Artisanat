-- =====================================================================
-- Boutique Artisanat — base de données
-- À coller dans Supabase → SQL Editor → New query → Run
-- (peut être relancé sans risque après une mise à jour)
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

-- ---------- Champs ajoutés (version 3) : relançables sans risque ----------
alter table public.products add column if not exists reference              text not null default '';
alter table public.products add column if not exists compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= 0);
alter table public.products add column if not exists technique              text not null default '';
alter table public.products add column if not exists colors                 text[] not null default '{}';
alter table public.products add column if not exists pile_height_mm         integer check (pile_height_mm is null or pile_height_mm >= 0);
alter table public.products add column if not exists weight_kg              numeric(6,2) check (weight_kg is null or weight_kg >= 0);
alter table public.products add column if not exists care                   text not null default '';
alter table public.products add column if not exists made_to_order          boolean not null default false;
alter table public.products add column if not exists low_stock_threshold    integer not null default 2 check (low_stock_threshold >= 0);

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

alter table public.orders add column if not exists tracking_carrier text;
alter table public.orders add column if not exists shipped_email_sent_at timestamptz;

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

-- ---------- Alertes « prévenez-moi quand c'est de retour » ----------
create table if not exists public.stock_alerts (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references public.products(id) on delete cascade,
  email       text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notified    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (product_id, email)
);
alter table public.stock_alerts enable row level security;

-- n'importe quel visiteur peut laisser son email (mais pas lire ceux des autres)
drop policy if exists "visiteur demande alerte" on public.stock_alerts;
create policy "visiteur demande alerte" on public.stock_alerts
  for insert to anon, authenticated with check (notified = false);

drop policy if exists "admin gere alertes" on public.stock_alerts;
create policy "admin gere alertes" on public.stock_alerts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Réglages de la boutique (version 4) : une seule ligne ----------
create table if not exists public.settings (
  id          integer primary key default 1 check (id = 1),
  data        jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;
alter table public.settings enable row level security;

drop policy if exists "reglages publics" on public.settings;
create policy "reglages publics" on public.settings for select using (true);

drop policy if exists "admin modifie reglages" on public.settings;
create policy "admin modifie reglages" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Avis clients (version 4) : publiés après validation ----------
create table if not exists public.reviews (
  id           bigint generated always as identity primary key,
  product_id   uuid not null references public.products(id) on delete cascade,
  author_name  text not null check (char_length(author_name) between 1 and 60),
  email        text not null check (char_length(email) <= 200),
  rating       integer not null check (rating between 1 and 5),
  comment      text not null default '' check (char_length(comment) <= 1500),
  approved     boolean not null default false,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.reviews enable row level security;

drop policy if exists "visiteur laisse avis" on public.reviews;
create policy "visiteur laisse avis" on public.reviews
  for insert to anon, authenticated with check (approved = false and verified = false);

drop policy if exists "avis publies visibles" on public.reviews;
create policy "avis publies visibles" on public.reviews
  for select using (approved or public.is_admin());

drop policy if exists "admin gere avis" on public.reviews;
create policy "admin gere avis" on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- L'email de l'auteur ne doit jamais être lisible par les visiteurs
revoke select on public.reviews from anon;
grant select (id, product_id, author_name, rating, comment, approved, verified, created_at) on public.reviews to anon;
grant insert (product_id, author_name, email, rating, comment) on public.reviews to anon;

create index if not exists reviews_product_idx on public.reviews (product_id, approved);

create index if not exists products_active_created_idx on public.products (active, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);
