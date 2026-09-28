import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { listProducts } from '../lib/api';
import { Product } from '../types';
import { ProductImage } from './ProductImage';
import { Price } from './Price';

/** Recherche instantanée depuis n'importe quelle page. */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    input.current?.focus();
    listProducts().then(setProducts).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return products
      .map((p) => ({ p, text: norm(`${p.name} ${p.description} ${p.material} ${p.technique} ${p.origin} ${p.colors.join(' ')}`), name: norm(p.name) }))
      .filter((x) => words.every((w) => x.text.includes(w)))
      .sort((a, b) => Number(words.some((w) => b.name.includes(w))) - Number(words.some((w) => a.name.includes(w))) || (b.p.stock > 0 ? 1 : 0) - (a.p.stock > 0 ? 1 : 0))
      .map((x) => x.p)
      .slice(0, 6);
  }, [q, products]);

  function submit() {
    navigate(`/boutique?recherche=${encodeURIComponent(q.trim())}`);
    onClose();
  }

  // Rendu dans <body> : l'en-tête flouté ne doit pas contenir la fenêtre
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Rechercher">
      <div className="absolute inset-0 bg-encre/50" onClick={onClose} />
      <div className="relative bg-laine max-w-2xl mx-auto mt-0 sm:mt-20 sm:rounded-sm shadow-2xl">
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) submit(); }} className="flex items-center gap-3 px-5 border-b border-laine-fonce">
          <Search className="w-5 h-5 text-henne shrink-0" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapis, kilim, coussin, rouge, 200 cm…"
            className="flex-1 py-5 bg-transparent text-lg outline-none focus-visible:outline-none" aria-label="Rechercher une création" />
          <button type="button" onClick={onClose} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
        </form>
        {q.trim() && (
          <div className="max-h-[70vh] overflow-y-auto">
            {results.length === 0 ? (
              <p className="p-6 text-henne">Aucune création ne correspond. <Link to="/sur-mesure" onClick={onClose} className="text-garance underline">Et si nous la tissions pour vous ?</Link></p>
            ) : (
              <ul className="divide-y divide-laine-fonce">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link to={`/produit/${p.id}`} onClick={onClose} className="flex items-center gap-4 px-5 py-3 hover:bg-laine-fonce/50">
                      <ProductImage src={p.images[0]} alt="" className="w-14 h-16 rounded-sm shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-display text-nuit truncate">{p.name}</span>
                        <span className="text-sm text-henne">{p.stock === 0 ? 'Rupture de stock' : p.width_cm && p.length_cm ? `${p.width_cm} × ${p.length_cm} cm` : ''}</span>
                      </span>
                      <Price cents={p.price_cents} compareAt={p.compare_at_price_cents} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {results.length > 0 && (
              <button onClick={submit} className="w-full text-left px-5 py-4 text-garance underline border-t border-laine-fonce">Voir tous les résultats pour « {q.trim()} »</button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
