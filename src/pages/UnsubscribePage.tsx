import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { unsubscribeNewsletter } from '../lib/api';

export function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('jeton') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  useEffect(() => { unsubscribeNewsletter(email, token).then(() => setState('done'), () => setState('error')); }, [email, token]);
  return (
    <div className="max-w-xl mx-auto px-5 pt-20 text-center">
      <h1 className="font-display text-4xl text-nuit">Lettre d’information</h1>
      <p className="mt-5 text-lg">
        {state === 'working' && 'Désinscription en cours…'}
        {state === 'done' && <>C’est fait : <strong>{email}</strong> ne recevra plus nos nouvelles. À bientôt peut-être !</>}
        {state === 'error' && 'Ce lien ne fonctionne pas. Écrivez-nous et nous vous désinscrirons immédiatement.'}
      </p>
      <Link to="/" className="inline-block mt-8 text-garance underline">Retour à la boutique</Link>
    </div>
  );
}
