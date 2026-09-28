import { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { notifyRestock } from '../../lib/api';
import { NotifyResult } from '../../types';
import { Modal } from './ui';
import { SHOP } from '../../config';

/** S'affiche quand un produit en rupture revient en stock et que des clients attendent. */
export function RestockModal({ productId, productName, waiting, onClose }: {
  productId: string; productName: string; waiting: number; onClose: (result: NotifyResult | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<NotifyResult | null>(null);

  async function notify() {
    setBusy(true); setError(null);
    try {
      const result = await notifyRestock(productId);
      if (result.mode === 'manual') { setManual(result); setBusy(false); return; }
      onClose(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
      setBusy(false);
    }
  }

  const subject = encodeURIComponent(`${productName} est de nouveau disponible`);
  const body = encodeURIComponent(`Bonjour,\n\nVous nous aviez demandé d’être prévenu(e) : « ${productName} » est de nouveau disponible.\n\n${window.location.origin}/produit/${productId}\n\nÀ bientôt,\n${SHOP.name}`);

  return (
    <Modal title="De retour en stock" onClose={() => onClose(null)}>
      {manual ? (
        <>
          <p className="leading-relaxed">L’envoi automatique n’est pas encore configuré (voir le guide, étape Resend). Vous pouvez leur écrire en un clic :</p>
          <a href={`mailto:?bcc=${manual.emails.join(',')}&subject=${subject}&body=${body}`}
            onClick={() => onClose({ ...manual, sent: manual.emails.length })}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-nuit text-laine px-5 py-3.5 rounded-md text-lg hover:bg-garance">
            <Mail className="w-5 h-5" /> Écrire aux {manual.emails.length} clients
          </a>
        </>
      ) : (
        <>
          <p className="leading-relaxed">
            <strong>{waiting} client{waiting > 1 ? 's ont' : ' a'}</strong> demandé à être prévenu{waiting > 1 ? 's' : ''} du retour de « {productName} ».
          </p>
          <p className="text-sm text-stone-500 mt-2">Un email avec la photo et le lien vers le produit leur sera envoyé.</p>
          {error && <p className="text-sm text-garance mt-3" role="alert">{error}</p>}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button onClick={() => onClose(null)} className="px-5 py-3.5 rounded-md border border-stone-300">Plus tard</button>
            <button onClick={notify} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 text-white px-5 py-3.5 rounded-md text-lg hover:bg-emerald-800 disabled:opacity-60">
              <Bell className="w-5 h-5" /> {busy ? 'Envoi…' : `Prévenir ${waiting > 1 ? `les ${waiting} clients` : 'le client'}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function restockMessage(r: NotifyResult): string {
  if (r.sent === 0) return 'Produit remis en vente';
  return r.mode === 'email'
    ? `${r.sent} client${r.sent > 1 ? 's prévenus' : ' prévenu'} par email`
    : 'Pensez à marquer les clients comme prévenus dans « Alertes stock »';
}
