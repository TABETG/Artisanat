import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-20 text-center">
      <h1 className="font-display text-4xl text-nuit">Cette page n’existe pas</h1>
      <p className="mt-4 text-henne">Le lien est peut-être ancien ou mal recopié.</p>
      <Link to="/" className="inline-block mt-8 bg-nuit text-laine px-7 py-3.5 rounded-sm">Retour à l’accueil</Link>
    </div>
  );
}
