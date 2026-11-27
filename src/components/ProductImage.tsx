interface Props { src?: string | null; alt: string; className?: string; priority?: boolean }

export function ProductImage({ src, alt, className = '', priority = false }: Props) {
  if (!src) return <div className={`tissage ${className}`} role="img" aria-label={alt} />;
  // priority : image principale de la page (chargée tout de suite, meilleur affichage initial)
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" {...(priority ? { fetchpriority: 'high' } as Record<string, string> : {})} className={`object-cover ${className}`} />;
}
