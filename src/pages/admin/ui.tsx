import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block font-medium text-encre mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-sm text-stone-500 mt-1">{hint}</span>}
      {error && <span className="block text-sm text-garance mt-1" role="alert">{error}</span>}
    </label>
  );
}

const base = 'w-full px-3.5 py-3 text-base bg-white border border-stone-300 rounded-md focus:border-nuit focus:outline-none';

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${base} ${p.className ?? ''}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${base} ${p.className ?? ''}`} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${base} ${p.className ?? ''}`} />;

export function Toast({ message, tone = 'ok' }: { message: string | null; tone?: 'ok' | 'error' }) {
  if (!message) return null;
  return (
    <div role="status" className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-md shadow-lg text-laine ${tone === 'ok' ? 'bg-emerald-700' : 'bg-garance'}`}>
      {message}
    </div>
  );
}
