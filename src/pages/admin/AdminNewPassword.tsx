import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_MODE } from '../../lib/supabase';
import { updatePassword } from '../../lib/api';
import { AdminMessage } from './AdminLayout';
import { Field, Input } from './ui';

export function AdminNewPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (DEMO_MODE) return <AdminMessage title="Indisponible en démonstration" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError('Choisissez au moins 10 caractères.');
    try {
      await updatePassword(password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
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
