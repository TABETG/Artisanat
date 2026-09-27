import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { SHOP } from '../config';

export function StoryPage() {
  return (
    <Prose title="Notre histoire">
      <p>
        Tout commence en {SHOP.since}, autour d’un métier à tisser familial. Depuis, le geste n’a pas changé :
        la laine de mouton est lavée, cardée, filée puis teinte avant d’être nouée fil à fil.
      </p>
      <p>
        Nos tapis reprennent les motifs transmis de génération en génération : losanges, chevrons, lignes brisées.
        Chaque tisserande y laisse sa marque, si bien qu’aucune pièce n’est la copie d’une autre.
      </p>
      <h2>Ce que nous fabriquons</h2>
      <ul>
        <li>Tapis noués à la main, épais et moelleux</li>
        <li>Kilims et tissages plats, légers et réversibles</li>
        <li>Coussins, plaids, couvertures et sacs en laine</li>
      </ul>
      <h2>Entretenir un tapis en laine</h2>
      <p>
        Passez l’aspirateur sans brosse rotative, dans le sens du poil. En cas de tache, tamponnez à l’eau froide
        sans frotter. Tournez le tapis une à deux fois par an pour qu’il se patine de façon régulière.
      </p>
      <p>
        <em>Texte à personnaliser : racontez ici l’histoire de votre famille ou de votre atelier.</em>
      </p>
      <p><Link to="/boutique">Découvrir les créations</Link></p>
    </Prose>
  );
}
