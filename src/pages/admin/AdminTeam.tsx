import { FormEvent, useState } from 'react';
import { History, Trash2, UserPlus, Users } from 'lucide-react';
import { addTeamMember, listActivity, listTeam, removeTeamMember } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';
import { Field, Input, Section, Toast } from './ui';

export function AdminTeam() {
  const team = useAsync(listTeam, []);
  const activity = useAsync(listActivity, []);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await addTeamMember(email); setEmail(''); team.reload(); flash('Accès donné. Si la personne n’a pas encore de compte, elle reçoit une invitation par email.'); }
    catch (err) { flash(err instanceof Error ? err.message : 'Erreur', 'error'); }
    finally { setBusy(false); }
  }

  async function remove(userId: string, who: string) {
    if (!confirm(`Retirer l’accès vendeur de ${who} ?`)) return;
    try { await removeTeamMember(userId); team.reload(); flash('Accès retiré'); } catch (err) { flash(err instanceof Error ? err.message : 'Erreur', 'error'); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><Users className="w-7 h-7 text-garance" /> Équipe</h1>
      <Section title="Personnes ayant accès à l’espace vendeur" description="Chacune se connecte avec son propre email et mot de passe. Pour plus de sécurité, demandez-leur d’activer la double authentification.">
        {team.loading ? <p className="text-stone-500">Chargement…</p> : (
          <ul className="divide-y divide-stone-100">
            {team.data?.map((m) => (
              <li key={m.user_id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium">{m.email}</span>
                {m.me && <span className="text-xs px-2 py-0.5 rounded bg-nuit/10 text-nuit">Vous</span>}
                <span className="text-sm text-stone-500">{m.last_sign_in_at ? `Dernière connexion : ${formatDate(m.last_sign_in_at)}` : 'Invitation envoyée, pas encore connecté'}</span>
                {!m.me && <button onClick={() => remove(m.user_id, m.email)} className="ml-auto p-2.5 rounded-md text-garance hover:bg-red-50" aria-label={`Retirer ${m.email}`}><Trash2 className="w-4 h-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-64"><Field label="Ajouter une personne"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="collaborateur@exemple.fr" /></Field></div>
          <button disabled={busy} className="inline-flex items-center gap-2 bg-nuit text-laine px-5 py-3 rounded-md hover:bg-garance disabled:opacity-60"><UserPlus className="w-4 h-4" /> Donner l’accès</button>
        </form>
      </Section>

      <Section title="Journal d’activité" description="Les 300 dernières actions dans l’espace vendeur : qui a modifié quoi, et quand.">
        {activity.loading ? <p className="text-stone-500">Chargement…</p> : !activity.data?.length ? <p className="text-stone-500">Aucune action enregistrée pour l’instant.</p> : (
          <ul className="divide-y divide-stone-100 text-[15px]">
            {activity.data.map((a) => (
              <li key={a.id} className="py-2.5 flex flex-wrap gap-x-4 gap-y-0.5">
                <History className="w-4 h-4 text-stone-400 mt-0.5" />
                <span className="flex-1 min-w-48">{a.action}</span>
                <span className="text-sm text-stone-500">{a.user_email}</span>
                <span className="text-sm text-stone-400 w-44 text-right">{formatDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  );
}
