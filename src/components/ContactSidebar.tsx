import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Mail, MessageCircle, Phone, ShieldCheck, Trash2 } from 'lucide-react';
import { Drawer } from './Drawer';
import { sendContactMessage } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { clearLocalData, getConsent, setConsent } from '../lib/privacy';

/** Barre latérale : nous contacter + vos données (RGPD). */
export function ContactSidebar({ onClose, initialTab = 'contact' }: { onClose: () => void; initialTab?: 'contact' | 'donnees' }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <Drawer side="right" title={tab === 'contact' ? 'Nous contacter' : 'Vos données'} onClose={onClose}>
      <div className="px-6 pt-5 flex gap-2" role="tablist">
        {([['contact', 'Contact'], ['donnees', 'Vos données']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${tab === id ? 'bg-nuit text-laine' : 'border border-nuit/20 text-nuit hover:border-nuit'}`}>{label}</button>
        ))}
      </div>
      {tab === 'contact' ? <ContactTab /> : <PrivacyTab onClose={onClose} />}
    </Drawer>
  );
}

function ContactTab() {
  const { settings } = useSettings();
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce focus:border-nuit focus:outline-none';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try { await sendContactMessage(f); setState('done'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setState('idle'); }
  }

  return (
    <div className="px-6 py-6 space-y-8">
      <div className="grid gap-2">
        {settings.whatsapp && (
          <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-white border border-laine-fonce hover:border-nuit">
            <MessageCircle className="w-6 h-6 text-menthe" /><span><span className="block font-medium text-nuit">WhatsApp</span><span className="text-sm text-henne">Réponse rapide, photos bienvenues</span></span>
          </a>
        )}
        <a href={`mailto:${settings.email}`} className="flex items-center gap-4 p-4 bg-white border border-laine-fonce hover:border-nuit">
          <Mail className="w-6 h-6 text-garance" /><span className="min-w-0"><span className="block font-medium text-nuit">Email</span><span className="text-sm text-henne break-all">{settings.email}</span></span>
        </a>
        {settings.phone && (
          <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="flex items-center gap-4 p-4 bg-white border border-laine-fonce hover:border-nuit">
            <Phone className="w-6 h-6 text-nuit" /><span><span className="block font-medium text-nuit">Téléphone</span><span className="text-sm text-henne">{settings.phone}</span></span>
          </a>
        )}
      </div>

      {state === 'done' ? (
        <p className="flex gap-3 bg-[#DCEBE2] text-menthe p-4" role="status"><Check className="w-5 h-5 shrink-0" /> Message envoyé. Nous vous répondons en général sous 24 heures.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="font-display text-2xl text-nuit">Écrire un message</p>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="sr-only">Nom</span><input required maxLength={100} placeholder="Nom" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></label>
            <label><span className="sr-only">Email</span><input required type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={input} /></label>
          </div>
          <label className="block"><span className="sr-only">Sujet</span><input maxLength={150} placeholder="Sujet (facultatif)" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className={input} /></label>
          <label className="block"><span className="sr-only">Message</span><textarea required rows={5} maxLength={3000} placeholder="Votre message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className={input} /></label>
          {error && <p className="text-sm text-garance" role="alert">{error}</p>}
          <button disabled={state === 'sending'} className="w-full bg-nuit text-laine py-3.5 font-medium hover:bg-garance disabled:opacity-60">{state === 'sending' ? 'Envoi…' : 'Envoyer le message'}</button>
          <p className="text-xs text-henne">Votre nom et votre email servent uniquement à vous répondre. <Link to="/confidentialite" className="underline">En savoir plus</Link></p>
        </form>
      )}
      {settings.address && <p className="text-sm text-henne">Atelier : {settings.address}</p>}
    </div>
  );
}

function PrivacyTab({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const [stats, setStats] = useState(getConsent()?.stats !== false);
  const [cleared, setCleared] = useState(false);
  const changeStats = (v: boolean) => { setStats(v); setConsent(v); };

  return (
    <div className="px-6 py-6 space-y-7 lecture text-base">
      <div className="flex gap-3">
        <ShieldCheck className="w-6 h-6 text-menthe shrink-0 mt-1" />
        <p>Ce site n’utilise <strong>aucun cookie publicitaire</strong> ni outil de suivi externe. Rien n’est partagé avec des régies ou des réseaux sociaux.</p>
      </div>

      <section>
        <p className="font-sans font-semibold text-nuit">Enregistré sur votre appareil</p>
        <p className="mt-1">Votre panier, vos favoris et les pièces consultées, pour les retrouver à votre prochaine visite. Ces données ne quittent pas votre navigateur.</p>
      </section>

      <section>
        <label className="flex items-start gap-4 cursor-pointer font-sans">
          <span className="relative mt-1 shrink-0">
            <input type="checkbox" className="peer sr-only" checked={stats} onChange={(e) => changeStats(e.target.checked)} />
            <span className="block w-11 h-6 rounded-full bg-laine-fonce peer-checked:bg-menthe transition-colors" />
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
          <span>
            <span className="block font-semibold text-nuit">Statistiques anonymes</span>
            <span className="block text-sm text-henne">Compte les vues et ajouts au panier d’un produit, sans vous identifier. Nous aide à savoir quelles pièces plaisent.</span>
          </span>
        </label>
      </section>

      <section>
        <p className="font-sans font-semibold text-nuit">Vos droits</p>
        <p className="mt-1">Vous pouvez demander l’accès, la correction ou la suppression des données liées à vos commandes, ou vous désinscrire de la lettre d’information, en écrivant à{' '}
          <a href={`mailto:${settings.email}?subject=${encodeURIComponent('Demande concernant mes données personnelles')}`} className="text-garance underline break-all">{settings.email}</a>.</p>
      </section>

      <div className="font-sans flex flex-wrap gap-3">
        <button onClick={() => { clearLocalData(); setCleared(true); setTimeout(() => window.location.reload(), 900); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-nuit/20 text-nuit hover:border-garance hover:text-garance">
          <Trash2 className="w-4 h-4" /> {cleared ? 'Données effacées' : 'Effacer mes données sur cet appareil'}
        </button>
        <Link to="/confidentialite" onClick={onClose} className="px-4 py-2.5 text-nuit underline">Politique de confidentialité</Link>
      </div>
    </div>
  );
}
