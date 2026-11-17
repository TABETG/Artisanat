// Base PostgreSQL de test : une base neuve par fichier de test, avec le vrai schema.sql (installé deux fois).
// Adresse du serveur : variable TEST_DATABASE_URL (ex. postgres://postgres:test@localhost:5432/postgres).
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import type { Rpc } from '../../netlify/shared/stripe-processing';

const root = path.resolve(process.cwd());
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

export interface TestDb { pool: pg.Pool; rpc: Rpc; q: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>; close: () => Promise<void> }

export async function freshDatabase(name: string): Promise<TestDb> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL manquant');
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  await admin.end();

  const u = new URL(url);
  u.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: u.toString(), max: 12 });
  const setup = await pool.connect();
  try {
    // Les rôles Supabase existent au niveau du serveur : on ne les recrée pas s'ils sont déjà là
    const env = read('supabase/tests/environnement-supabase.sql').replace(
      'create role anon; create role authenticated; create role service_role;',
      () => `do $$ begin
         if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
         if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
         if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
       end $$;`);
    await setup.query(env);
    await setup.query(`grant usage on schema public, auth, storage to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`);
    const schema = read('supabase/schema.sql');
    await setup.query(schema);
    await setup.query(schema); // le schéma doit pouvoir être rejoué sans erreur (mises à jour)
  } finally { setup.release(); }

  const rpc: Rpc = async (fn, args) => {
    const keys = Object.keys(args);
    const values = keys.map((k) => { const v = args[k]; return v !== null && typeof v === 'object' ? JSON.stringify(v) : v; });
    const { rows } = await pool.query(`select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`, values);
    const r = rows[0]?.r;
    return (typeof r === 'string' && /^\d+$/.test(r) && fn === 'begin_refund' ? Number(r) : r) as never;
  };
  return {
    pool, rpc,
    q: async (sql, params) => (await pool.query(sql, params)).rows,
    close: () => pool.end(),
  };
}
