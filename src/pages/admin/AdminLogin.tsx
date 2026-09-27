import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEMO_MODE } from '../../lib/supabase';
import { requestPasswordReset, signIn } from '../../lib/api';
import { DEMO_ADMIN } from '../../lib/demo';
import { Field, Input } from './ui';
import { SHOP } from '../../config';

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_ADMIN.email : '');
  const [password, setPassword] = useState(DEMO_MODE ? DEMO_ADMIN.password : '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await signIn(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      setBusy(false);
    }
  }

  async function forgot() {
    if (DEMO_MODE) return setInfo(`En démonstration : ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
    if (!email.trim()) return setError('Saisissez d’abord votre email ci-dessus.');
    setError(null);
    await requestPasswordReset(email);
    setInfo('Si ce compte existe, un lien pour choisir un nouveau mot de passe vient d’être envoyé.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-5">
      <form onSubmit={submit} className="bg-white p-8 rounded-md shadow-sm w-full max-w-sm space-y-5">
        <div>
          <h1 className="font-display text-3xl text-nuit">Espace vendeur</h1>
          <p className="text-stone-500 mt-1">{SHOP.name}</p>
        </div>
        {DEMO_MODE && (
          <p className="bg-safran/20 text-encre text-sm p-3 rounded">
            Démonstration : identifiants préremplis ({DEMO_ADMIN.email} / {DEMO_ADMIN.password}). Cliquez sur « Se connecter ».
          </p>
        )}
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
