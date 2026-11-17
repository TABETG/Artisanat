import { useEffect, useState } from 'react';

/** « 2 j 03 h 12 min » jusqu'à la date donnée ; rien une fois passée. */
export function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return (
    <span className="inline-flex items-center gap-1 ml-2 font-semibold text-safran tabular-nums">
      · encore {d > 0 && `${d} j `}{String(h).padStart(2, '0')} h {String(m).padStart(2, '0')} min
    </span>
  );
}
