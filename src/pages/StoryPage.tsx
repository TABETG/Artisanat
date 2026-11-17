import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { useSettings } from '../context/SettingsContext';

export function StoryPage() {
  const { settings } = useSettings();
  const paragraphs = settings.story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <Prose title="Notre histoire">
      {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      <h2>Entretenir un tapis en laine</h2>
      <p>
        Passez l’aspirateur sans brosse rotative, dans le sens du poil. En cas de tache, tamponnez à l’eau froide
        sans frotter. Tournez le tapis une à deux fois par an pour qu’il se patine de façon régulière.
      </p>
      <p><Link to="/boutique">Découvrir les créations</Link></p>
    </Prose>
  );
}
