import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminMessage } from './AdminLayout';
import { Field, Input } from './ui';

export function AdminNewPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!supabase) return <AdminMessage title="Espace vendeur pas encore branché" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError('Choisissez au moins 10 caractères.');
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) return setError('Le lien a expiré. Redemandez un email depuis la page de connexion.');
    navigate('/admin', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-5">
      <form onSubmit={submit} className="bg-white p-8 rounded-md shadow-sm w-full max-w-sm space-y-5">
        <h1 className="font-display text-2xl text-nuit">Nouveau mot de passe</h1>
        <Field label="Mot de passe" hint="Au moins 10 caractères" error={error ?? undefined}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="w-full bg-nuit text-laine py-3.5 rounded-md text-lg hover:bg-garance">Enregistrer le mot de passe</button>
      </form>
    </div>
  );
}
