import { FormEvent, useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { disableMfa, getMfaState, MfaState, startMfaEnrollment, verifyMfaCode } from '../../lib/api';
import { DEMO_MODE } from '../../lib/supabase';
import { Field, Input, Section } from './ui';

/** Double authentification : même avec votre mot de passe, personne ne peut entrer sans votre téléphone. */
export function SecuritySection() {
  const [state, setState] = useState<MfaState | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getMfaState().then(setState).catch(() => setState({ enabled: false, factorId: null })); }, []);

  async function start() {
    setError(null); setBusy(true);
    try { setEnroll(await startMfaEnrollment()); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(false); }
  }
  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setError(null); setBusy(true);
    try {
      await verifyMfaCode(code, enroll.factorId);
      setEnroll(null); setCode('');
      setState(await getMfaState());
    } catch (err) { setError(err instanceof Error ? err.message : 'Code incorrect'); } finally { setBusy(false); }
  }
  async function disable() {
    if (!state?.factorId || !window.confirm('Désactiver la double authentification ? Votre compte sera protégé uniquement par le mot de passe.')) return;
    setError(null);
    try { await disableMfa(state.factorId); setState(await getMfaState()); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
  }

  return (
    <Section title="Sécurité du compte" description="Recommandé : avec la double authentification, un mot de passe volé ne suffit pas pour entrer dans l’espace vendeur.">
      {DEMO_MODE ? (
        <p className="text-stone-500">Disponible une fois la boutique branchée à Supabase.</p>
      ) : !state ? (
        <p className="text-stone-500">Chargement…</p>
      ) : state.enabled ? (
        <div className="flex flex-wrap items-center gap-4">
          <p className="flex items-center gap-2 text-emerald-800 font-medium"><ShieldCheck className="w-5 h-5" /> Double authentification activée</p>
          <button type="button" onClick={disable} className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300 hover:border-garance hover:text-garance">
            <ShieldOff className="w-4 h-4" /> Désactiver
          </button>
        </div>
      ) : enroll ? (
        <form onSubmit={confirm} className="grid sm:grid-cols-[200px_1fr] gap-6 items-start">
          <img src={enroll.qr} alt="QR code à scanner avec votre application d’authentification" className="w-48 h-48 bg-white border border-stone-200 rounded-md p-2" />
          <div className="space-y-4">
            <ol className="list-decimal pl-5 space-y-1 text-[15px]">
              <li>Installez <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong> sur votre téléphone.</li>
              <li>Dans l’application, touchez « + » puis scannez ce QR code.</li>
              <li>Saisissez le code à 6 chiffres affiché.</li>
            </ol>
            <p className="text-xs text-stone-500 break-all">Pas de caméra ? Clé à saisir : {enroll.secret}</p>
            <Field label="Code à 6 chiffres" error={error ?? undefined}>
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="max-w-40 text-xl tracking-[0.3em]" />
            </Field>
            <div className="flex gap-3">
              <button disabled={busy || code.length < 6} className="bg-emerald-700 text-white px-5 py-3 rounded-md hover:bg-emerald-800 disabled:opacity-50">Activer</button>
              <button type="button" onClick={() => { setEnroll(null); setCode(''); }} className="px-4 py-3 text-stone-600">Annuler</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-stone-600">Non activée. À chaque connexion, un code de votre téléphone vous sera demandé en plus du mot de passe.</p>
          <button type="button" onClick={start} disabled={busy} className="ml-auto inline-flex items-center gap-2 bg-nuit text-laine px-5 py-3 rounded-md hover:bg-garance disabled:opacity-60">
            <ShieldCheck className="w-4 h-4" /> Activer
          </button>
        </div>
      )}
      {error && !enroll && <p className="text-sm text-garance" role="alert">{error}</p>}
    </Section>
  );
}
