import type { ReactNode } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function ContactPage() {
  const { settings: SHOP } = useSettings();
  return (
    <div className="max-w-3xl mx-auto px-5 pt-14">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-5xl md:text-7xl text-nuit">Nous contacter</h1>
      <p className="lecture mt-5 text-[1.2rem] text-encre/85">
        Une question sur une pièce, une dimension sur mesure, le suivi d’une commande ? Nous répondons en général sous 24 heures.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <ContactCard href={`https://wa.me/${SHOP.whatsapp}`} icon={<MessageCircle className="w-6 h-6" />} title="WhatsApp" text="Écrire un message" />
        <ContactCard href={`mailto:${SHOP.email}`} icon={<Mail className="w-6 h-6" />} title="Email" text={SHOP.email} />
        <ContactCard href={`tel:${SHOP.phone.replace(/\s/g, '')}`} icon={<Phone className="w-6 h-6" />} title="Téléphone" text={SHOP.phone} />
      </div>
      <p className="mt-10 text-henne">{SHOP.address}</p>
    </div>
  );
}

function ContactCard({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
      className="block p-5 border border-laine-fonce rounded-sm hover:border-garance bg-white/40">
      <span className="text-garance">{icon}</span>
      <p className="font-display text-lg text-nuit mt-3">{title}</p>
      <p className="text-sm text-encre/75 mt-1 break-all">{text}</p>
    </a>
  );
}
