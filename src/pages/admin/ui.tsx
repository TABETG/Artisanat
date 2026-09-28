import { useEffect } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Minus, Plus, X } from 'lucide-react';

/** Libellé + champ + aide + erreur, toujours dans le même ordre pour une lecture facile. */
export function Field({ label, required, optional, hint, error, counter, children }: {
  label: string; required?: boolean; optional?: boolean; hint?: string; error?: string;
  counter?: { value: number; max: number }; children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="font-medium text-[15px] text-encre">
          {label}
          {required && <span className="text-garance ml-0.5" aria-hidden>*</span>}
          {optional && <span className="font-normal text-stone-500 text-sm ml-1.5">(facultatif)</span>}
        </span>
        {counter && (
          <span className={`text-xs tabular-nums ${counter.value > counter.max ? 'text-garance' : 'text-stone-400'}`}>
            {counter.value} / {counter.max}
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="block text-sm text-stone-500 mt-1.5 leading-snug">{hint}</span>}
      {error && <span className="block text-sm text-garance mt-1.5 font-medium" role="alert">{error}</span>}
    </label>
  );
}

const base = 'w-full px-3.5 py-3 text-base text-encre bg-white border rounded-md placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-nuit/20 focus:border-nuit disabled:bg-stone-100';
const border = (invalid?: boolean) => (invalid ? 'border-garance' : 'border-stone-300');

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export const Input = ({ invalid, className = '', ...p }: InputProps) => <input {...p} aria-invalid={invalid || undefined} className={`${base} ${border(invalid)} ${className}`} />;

/** Champ avec unité affichée à droite (€, cm, kg…). */
export function UnitInput({ unit, invalid, className = '', ...p }: InputProps & { unit: string }) {
  return (
    <div className={`flex items-stretch rounded-md border bg-white focus-within:ring-2 focus-within:ring-nuit/20 focus-within:border-nuit ${border(invalid)} ${className}`}>
      <input {...p} aria-invalid={invalid || undefined} className="flex-1 min-w-0 px-3.5 py-3 text-base bg-transparent rounded-l-md focus:outline-none placeholder:text-stone-400" />
      <span className="px-3.5 flex items-center text-stone-500 bg-stone-50 border-l border-stone-200 rounded-r-md select-none">{unit}</span>
    </div>
  );
}

export const Textarea = ({ invalid, className = '', ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) =>
  <textarea {...p} className={`${base} ${border(invalid)} leading-relaxed ${className}`} />;

export const Select = ({ className = '', ...p }: SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className={`${base} ${border()} ${className}`} />;

/** Quantité avec gros boutons − / + (pratique sur téléphone). */
export function Stepper({ value, onChange, min = 0, max = 9999, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-stretch border border-stone-300 rounded-md bg-white">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="px-3.5 disabled:opacity-30 hover:bg-stone-50 rounded-l-md" aria-label={`${label} : retirer un`}><Minus className="w-4 h-4" /></button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} aria-label={label}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0)))}
        className="w-16 text-center text-base py-3 border-x border-stone-200 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className="px-3.5 disabled:opacity-30 hover:bg-stone-50 rounded-r-md" aria-label={`${label} : ajouter un`}><Plus className="w-4 h-4" /></button>
    </div>
  );
}

/** Interrupteur on/off avec titre et explication. */
export function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (v: boolean) => void; title: string; description?: string }) {
  return (
    <label className="flex items-start gap-4 cursor-pointer">
      <span className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block w-11 h-6 rounded-full bg-stone-300 peer-checked:bg-emerald-700 transition-colors" />
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block font-medium text-[15px]">{title}</span>
        {description && <span className="block text-sm text-stone-500 leading-snug">{description}</span>}
      </span>
    </label>
  );
}

/** Bloc titré du formulaire. */
export function Section({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="bg-white rounded-lg border border-stone-200 p-5 sm:p-6 scroll-mt-24">
      <h2 className="font-display text-xl text-nuit">{title}</h2>
      {description && <p className="text-sm text-stone-500 mt-1 leading-snug">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Toast({ message, tone = 'ok' }: { message: string | null; tone?: 'ok' | 'error' }) {
  if (!message) return null;
  return (
    <div role="status" className={`fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-md shadow-lg text-laine max-w-[90vw] ${tone === 'ok' ? 'bg-emerald-700' : 'bg-garance'}`}>
      {message}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-encre/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-lg p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded hover:bg-stone-100" aria-label="Fermer"><X className="w-5 h-5" /></button>
        <h2 className="font-display text-2xl text-nuit pr-8">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'alert' }) {
  return (
    <div className={`bg-white rounded-lg border p-5 ${tone === 'alert' ? 'border-garance/40' : 'border-stone-200'}`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`font-display text-3xl mt-1 ${tone === 'alert' ? 'text-garance' : 'text-nuit'}`}>{value}</p>
      {sub && <p className="text-sm text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}
