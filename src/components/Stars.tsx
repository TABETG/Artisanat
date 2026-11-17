import { useState } from 'react';
import { Star } from 'lucide-react';

export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star className="absolute inset-0 text-safran/40" style={{ width: size, height: size }} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - i + 1)) * 100}%` }}>
            <Star className="fill-safran text-safran" style={{ width: size, height: size }} />
          </span>
        </span>
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Note" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} sur 5 — ${labels[i]}`}
            onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} className="p-1">
            <Star className={`w-8 h-8 ${i <= shown ? 'fill-safran text-safran' : 'text-safran/40'}`} />
          </button>
        ))}
      </div>
      <span className="text-sm text-henne">{labels[shown]}</span>
    </div>
  );
}
