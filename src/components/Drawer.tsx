import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Panneau latéral accessible : fermeture par Échap ou clic à côté, focus placé dans le panneau. */
export function Drawer({ side, title, onClose, children, width = 'max-w-md' }: {
  side: 'left' | 'right'; title: string; onClose: () => void; children: ReactNode; width?: string;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; previous?.focus?.(); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-nuit/40" onClick={onClose} />
      <aside ref={panel} tabIndex={-1}
        className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-full ${width} bg-laine shadow-2xl flex flex-col focus:outline-none`}>
        <div className="lisiere shrink-0" aria-hidden />
        <div className="flex items-center justify-between px-6 h-[72px] border-b border-laine-fonce shrink-0">
          <p className="font-display text-3xl text-nuit">{title}</p>
          <button onClick={onClose} className="p-2 text-nuit hover:text-garance" aria-label="Fermer"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
