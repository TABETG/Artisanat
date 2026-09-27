import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEMO_MODE, supabase } from '../../lib/supabase';
import { AdminMessage } from './AdminLayout';
import { Field, Input } from './ui';
import { SHOP } from '../../config';

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (DEMO_MODE || !supabase) {
    return <AdminMessage title="Espace vendeur pas encore branché">Suivez le guide de mise en ligne (étape Supabase).</AdminMessage>;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError('Email ou mot de passe incorrect.');
    navigate('/admin', { replace: true });
  }

  async function forgot() {
    if (!email.trim()) return setError('Saisissez d’abord votre email ci-dessus.');
    setError(null);
    await supabase!.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/nouveau-mot-de-passe`,
    });
    setInfo('Si ce compte existe, un lien pour choisir un nouveau mot de passe vient d’être envoyé.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-5">
      <form onSubmit={submit} className="bg-white p-8 rounded-md shadow-sm w-full max-w-sm space-y-5">
        <div>
          <h1 className="font-display text-3xl text-nuit">Espace vendeur</h1>
          <p className="text-stone-500 mt-1">{SHOP.name}</p>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-garance text-sm" role="alert">{error}</p>}
        {info && <p className="text-emerald-700 text-sm" role="status">{info}</p>}
        <button disabled={busy} className="w-full bg-nuit text-laine py-3.5 rounded-md text-lg hover:bg-garance disabled:opacity-60">
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={forgot} className="text-garance underline">Mot de passe oublié</button>
          <Link to="/" className="text-stone-500 underline">Boutique</Link>
        </div>
      </form>
    </div>
  );
}
