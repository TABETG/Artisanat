// Vérifie que schema.sql s’installe (deux fois de suite) et que les règles de sécurité tiennent.
// Lancement : docker run --rm -v "$PWD/supabase":/work -w /work/tests node:20-alpine sh -c "npm install --silent && npm test"
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
await db.exec(fs.readFileSync('environnement-supabase.sql', 'utf8'));
await db.exec(`grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  grant all on all sequences in schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  grant select on auth.mfa_factors to anon, authenticated; grant all on storage.objects to authenticated;`);
await db.exec(fs.readFileSync('../schema.sql', 'utf8'));
await db.exec(fs.readFileSync('../produits-exemple.sql', 'utf8'));
const ADMIN='11111111-1111-1111-1111-111111111111', CLIENT='22222222-2222-2222-2222-222222222222', ARTISAN='33333333-3333-3333-3333-333333333333';
await db.exec(`insert into auth.users(id,email) values ('${ADMIN}','admin@x.fr'),('${CLIENT}','client@x.fr'),('${ARTISAN}','art@x.fr');
  insert into public.admins values ('${ADMIN}');
  insert into public.orders(stripe_session_id,email,total_cents) values ('cs_1','client@x.fr',1000),('cs_2','autre@x.fr',2000);`);
let ok=0, ko=0;
async function as(role, uid, email, sql, expect, label) {
  let res, err;
  try {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false), set_config('request.jwt.claims', '${JSON.stringify({ email, aal: 'aal1' })}', false), set_config('request.jwt.claim.role', '${role}', false); set role ${role};`);
    res = await db.query(sql);
  } catch (e) { err = e.message; }
  await db.exec('reset role;');
  const got = err ? 'refus' : (res.rows[0] ? Object.values(res.rows[0])[0] : (res.affectedRows ?? 0));
  const pass = String(got) === String(expect);
  pass ? ok++ : ko++;
  console.log(pass ? '✔' : '✘', label, '→', err ? `refusé (${err.slice(0,60)})` : got, pass ? '' : `(attendu ${expect})`);
}
await as('anon', null, '', "select count(*) from products", 8, 'visiteur voit les 8 produits en ligne');
await as('anon', null, '', "insert into products(name,price_cents) values ('pirate',1)", 'refus', 'visiteur ne peut pas créer de produit');
await as('anon', null, '', "select count(*) from orders", 0, 'visiteur ne voit aucune commande');
await as('anon', null, '', "select email from reviews", 'refus', 'email des avis illisible');
await as('anon', null, '', "update products set price_cents=1", 0, 'visiteur ne peut pas changer un prix');
await as('authenticated', CLIENT, 'client@x.fr', "select count(*) from orders", 1, 'client voit uniquement SA commande');
await as('authenticated', CLIENT, 'client@x.fr', "select count(*) from admins", 0, 'client ne voit pas la liste des admins');
await as('authenticated', CLIENT, 'client@x.fr', `insert into admins values ('${CLIENT}')`, 'refus', 'client ne peut pas se nommer admin');
await as('authenticated', ADMIN, 'admin@x.fr', "select count(*) from orders", 2, 'admin voit toutes les commandes');
await as('authenticated', ADMIN, 'admin@x.fr', "update products set price_cents=price_cents where true", 8, 'admin peut modifier les produits');
await as('authenticated', ARTISAN, 'art@x.fr', "insert into sellers(user_id,shop_name,slug,status) values ('"+ARTISAN+"','Atelier','atelier-x','approved')", 'refus', 'artisan ne peut pas s’auto-valider');
await as('authenticated', ARTISAN, 'art@x.fr', "insert into sellers(user_id,shop_name,slug) values ('"+ARTISAN+"','Atelier','atelier-x') returning status", 'pending', 'candidature artisan acceptée en attente');
await as('authenticated', ADMIN, 'admin@x.fr', "update sellers set status='approved' returning status", 'approved', 'la boutique valide l’artisan');
await as('authenticated', ARTISAN, 'art@x.fr', "update sellers set status='suspended', commission_percent=0 returning coalesce(commission_percent::text,'defaut') || '/' || status", 'defaut/approved', 'artisan ne peut changer ni statut ni commission');
await as('authenticated', ARTISAN, 'art@x.fr', "insert into products(name,price_cents,seller_id,moderation) select 'Vase',5000,id,'approved' from sellers returning moderation", 'pending', 'produit artisan forcé en relecture');
await as('anon', null, '', "select count(*) from products where name='Vase'", 0, 'produit en relecture invisible au public');
await as('authenticated', ARTISAN, 'art@x.fr', "update products set price_cents=1 where seller_id is null", 0, 'artisan ne peut pas toucher aux produits de l’atelier');
await as('authenticated', CLIENT, 'client@x.fr', "select count(*) from seller_private", 0, 'infos privées des artisans protégées');
await as('anon', null, '', "select count(*) from settings", 1, 'réglages publics lisibles');
await as('anon', null, '', "update settings set data='{}'", 0, 'visiteur ne peut pas modifier les réglages');
await as('anon', null, '', "select public.decrement_stock((select id from products limit 1), 1)", 'refus', 'visiteur ne peut pas vider le stock');
console.log(`\n${ok} contrôles réussis, ${ko} échec(s)`);
if (ko) process.exit(1);
