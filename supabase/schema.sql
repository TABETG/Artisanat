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
-- version 6 : badges et promotions datées
alter table public.products add column if not exists badges                 text[] not null default '{}';
alter table public.products add column if not exists promo_ends_at          timestamptz;
alter table public.products add column if not exists sales_count            integer not null default 0 check (sales_count >= 0);
-- version 10 : mise en ligne programmée et statistiques anonymes
alter table public.products add column if not exists publish_at             timestamptz;
alter table public.products add column if not exists views_count            integer not null default 0;
alter table public.products add column if not exists cart_adds_count        integer not null default 0;

-- ---------- Administrateurs (le ou les propriétaires) ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Administrateur = présent dans la table admins ET, s'il a activé la double authentification,
-- connecté avec son code (niveau aal2). Un mot de passe volé ne suffit donc pas.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
     );
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
                      check (status in ('paid','check_stock','shipped','delivered','cancelled','refunded')),
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
alter table public.orders add column if not exists customer_message text;
alter table public.orders add column if not exists shipping_method text;
alter table public.orders add column if not exists discount_cents integer not null default 0;
alter table public.orders add column if not exists promo_code text;
-- version 8 : remboursements et factures numérotées
alter table public.orders add column if not exists refunded_cents integer not null default 0;
alter table public.orders add column if not exists invoice_number bigint generated by default as identity;
alter table public.orders drop constraint if exists orders_status_check;
-- 'to_confirm' : anciennes commandes à confirmer par téléphone (conservées, plus créées)
alter table public.orders add constraint orders_status_check
  check (status in ('to_confirm','paid','check_stock','shipped','delivered','cancelled','refunded'));

-- ---------- Décrément de stock (appelé par le serveur uniquement) ----------
create or replace function public.decrement_stock(p_product_id uuid, p_quantity integer)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.products
     set stock = stock - p_quantity, sales_count = sales_count + p_quantity, updated_at = now()
   where id = p_product_id and stock >= p_quantity;
  if found then return true; end if;
  update public.products set stock = 0, sales_count = sales_count + p_quantity, updated_at = now() where id = p_product_id;
  return false;
end;
$$;
revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

-- Remise en stock après un retour (appelée par le serveur uniquement)
create or replace function public.increment_stock(p_product_id uuid, p_quantity integer)
returns void language sql security definer set search_path = public as $$
  update public.products set stock = stock + p_quantity, updated_at = now() where id = p_product_id;
$$;
revoke execute on function public.increment_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_stock(uuid, integer) to service_role;

-- ---------- Sécurité : Row Level Security ----------
alter table public.products    enable row level security;
alter table public.admins      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "produits visibles" on public.products;
create policy "produits visibles" on public.products
  for select using ((active and (publish_at is null or publish_at <= now())) or public.is_admin());

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

-- ---------- Lettre d'information (version 5) ----------
create table if not exists public.newsletter (
  id          bigint generated always as identity primary key,
  email       text not null unique check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at  timestamptz not null default now()
);
alter table public.newsletter enable row level security;
drop policy if exists "visiteur s'inscrit" on public.newsletter;
create policy "visiteur s'inscrit" on public.newsletter for insert to anon, authenticated with check (true);
drop policy if exists "admin gere newsletter" on public.newsletter;
create policy "admin gere newsletter" on public.newsletter
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Demandes sur mesure (version 9) ----------
create table if not exists public.custom_requests (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) <= 200),
  phone       text check (char_length(phone) <= 40),
  product_id  uuid references public.products(id) on delete set null,
  room        text check (char_length(room) <= 60),
  width_cm    integer check (width_cm is null or width_cm between 10 and 2000),
  length_cm   integer check (length_cm is null or length_cm between 10 and 2000),
  colors      text check (char_length(colors) <= 200),
  budget      text check (char_length(budget) <= 60),
  message     text not null default '' check (char_length(message) <= 3000),
  status      text not null default 'new' check (status in ('new','quoted','accepted','done','declined')),
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.custom_requests enable row level security;
drop policy if exists "visiteur demande sur mesure" on public.custom_requests;
create policy "visiteur demande sur mesure" on public.custom_requests
  for insert to anon, authenticated with check (status = 'new' and note is null);
drop policy if exists "admin gere sur mesure" on public.custom_requests;
create policy "admin gere sur mesure" on public.custom_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Cartes cadeaux (version 9) : créées par le serveur après paiement ----------
create table if not exists public.gift_cards (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  amount_cents       integer not null check (amount_cents > 0),
  buyer_name         text,
  buyer_email        text,
  recipient_name     text,
  recipient_email    text,
  message            text,
  stripe_session_id  text not null unique,
  promotion_code_id  text,
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);
alter table public.gift_cards enable row level security;
drop policy if exists "admin lit cartes cadeaux" on public.gift_cards;
create policy "admin lit cartes cadeaux" on public.gift_cards for select to authenticated using (public.is_admin());

-- ---------- Statistiques anonymes : vues et ajouts au panier (version 10) ----------
create or replace function public.track_product(p_product_id uuid, p_kind text)
returns void language sql security definer set search_path = public as $$
  update public.products
     set views_count = views_count + case when p_kind = 'view' then 1 else 0 end,
         cart_adds_count = cart_adds_count + case when p_kind = 'cart' then 1 else 0 end
   where id = p_product_id and active;
$$;
grant execute on function public.track_product(uuid, text) to anon, authenticated;

-- ---------- Retours demandés en ligne (version 10) : créés par le serveur ----------
create table if not exists public.returns (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  email       text not null,
  items       jsonb not null default '[]',
  reason      text not null,
  comment     text not null default '',
  status      text not null default 'new' check (status in ('new','accepted','received','refunded','declined')),
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.returns enable row level security;
drop policy if exists "admin gere retours" on public.returns;
create policy "admin gere retours" on public.returns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Historique des envois de lettre d'information (version 10) ----------
create table if not exists public.campaigns (
  id          bigint generated always as identity primary key,
  subject     text not null,
  sent_count  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.campaigns enable row level security;
drop policy if exists "admin lit envois" on public.campaigns;
create policy "admin lit envois" on public.campaigns for select to authenticated using (public.is_admin());

-- ---------- Messages de contact (version 11) ----------
create table if not exists public.contact_messages (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) <= 200),
  subject     text not null default '' check (char_length(subject) <= 150),
  message     text not null check (char_length(message) between 1 and 3000),
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists "visiteur ecrit" on public.contact_messages;
create policy "visiteur ecrit" on public.contact_messages for insert to anon, authenticated with check (handled = false);
drop policy if exists "admin gere messages" on public.contact_messages;
create policy "admin gere messages" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Espace client (version 13) : chaque client voit uniquement ses propres données ----------
create or replace function public.my_email()
returns text language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

drop policy if exists "client lit ses commandes" on public.orders;
create policy "client lit ses commandes" on public.orders
  for select to authenticated using (public.my_email() <> '' and lower(email) = public.my_email());

drop policy if exists "client lit ses lignes" on public.order_items;
create policy "client lit ses lignes" on public.order_items
  for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and public.my_email() <> '' and lower(o.email) = public.my_email()));

drop policy if exists "client lit ses retours" on public.returns;
create policy "client lit ses retours" on public.returns
  for select to authenticated using (public.my_email() <> '' and lower(email) = public.my_email());

drop policy if exists "client voit son inscription" on public.newsletter;
create policy "client voit son inscription" on public.newsletter
  for select to authenticated using (lower(email) = public.my_email());
drop policy if exists "client se desinscrit" on public.newsletter;
create policy "client se desinscrit" on public.newsletter
  for delete to authenticated using (lower(email) = public.my_email());

drop policy if exists "client lit ses cartes" on public.gift_cards;
create policy "client lit ses cartes" on public.gift_cards
  for select to authenticated using (public.my_email() <> '' and (lower(buyer_email) = public.my_email() or lower(recipient_email) = public.my_email()));

-- Favoris synchronisés entre appareils
create table if not exists public.customer_favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.customer_favorites enable row level security;
drop policy if exists "client gere ses favoris" on public.customer_favorites;
create policy "client gere ses favoris" on public.customer_favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Journal d'activité de l'espace vendeur (version 13) ----------
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  user_email  text,
  action      text not null check (char_length(action) <= 200),
  created_at  timestamptz not null default now()
);
alter table public.activity_log enable row level security;
drop policy if exists "admin journal" on public.activity_log;
create policy "admin journal" on public.activity_log
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists products_active_created_idx on public.products (active, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- =====================================================================
-- Version 14 : place de marché — d'autres artisans vendent leurs créations
-- =====================================================================

-- Profil public de la boutique de l'artisan (visible par tous une fois validé)
create table if not exists public.sellers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users(id) on delete set null,
  shop_name       text not null check (char_length(shop_name) between 2 and 60),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  craft           text not null default '' check (char_length(craft) <= 80),
  bio             text not null default '' check (char_length(bio) <= 2000),
  city            text not null default '' check (char_length(city) <= 80),
  country         text not null default 'FR',
  legal_status    text not null default 'professionnel' check (legal_status in ('particulier', 'professionnel')),
  siret           text check (char_length(siret) <= 20),
  avatar_url      text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  commission_percent numeric(5,2) check (commission_percent is null or commission_percent between 0 and 60),
  payouts_enabled boolean not null default false,
  shipping_france_cents  integer not null default 900 check (shipping_france_cents >= 0),
  shipping_europe_cents  integer check (shipping_europe_cents is null or shipping_europe_cents >= 0),
  free_shipping_from_cents integer check (free_shipping_from_cents is null or free_shipping_from_cents >= 0),
  prep_days       integer not null default 3 check (prep_days between 0 and 60),
  return_policy   text not null default '' check (char_length(return_policy) <= 1000),
  created_at      timestamptz not null default now()
);

-- Informations privées de l'artisan (vendeur et administrateur uniquement)
create table if not exists public.seller_private (
  seller_id          uuid primary key references public.sellers(id) on delete cascade,
  email              text not null,
  phone              text,
  application_message text,
  stripe_account_id  text,
  rejection_reason   text
);

create or replace function public.my_seller_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.sellers where user_id = auth.uid() and status = 'approved' limit 1;
$$;

alter table public.sellers enable row level security;
alter table public.seller_private enable row level security;

drop policy if exists "artisans visibles" on public.sellers;
create policy "artisans visibles" on public.sellers
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "candidature artisan" on public.sellers;
create policy "candidature artisan" on public.sellers
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and commission_percent is null and payouts_enabled = false);
drop policy if exists "artisan modifie sa boutique" on public.sellers;
create policy "artisan modifie sa boutique" on public.sellers
  for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "artisan infos privees" on public.seller_private;
create policy "artisan infos privees" on public.seller_private
  for select to authenticated using (public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = auth.uid()));
drop policy if exists "artisan cree infos privees" on public.seller_private;
create policy "artisan cree infos privees" on public.seller_private
  for insert to authenticated with check (stripe_account_id is null and exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = auth.uid()));
drop policy if exists "artisan modifie infos privees" on public.seller_private;
create policy "artisan modifie infos privees" on public.seller_private
  for update to authenticated using (public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = auth.uid()));

-- Un artisan ne peut pas modifier lui-même son statut, sa commission ni ses paiements
create or replace function public.protect_seller_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    new.status := old.status;
    new.commission_percent := old.commission_percent;
    new.payouts_enabled := old.payouts_enabled;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
drop trigger if exists protect_seller_fields on public.sellers;
create trigger protect_seller_fields before update on public.sellers for each row execute function public.protect_seller_fields();

create or replace function public.protect_seller_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    new.stripe_account_id := old.stripe_account_id;
    new.rejection_reason := old.rejection_reason;
  end if;
  return new;
end $$;
drop trigger if exists protect_seller_private on public.seller_private;
create trigger protect_seller_private before update on public.seller_private for each row execute function public.protect_seller_private();

-- Produits des artisans : relus par la boutique avant publication
alter table public.products add column if not exists seller_id uuid references public.sellers(id) on delete cascade;
alter table public.products add column if not exists moderation text not null default 'approved' check (moderation in ('approved', 'pending', 'rejected'));
alter table public.products add column if not exists moderation_note text;
create index if not exists products_seller_idx on public.products (seller_id);

drop policy if exists "produits visibles" on public.products;
create policy "produits visibles" on public.products
  for select using (
    (active and moderation = 'approved' and (publish_at is null or publish_at <= now())
      and (seller_id is null or exists (select 1 from public.sellers s where s.id = seller_id and s.status = 'approved')))
    or public.is_admin()
    or (seller_id is not null and seller_id = public.my_seller_id()));

drop policy if exists "artisan gere ses produits" on public.products;
create policy "artisan gere ses produits" on public.products
  for all to authenticated
  using (seller_id is not null and seller_id = public.my_seller_id())
  with check (seller_id is not null and seller_id = public.my_seller_id());

-- Toute modification du contenu par un artisan repasse le produit en relecture
create or replace function public.moderate_seller_product()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.seller_id is not null and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    new.featured := false;
    new.sales_count := coalesce(old.sales_count, 0);
    if tg_op = 'INSERT' or new.name is distinct from old.name or new.description is distinct from old.description
       or new.images is distinct from old.images or new.price_cents is distinct from old.price_cents
       or to_jsonb(new) ->> 'ingredients' is distinct from to_jsonb(old) ->> 'ingredients' then
      new.moderation := 'pending';
      new.moderation_note := null;
    else
      new.moderation := old.moderation;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists moderate_seller_product on public.products;
create trigger moderate_seller_product before insert or update on public.products for each row execute function public.moderate_seller_product();

-- Photos des artisans : dans leur propre dossier artisans/<id>/
drop policy if exists "artisan envoie photos" on storage.objects;
create policy "artisan envoie photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = 'artisans'
    and (storage.foldername(name))[2] = public.my_seller_id()::text);

-- Lignes de commande : qui a vendu quoi
alter table public.order_items add column if not exists seller_id uuid references public.sellers(id) on delete set null;

-- Expéditions faites par les artisans
create table if not exists public.seller_shipments (
  order_id        uuid not null references public.orders(id) on delete cascade,
  seller_id       uuid not null references public.sellers(id) on delete cascade,
  shipping_cents  integer not null default 0,
  status          text not null default 'to_ship' check (status in ('to_ship', 'shipped', 'delivered')),
  carrier         text,
  tracking_number text,
  shipped_at      timestamptz,
  primary key (order_id, seller_id)
);
alter table public.seller_shipments enable row level security;
drop policy if exists "expeditions visibles" on public.seller_shipments;
create policy "expeditions visibles" on public.seller_shipments
  for select to authenticated using (
    public.is_admin() or seller_id = public.my_seller_id()
    or exists (select 1 from public.orders o where o.id = order_id and public.my_email() <> '' and lower(o.email) = public.my_email()));

-- Reversements aux artisans (créés par le serveur après paiement)
create table if not exists public.seller_transfers (
  id                 bigint generated always as identity primary key,
  order_id           uuid not null references public.orders(id) on delete cascade,
  seller_id          uuid not null references public.sellers(id) on delete cascade,
  sales_cents        integer not null,
  shipping_cents     integer not null default 0,
  commission_cents   integer not null,
  amount_cents       integer not null,
  stripe_transfer_id text,
  created_at         timestamptz not null default now()
);
alter table public.seller_transfers enable row level security;
drop policy if exists "reversements visibles" on public.seller_transfers;
create policy "reversements visibles" on public.seller_transfers
  for select to authenticated using (public.is_admin() or seller_id = public.my_seller_id());

-- Commandes à expédier par l'artisan : uniquement ce dont il a besoin (adresse et ses articles)
create or replace function public.seller_orders()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb) from (
    select o.id, o.created_at, o.shipping_name, o.shipping_address, o.phone, o.customer_message, o.status as order_status,
           sh.status, sh.carrier, sh.tracking_number, sh.shipped_at, sh.shipping_cents,
           (select jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents))
              from public.order_items i where i.order_id = o.id and i.seller_id = sh.seller_id) as items
      from public.seller_shipments sh join public.orders o on o.id = sh.order_id
     where sh.seller_id = public.my_seller_id()
  ) t;
$$;
grant execute on function public.seller_orders() to authenticated;

create or replace function public.seller_mark_shipped(p_order_id uuid, p_carrier text, p_tracking text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.seller_shipments
     set status = 'shipped', carrier = left(p_carrier, 40), tracking_number = left(p_tracking, 60), shipped_at = now()
   where order_id = p_order_id and seller_id = public.my_seller_id();
  if not found then raise exception 'Commande introuvable'; end if;
end $$;
grant execute on function public.seller_mark_shipped(uuid, text, text) to authenticated;

-- =====================================================================
-- Version 15 : bijoux et cosmétiques traditionnels
-- =====================================================================
alter table public.products add column if not exists metal        text not null default '' check (char_length(metal) <= 120);
alter table public.products add column if not exists stones       text not null default '' check (char_length(stones) <= 200);
alter table public.products add column if not exists jewelry_size text not null default '' check (char_length(jewelry_size) <= 120);
alter table public.products add column if not exists nickel_free  boolean not null default false;
alter table public.products add column if not exists net_content  text not null default '' check (char_length(net_content) <= 40);
alter table public.products add column if not exists ingredients  text not null default '' check (char_length(ingredients) <= 3000);
alter table public.products add column if not exists usage        text not null default '' check (char_length(usage) <= 1500);
alter table public.products add column if not exists warnings     text not null default '' check (char_length(warnings) <= 1500);
alter table public.products add column if not exists pao_months   integer check (pao_months is null or pao_months between 1 and 60);
alter table public.products add column if not exists cpnp_ref     text not null default '' check (char_length(cpnp_ref) <= 40);

-- =====================================================================
-- Version 16 : demandes de catalogue papier
-- =====================================================================
create table if not exists public.catalog_requests (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) between 2 and 100),
  email        text not null check (char_length(email) <= 200),
  line1        text not null check (char_length(line1) between 3 and 200),
  line2        text not null default '' check (char_length(line2) <= 200),
  postal_code  text not null check (char_length(postal_code) between 3 and 12),
  city         text not null check (char_length(city) between 2 and 100),
  country      text not null default 'FR' check (char_length(country) = 2),
  newsletter   boolean not null default false,
  status       text not null default 'new' check (status in ('new', 'sent')),
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.catalog_requests enable row level security;
drop policy if exists "visiteur demande catalogue" on public.catalog_requests;
create policy "visiteur demande catalogue" on public.catalog_requests
  for insert to anon, authenticated with check (status = 'new' and sent_at is null);
drop policy if exists "admin gere catalogues" on public.catalog_requests;
create policy "admin gere catalogues" on public.catalog_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Version 17 : colonnes « boutique » (seule la boutique France 'fr' est utilisée depuis la version 19)
-- =====================================================================

-- Chaque produit et chaque commande appartiennent à une boutique : 'fr' (euros) ou 'dz' (dinars)
alter table public.products add column if not exists market text not null default 'fr' check (market in ('fr', 'dz'));
alter table public.orders   add column if not exists market text not null default 'fr' check (market in ('fr', 'dz'));
alter table public.orders   add column if not exists payment_method text not null default 'card' check (payment_method in ('card', 'cod'));
alter table public.orders   add column if not exists wilaya text;
alter table public.orders   add column if not exists delivery_type text check (delivery_type is null or delivery_type in ('domicile', 'bureau'));
create index if not exists products_market_idx on public.products (market);
create index if not exists orders_market_idx on public.orders (market, created_at desc);

-- Nouveau statut : commande Algérie à confirmer par téléphone avant préparation
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('to_confirm','paid','check_stock','shipped','delivered','cancelled','refunded'));

-- Gestionnaires par boutique : market vide = accès complet ; 'dz' = commandes et produits Algérie uniquement
alter table public.admins add column if not exists market text check (market is null or market in ('fr', 'dz'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and market is null)
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
     );
$$;

drop policy if exists "chacun lit son acces" on public.admins;
create policy "chacun lit son acces" on public.admins for select to authenticated using (user_id = auth.uid());

-- =====================================================================
-- Version 18 : paiement fiable
--   • commandes créées en une seule transaction (commande + lignes + stock + facture)
--   • traitement idempotent des événements Stripe (aucun doublon, reprise après échec)
--   • réservation temporaire du stock pendant le paiement (pièces uniques)
--   • historique des remboursements, sans double remboursement, synchronisé avec Stripe
-- =====================================================================

alter table public.orders add column if not exists shipping_method_id text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists confirmation_email_sent_at timestamptz;
alter table public.orders add column if not exists owner_notified_at timestamptz;

-- ---------- Journal des événements Stripe (idempotence + diagnostic) ----------
create table if not exists public.stripe_events (
  id            text primary key,                  -- evt_…
  type          text not null,
  object_id     text,                              -- cs_…, re_…, ch_…
  status        text not null default 'processing' check (status in ('processing', 'done', 'failed', 'ignored')),
  attempts      integer not null default 1,
  last_error    text,                              -- message technique, jamais de données personnelles
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);
alter table public.stripe_events enable row level security;
drop policy if exists "admin lit evenements stripe" on public.stripe_events;
create policy "admin lit evenements stripe" on public.stripe_events for select to authenticated using (public.is_admin());

/** Enregistre la réception d'un événement. Renvoie 'new', 'retry' (déjà reçu, pas terminé) ou 'done' (déjà traité). */
create or replace function public.stripe_event_begin(p_id text, p_type text, p_object_id text)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  insert into public.stripe_events (id, type, object_id) values (p_id, p_type, p_object_id)
  on conflict (id) do nothing;
  if found then return 'new'; end if;
  select status into v_status from public.stripe_events where id = p_id for update;
  if v_status in ('done', 'ignored') then return 'done'; end if;
  update public.stripe_events set attempts = attempts + 1, status = 'processing' where id = p_id;
  return 'retry';
end $$;

create or replace function public.stripe_event_finish(p_id text, p_status text, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update public.stripe_events
     set status = p_status, last_error = left(p_error, 500), processed_at = case when p_status in ('done', 'ignored') then now() else processed_at end
   where id = p_id;
$$;

-- ---------- Réservation temporaire du stock ----------
create table if not exists public.stock_reservations (
  id                 bigint generated always as identity primary key,
  checkout_ref       uuid not null,                -- créé avant la session Stripe, puis relié à elle
  stripe_session_id  text,
  product_id         uuid not null references public.products(id) on delete cascade,
  quantity           integer not null check (quantity > 0),
  status             text not null default 'active' check (status in ('active', 'converted', 'released')),
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now()
);
create index if not exists stock_reservations_active_idx on public.stock_reservations (product_id) where status = 'active';
create index if not exists stock_reservations_session_idx on public.stock_reservations (stripe_session_id);
create index if not exists stock_reservations_ref_idx on public.stock_reservations (checkout_ref);
alter table public.stock_reservations enable row level security;
drop policy if exists "admin lit reservations" on public.stock_reservations;
create policy "admin lit reservations" on public.stock_reservations for select to authenticated using (public.is_admin());

/** Quantité réellement disponible : stock moins les réservations en cours (non expirées). */
create or replace function public.available_stock(p_product_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(0, p.stock - coalesce((
    select sum(r.quantity) from public.stock_reservations r
     where r.product_id = p.id and r.status = 'active' and r.expires_at > now()), 0))::integer
    from public.products p where p.id = p_product_id;
$$;
grant execute on function public.available_stock(uuid) to anon, authenticated;

/**
 * Réserve le stock d'un panier, tout ou rien. Les lignes produits sont verrouillées (FOR UPDATE)
 * dans l'ordre des identifiants : deux clients ne peuvent pas réserver la même pièce unique, sans interblocage.
 * Erreur 'STOCK:<id produit>:<disponible>' si une quantité n'est plus disponible.
 */
create or replace function public.reserve_stock(p_ref uuid, p_items jsonb, p_minutes integer default 35)
returns void language plpgsql security definer set search_path = public as $$
declare
  it record;
  v_stock integer;
  v_reserved integer;
begin
  for it in
    select (x ->> 'product_id')::uuid as product_id, sum((x ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) x group by 1 order by 1
  loop
    select stock into v_stock from public.products where id = it.product_id for update;
    if v_stock is null then raise exception 'STOCK:%:0', it.product_id; end if;
    select coalesce(sum(quantity), 0) into v_reserved from public.stock_reservations
     where product_id = it.product_id and status = 'active' and expires_at > now() and checkout_ref <> p_ref;
    if v_stock - v_reserved < it.quantity then
      raise exception 'STOCK:%:%', it.product_id, greatest(v_stock - v_reserved, 0);
    end if;
    insert into public.stock_reservations (checkout_ref, product_id, quantity, expires_at)
    values (p_ref, it.product_id, it.quantity, now() + make_interval(mins => p_minutes));
  end loop;
end $$;

/** Relie les réservations à la session Stripe et fixe leur échéance (prolongée pour un paiement différé). */
create or replace function public.attach_reservation(p_ref uuid, p_session_id text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public as $$
  update public.stock_reservations set stripe_session_id = p_session_id, expires_at = p_expires_at
   where checkout_ref = p_ref and status = 'active';
$$;

create or replace function public.extend_reservation(p_session_id text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public as $$
  update public.stock_reservations set expires_at = greatest(expires_at, p_expires_at)
   where stripe_session_id = p_session_id and status = 'active';
$$;

/** Libère le stock réservé (paiement échoué, expiré ou session non créée). Sans effet sur une commande payée. */
create or replace function public.release_reservation(p_ref uuid default null, p_session_id text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.stock_reservations set status = 'released'
   where status = 'active'
     and ((p_ref is not null and checkout_ref = p_ref) or (p_session_id is not null and stripe_session_id = p_session_id));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------- Numérotation continue des factures (sans trou) ----------
create table if not exists public.invoice_counter (
  id          integer primary key default 1 check (id = 1),
  last_value  bigint not null default 0
);
insert into public.invoice_counter (id, last_value)
select 1, coalesce((select max(invoice_number) from public.orders), 0)
on conflict (id) do nothing;
alter table public.invoice_counter enable row level security;

/** Attribue le numéro de facture suivant ; annulé avec la transaction en cas d'échec, donc jamais de trou. */
create or replace function public.assign_invoice_number(p_order_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_number bigint;
begin
  update public.invoice_counter set last_value = last_value + 1 where id = 1 returning last_value into v_number;
  update public.orders set invoice_number = v_number where id = p_order_id;
  return v_number;
end $$;

/**
 * Crée la commande payée, ses lignes, la baisse de stock et le numéro de facture, EN UNE SEULE TRANSACTION.
 * Idempotente : rappelée pour la même session Stripe, elle ne crée rien et renvoie la commande existante.
 * Renvoie { order_id, created, stock_problem, sold_out: [noms des produits passés à 0] }.
 */
create or replace function public.create_order_from_checkout(p_order jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_session text := p_order ->> 'stripe_session_id';
  it record;
  v_stock integer;
  v_problem boolean := false;
  v_sold_out text[] := '{}';
begin
  if v_session is null or v_session = '' then raise exception 'SESSION_MANQUANTE'; end if;

  insert into public.orders (
    stripe_session_id, stripe_payment_id, email, customer_name, phone, shipping_name, shipping_address,
    subtotal_cents, shipping_cents, discount_cents, total_cents, shipping_method, shipping_method_id,
    promo_code, customer_message, status, paid_at, market, payment_method)
  values (
    v_session, p_order ->> 'stripe_payment_id', p_order ->> 'email', p_order ->> 'customer_name', p_order ->> 'phone',
    p_order ->> 'shipping_name', p_order -> 'shipping_address',
    coalesce((p_order ->> 'subtotal_cents')::integer, 0), coalesce((p_order ->> 'shipping_cents')::integer, 0),
    coalesce((p_order ->> 'discount_cents')::integer, 0), coalesce((p_order ->> 'total_cents')::integer, 0),
    p_order ->> 'shipping_method', p_order ->> 'shipping_method_id', p_order ->> 'promo_code', p_order ->> 'customer_message',
    'paid', now(), 'fr', 'card')
  on conflict (stripe_session_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.orders where stripe_session_id = v_session;
    return jsonb_build_object('order_id', v_id, 'created', false, 'stock_problem', false, 'sold_out', '[]'::jsonb);
  end if;

  insert into public.order_items (order_id, product_id, seller_id, name, unit_price_cents, quantity)
  -- Un produit ou un artisan supprimé entre-temps ne doit pas bloquer l'enregistrement du paiement
  select v_id, (select p.id from public.products p where p.id = (x ->> 'product_id')::uuid),
         (select s.id from public.sellers s where s.id = (x ->> 'seller_id')::uuid), x ->> 'name',
         (x ->> 'unit_price_cents')::integer, (x ->> 'quantity')::integer
    from jsonb_array_elements(p_items) x;

  -- Stock : la réservation de cette session est convertie en vente (verrou de ligne, ordre fixe)
  for it in
    select (x ->> 'product_id')::uuid as product_id, sum((x ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) x where x ->> 'product_id' is not null group by 1 order by 1
  loop
    select stock into v_stock from public.products where id = it.product_id for update;
    if v_stock is null then continue; end if;          -- produit supprimé entre-temps
    if v_stock < it.quantity then v_problem := true; end if;
    update public.products set stock = greatest(stock - it.quantity, 0), sales_count = sales_count + it.quantity, updated_at = now()
     where id = it.product_id
    returning stock into v_stock;
    if v_stock = 0 then v_sold_out := v_sold_out || (select name from public.products where id = it.product_id); end if;
  end loop;
  update public.stock_reservations set status = 'converted' where stripe_session_id = v_session and status = 'active';

  perform public.assign_invoice_number(v_id);
  if v_problem then
    update public.orders set status = 'check_stock',
      note = 'Stock insuffisant au moment du paiement : contactez le client (échange ou remboursement).'
     where id = v_id;
  end if;
  return jsonb_build_object('order_id', v_id, 'created', true, 'stock_problem', v_problem, 'sold_out', to_jsonb(v_sold_out));
end $$;

/** Réserve une action unique sur une commande (email de confirmation, alerte vendeur…). Renvoie true une seule fois. */
create or replace function public.claim_order_action(p_order_id uuid, p_action text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if p_action = 'confirmation' then
    update public.orders set confirmation_email_sent_at = now() where id = p_order_id and confirmation_email_sent_at is null returning true into v_ok;
  elsif p_action = 'owner' then
    update public.orders set owner_notified_at = now() where id = p_order_id and owner_notified_at is null returning true into v_ok;
  else
    raise exception 'ACTION_INCONNUE';
  end if;
  return coalesce(v_ok, false);
end $$;

/** Annule une réservation d'action quand l'envoi a échoué : elle sera retentée au prochain essai de Stripe. */
create or replace function public.unclaim_order_action(p_order_id uuid, p_action text)
returns void language sql security definer set search_path = public as $$
  update public.orders set
    confirmation_email_sent_at = case when p_action = 'confirmation' then null else confirmation_email_sent_at end,
    owner_notified_at = case when p_action = 'owner' then null else owner_notified_at end
   where id = p_order_id;
$$;

-- ---------- Remboursements : historique, anti-doublon, synchronisation Stripe ----------
create table if not exists public.refunds (
  id                bigint generated always as identity primary key,
  order_id          uuid not null references public.orders(id) on delete cascade,
  return_id         bigint references public.returns(id) on delete set null,
  amount_cents      integer not null check (amount_cents > 0),
  shipping_cents    integer not null default 0 check (shipping_cents >= 0),  -- part correspondant aux frais de livraison
  reason            text,
  restock           boolean not null default false,
  restock_items     jsonb,                          -- [{product_id, quantity}] à remettre en stock (null = toute la commande)
  restocked_at      timestamptz,
  status            text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  source            text not null default 'admin' check (source in ('admin', 'stripe')),
  stripe_refund_id  text unique,
  error             text,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists refunds_order_idx on public.refunds (order_id);
alter table public.refunds enable row level security;
drop policy if exists "admin lit remboursements" on public.refunds;
create policy "admin lit remboursements" on public.refunds for select to authenticated using (public.is_admin());

/** Recalcule le montant remboursé et le statut de la commande à partir de l'historique. */
create or replace function public.refresh_order_refunds(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_total integer; v_refunded integer;
begin
  select total_cents into v_total from public.orders where id = p_order_id;
  select coalesce(sum(amount_cents), 0) into v_refunded from public.refunds where order_id = p_order_id and status = 'succeeded';
  update public.orders set refunded_cents = v_refunded,
    status = case when v_refunded >= v_total and v_total > 0 then 'refunded'
                  when status = 'refunded' and v_refunded < v_total then 'delivered' else status end
   where id = p_order_id;
end $$;

/**
 * Ouvre un remboursement (statut « en cours ») après avoir verrouillé la commande :
 * deux clics ou deux administrateurs ne peuvent pas dépasser le montant payé.
 */
create or replace function public.begin_refund(p_order_id uuid, p_amount integer, p_shipping integer, p_reason text,
  p_restock boolean, p_restock_items jsonb, p_return_id bigint, p_by text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_total integer; v_engaged integer; v_id bigint;
begin
  select total_cents into v_total from public.orders where id = p_order_id for update;
  if v_total is null then raise exception 'COMMANDE_INTROUVABLE'; end if;
  select coalesce(sum(amount_cents), 0) into v_engaged from public.refunds where order_id = p_order_id and status in ('pending', 'succeeded');
  if p_amount <= 0 or p_amount > v_total - v_engaged then
    raise exception 'MONTANT_INVALIDE:%', greatest(v_total - v_engaged, 0);
  end if;
  if p_shipping < 0 or p_shipping > p_amount then raise exception 'FRAIS_INVALIDES'; end if;
  if p_return_id is not null and exists (select 1 from public.refunds where return_id = p_return_id and status in ('pending', 'succeeded')) then
    raise exception 'RETOUR_DEJA_REMBOURSE';
  end if;
  insert into public.refunds (order_id, return_id, amount_cents, shipping_cents, reason, restock, restock_items, created_by)
  values (p_order_id, p_return_id, p_amount, coalesce(p_shipping, 0), left(p_reason, 300), coalesce(p_restock, false), p_restock_items, left(p_by, 200))
  returning id into v_id;
  return v_id;
end $$;

/** Termine un remboursement : statut Stripe, remise en stock (une seule fois), montant de la commande recalculé. */
create or replace function public.finish_refund(p_refund_id bigint, p_status text, p_stripe_refund_id text, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r record; it record;
begin
  update public.refunds set status = p_status, stripe_refund_id = coalesce(p_stripe_refund_id, stripe_refund_id),
         error = left(p_error, 500), updated_at = now()
   where id = p_refund_id returning * into r;
  if r.id is null then raise exception 'REMBOURSEMENT_INTROUVABLE'; end if;

  if r.status = 'succeeded' and r.restock and r.restocked_at is null then
    for it in
      select (x ->> 'product_id')::uuid as product_id, (x ->> 'quantity')::integer as quantity
        from jsonb_array_elements(coalesce(r.restock_items,
          (select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity)) from public.order_items where order_id = r.order_id))) x
       where x ->> 'product_id' is not null
    loop
      update public.products set stock = stock + it.quantity, updated_at = now() where id = it.product_id;
    end loop;
    update public.refunds set restocked_at = now() where id = r.id;
  end if;
  if r.return_id is not null and r.status = 'succeeded' then
    update public.returns set status = 'refunded' where id = r.return_id;
  end if;
  perform public.refresh_order_refunds(r.order_id);
end $$;

/**
 * Synchronise un remboursement vu par Stripe (webhook) : met à jour celui lancé depuis l'espace vendeur,
 * ou enregistre celui fait directement dans le tableau de bord Stripe. Rejouable sans effet de bord.
 */
create or replace function public.sync_stripe_refund(p_stripe_refund_id text, p_payment_intent text, p_amount integer, p_status text, p_refund_id bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_id bigint; v_status text;
begin
  v_status := case p_status when 'succeeded' then 'succeeded' when 'failed' then 'failed' when 'canceled' then 'canceled' else 'pending' end;
  select id into v_id from public.refunds where stripe_refund_id = p_stripe_refund_id;
  if v_id is null and p_refund_id is not null then
    select id into v_id from public.refunds where id = p_refund_id;
  end if;
  if v_id is not null then
    perform public.finish_refund(v_id, v_status, p_stripe_refund_id);
    return;
  end if;
  select id into v_order from public.orders where stripe_payment_id = p_payment_intent;
  if v_order is null then return; end if;                   -- paiement inconnu (carte cadeau, autre site)
  insert into public.refunds (order_id, amount_cents, status, source, stripe_refund_id, reason)
  values (v_order, p_amount, v_status, 'stripe', p_stripe_refund_id, 'Remboursement fait depuis le tableau de bord Stripe')
  on conflict (stripe_refund_id) do nothing;
  perform public.refresh_order_refunds(v_order);
end $$;

-- ---------- Cartes cadeaux : enregistrement idempotent ----------
create or replace function public.record_gift_card(p_card jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.gift_cards (code, amount_cents, stripe_session_id, promotion_code_id, expires_at, buyer_name, buyer_email, recipient_name, recipient_email, message)
  values (p_card ->> 'code', (p_card ->> 'amount_cents')::integer, p_card ->> 'stripe_session_id', p_card ->> 'promotion_code_id',
          (p_card ->> 'expires_at')::timestamptz, p_card ->> 'buyer_name', p_card ->> 'buyer_email', p_card ->> 'recipient_name',
          p_card ->> 'recipient_email', p_card ->> 'message')
  on conflict (stripe_session_id) do nothing;
  return found;
end $$;

-- Historique : les remboursements faits avant cette version sont repris (sinon le total remboursé serait remis à zéro)
insert into public.refunds (order_id, amount_cents, status, source, reason, restocked_at, created_at)
select o.id, o.refunded_cents, 'succeeded', 'admin', 'Remboursement antérieur (repris de l’ancienne version)', now(), now()
  from public.orders o
 where coalesce(o.refunded_cents, 0) > 0 and not exists (select 1 from public.refunds r where r.order_id = o.id);

-- Un retour ne peut être remboursé qu'une fois
create unique index if not exists refunds_un_par_retour on public.refunds(return_id)
  where return_id is not null and status in ('pending', 'succeeded');

-- Email de carte cadeau envoyé une seule fois
alter table public.gift_cards add column if not exists email_sent_at timestamptz;
create or replace function public.claim_gift_card_email(p_session_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.gift_cards set email_sent_at = now() where stripe_session_id = p_session_id and email_sent_at is null;
  return found;
end $$;
create or replace function public.unclaim_gift_card_email(p_session_id text)
returns void language sql security definer set search_path = public as $$
  update public.gift_cards set email_sent_at = null where stripe_session_id = p_session_id;
$$;

-- Un seul reversement par artisan et par commande (anciens doublons éventuels conservés : on dédoublonne avant)
delete from public.seller_transfers a using public.seller_transfers b
  where a.order_id = b.order_id and a.seller_id = b.seller_id and a.id > b.id and a.stripe_transfer_id is null;
create unique index if not exists seller_transfers_unique on public.seller_transfers(order_id, seller_id);

-- Les fonctions de paiement ne sont appelables que par le serveur (clé de service)
do $$
declare f text;
begin
  foreach f in array array[
    'stripe_event_begin(text,text,text)', 'stripe_event_finish(text,text,text)',
    'reserve_stock(uuid,jsonb,integer)', 'attach_reservation(uuid,text,timestamptz)', 'extend_reservation(text,timestamptz)',
    'release_reservation(uuid,text)', 'assign_invoice_number(uuid)', 'create_order_from_checkout(jsonb,jsonb)',
    'claim_order_action(uuid,text)', 'unclaim_order_action(uuid,text)', 'refresh_order_refunds(uuid)',
    'begin_refund(uuid,integer,integer,text,boolean,jsonb,bigint,text)', 'finish_refund(bigint,text,text,text)',
    'sync_stripe_refund(text,text,integer,text,bigint)', 'record_gift_card(jsonb)', 'claim_gift_card_email(text)', 'unclaim_gift_card_email(text)']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- =====================================================================
-- Version 19 : boutique France uniquement
-- La boutique Algérie est retirée du site. Aucune donnée n'est supprimée :
-- les anciens produits et commandes « dz » restent en base mais ne sont plus affichés,
-- et les anciens accès limités à l'Algérie n'ouvrent plus rien.
-- =====================================================================
drop policy if exists "gestionnaire boutique produits" on public.products;
drop policy if exists "gestionnaire boutique commandes" on public.orders;
drop policy if exists "gestionnaire boutique met a jour" on public.orders;
drop policy if exists "gestionnaire boutique lignes" on public.order_items;
drop policy if exists "gestionnaire algerie photos" on storage.objects;
do $$ begin
  if to_regclass('public.dz_shipping_rates') is not null then
    execute 'drop policy if exists "gestionnaire algerie tarifs" on public.dz_shipping_rates';
    execute 'drop policy if exists "tarifs algerie publics" on public.dz_shipping_rates';
  end if;
end $$;
drop function if exists public.is_market_admin(text);

-- =====================================================================
-- Version 20 : emails clients d'annulation et de remboursement
-- Une date par envoi : un email n'est envoyé qu'une fois, même après plusieurs clics.
-- =====================================================================
alter table public.orders  add column if not exists cancelled_email_sent_at timestamptz;
alter table public.refunds add column if not exists email_sent_at timestamptz;
-- Pièce fabriquée selon les choix d'un client : exclue du droit de rétractation (article L221-28, 3° du Code de la consommation)
alter table public.products add column if not exists personalized boolean not null default false;
