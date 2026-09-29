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
alter table public.orders add constraint orders_status_check
  check (status in ('paid','check_stock','shipped','delivered','cancelled','refunded'));

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
