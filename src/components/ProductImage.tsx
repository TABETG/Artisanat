interface Props { src?: string | null; alt: string; className?: string }

export function ProductImage({ src, alt, className = '' }: Props) {
  if (!src) return <div className={`tissage ${className}`} role="img" aria-label={alt} />;
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
