import { useState } from 'react';
import { Ruler } from 'lucide-react';

/** Aide au choix : dans quelle pièce ce tapis trouve-t-il sa place ? */
export function SizeGuide({ width, length }: { width: number | null; length: number | null }) {
  const [open, setOpen] = useState(false);
  const [roomW, setRoomW] = useState('');
  const [roomL, setRoomL] = useState('');
  const w = parseFloat(roomW.replace(',', '.'));
  const l = parseFloat(roomL.replace(',', '.'));
  const hasRoom = w > 0 && l > 0;
  // Règle usuelle : laisser 40 à 60 cm de sol visible autour du tapis
  const ideal = hasRoom ? { w: Math.max(60, Math.round((Math.min(w, l) * 100 - 100) / 10) * 10), l: Math.max(90, Math.round((Math.max(w, l) * 100 - 100) / 10) * 10) } : null;
  const rug = width && length ? { w: Math.min(width, length), l: Math.max(width, length) } : null;
  const verdict = ideal && rug
    ? rug.w > ideal.w + 20 || rug.l > ideal.l + 20 ? 'Ce tapis sera un peu grand : il touchera les murs ou passera sous les meubles.'
      : rug.w < ideal.w * 0.55 ? 'Ce tapis habillera un coin (devant un fauteuil, au pied du lit) plutôt que toute la pièce.'
        : 'Ce tapis est bien proportionné pour cette pièce.'
    : null;

  return (
    <div className="mt-3">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-2 text-sm text-nuit underline underline-offset-4">
        <Ruler className="w-4 h-4" /> Quelle taille pour ma pièce ?
      </button>
      {open && (
        <div className="mt-3 p-4 bg-laine-fonce/60 rounded-sm text-sm space-y-3">
          <p>Indiquez les dimensions de votre pièce (ou de l’espace à couvrir) :</p>
          <div className="flex flex-wrap items-center gap-2">
            <input inputMode="decimal" value={roomW} onChange={(e) => setRoomW(e.target.value)} placeholder="3,5" aria-label="Largeur de la pièce en mètres" className="w-20 px-3 py-2 bg-white border border-laine-fonce rounded-sm" />
            <span>×</span>
            <input inputMode="decimal" value={roomL} onChange={(e) => setRoomL(e.target.value)} placeholder="4,5" aria-label="Longueur de la pièce en mètres" className="w-20 px-3 py-2 bg-white border border-laine-fonce rounded-sm" />
            <span>mètres</span>
          </div>
          {ideal && <p>Taille idéale : environ <strong>{ideal.w} × {ideal.l} cm</strong> (40 à 60 cm de sol visible autour).</p>}
          {verdict && <p className="font-medium text-nuit">{verdict}</p>}
          <ul className="list-disc pl-5 text-henne space-y-1">
            <li>Salon : les pieds avant du canapé posés sur le tapis.</li>
            <li>Salle à manger : 60 cm de plus que la table de chaque côté, pour reculer les chaises.</li>
            <li>Chambre : le tapis dépasse de 50 cm de chaque côté du lit.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
