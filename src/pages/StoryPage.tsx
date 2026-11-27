import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { useSettings } from '../context/SettingsContext';

export function StoryPage() {
  const { settings } = useSettings();
  const paragraphs = settings.story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <Prose title="Notre histoire">
      {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}

      <h2 id="savoir-faire" className="scroll-mt-28">Le savoir-faire</h2>
      <p>
        Le métal est ciselé, les perles enfilées, la laine tissée à la main, en France, avec les motifs et les gestes
        hérités de notre famille et du patrimoine algérien et amazigh. Chaque pièce demande du temps : aucune n’est
        identique à une autre.
      </p>

      <h2 id="engagements" className="scroll-mt-28">Nos engagements</h2>
      <ul>
        <li>Des créations faites main en France.</li>
        <li>Ce que vous voyez est ce que vous recevez : chaque pièce est photographiée à l’atelier.</li>
        <li>Un paiement sécurisé par carte, Apple Pay ou Google Pay.</li>
        <li>Une livraison suivie et 14 jours pour changer d’avis (<Link to="/livraison-et-retours">livraison et retours</Link>).</li>
        <li>Aucun cookie publicitaire (<Link to="/confidentialite">vos données</Link>).</li>
      </ul>

      <h2>Entretenir un tapis en laine</h2>
      <p>
        Passez l’aspirateur sans brosse rotative, dans le sens du poil. En cas de tache, tamponnez à l’eau froide
        sans frotter. Tournez le tapis une à deux fois par an pour qu’il se patine de façon régulière.
      </p>
      <p><Link to="/boutique">Découvrir les créations</Link></p>
    </Prose>
  );
}
