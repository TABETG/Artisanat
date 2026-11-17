import { FormEvent, ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Gift, MessageCircle, Ruler, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductImage } from '../components/ProductImage';
import { usePanels } from '../context/PanelsContext';
import { COLORS } from '../config';
import { Product } from '../types';

// =====================================================================
// Pages « univers » : une vitrine par grande famille (maison, bijoux, beauté),
// avec les étapes, des outils pour choisir et un guide complet (utile au référencement).
// =====================================================================

type Id = 'maison' | 'bijoux' | 'beaute';
interface LinkItem { label: string; to: string }
interface Column { title: string; image: (p: Product[]) => string | undefined; groups: { title: string; to: string; links: LinkItem[] }[] }
interface Universe {
  title: string; heroTitle: string; heroImage: (p: Product[]) => string | undefined;
  columns: Column[]; banner: { text: string; cta: LinkItem };
  guide: { title: string; intro: string; sections: { title: string; text: ReactNode }[] };
  alsoSee: LinkItem[];
}

const shop = (q: Record<string, string>) => `/boutique?${new URLSearchParams(q).toString()}`;
const imageOf = (category: string, search?: string) => (products: Product[]) =>
  products.find((p) => p.category === category && p.images.length && (!search || p.name.toLowerCase().includes(search)))?.images[0]
  ?? products.find((p) => p.category === category && p.images.length)?.images[0];

const UNIVERSES: Record<Id, Universe> = {
  maison: {
    title: 'Boutique du tapis berbère',
    heroTitle: 'Tout l’artisanat berbère pour habiller votre maison',
    heroImage: imageOf('tapis', 'azilal'),
    columns: [
      { title: 'Choisir son tapis', image: imageOf('tapis', 'beni'), groups: [
        { title: 'Tapis noués', to: shop({ categorie: 'tapis', technique: 'Noué main' }), links: [
          { label: 'Beni Ouarain écrus', to: shop({ recherche: 'beni ouarain' }) },
          { label: 'Azilal colorés', to: shop({ recherche: 'azilal' }) },
          { label: 'Boucherouite en tissu recyclé', to: shop({ recherche: 'boucherouite' }) },
        ] },
        { title: 'Kilims tissés à plat', to: shop({ categorie: 'tapis', technique: 'Tissage plat (kilim)' }), links: [
          { label: 'Kilims réversibles', to: shop({ recherche: 'kilim' }) },
          { label: 'Tapis de couloir', to: shop({ categorie: 'tapis', taille: 'petit' }) },
        ] },
      ] },
      { title: 'Choisir la bonne taille', image: imageOf('tapis', 'kilim'), groups: [
        { title: 'Par dimension', to: shop({ categorie: 'tapis' }), links: [
          { label: 'Petits tapis, jusqu’à 150 cm', to: shop({ categorie: 'tapis', taille: 'petit' }) },
          { label: 'Moyens, 150 à 250 cm', to: shop({ categorie: 'tapis', taille: 'moyen' }) },
          { label: 'Grands tapis de salon', to: shop({ categorie: 'tapis', taille: 'grand' }) },
        ] },
        { title: 'Sur mesure', to: '/sur-mesure', links: [
          { label: 'Vos dimensions exactes', to: '/sur-mesure' },
          { label: 'Vos couleurs et motifs', to: '/sur-mesure' },
        ] },
      ] },
      { title: 'Associer', image: imageOf('coussins'), groups: [
        { title: 'Coussins', to: shop({ categorie: 'coussins' }), links: [
          { label: 'Coussins en laine tissée', to: shop({ categorie: 'coussins' }) },
          { label: 'Coussins kilim', to: shop({ categorie: 'coussins', recherche: 'kilim' }) },
        ] },
        { title: 'Plaids et couvertures', to: shop({ categorie: 'plaids' }), links: [
          { label: 'Plaids Hanbel rayés', to: shop({ recherche: 'hanbel' }) },
          { label: 'Couvre-lits', to: shop({ categorie: 'plaids' }) },
        ] },
      ] },
      { title: 'Entretenir', image: imageOf('plaids'), groups: [
        { title: 'Conseils', to: '/questions-frequentes', links: [
          { label: 'Aspirer et détacher', to: '/questions-frequentes' },
          { label: 'Laver un tapis en laine', to: '/questions-frequentes' },
        ] },
        { title: 'Petits prix', to: shop({ categorie: 'tapis', promotion: '1' }), links: [
          { label: 'Tapis en promotion', to: shop({ categorie: 'tapis', promotion: '1' }) },
          { label: 'Nouveautés', to: shop({ nouveautes: '1' }) },
        ] },
      ] },
    ],
    banner: { text: 'Laine naturelle et teintures végétales : un artisanat durable', cta: { label: 'Voir les teintures végétales', to: shop({ recherche: 'végétal' }) } },
    guide: {
      title: 'Tout savoir pour choisir un tapis berbère',
      intro: 'Nos tapis sont noués ou tissés à la main dans l’Atlas, en laine de mouton filée et teinte selon des gestes transmis depuis des générations. Voici l’essentiel pour choisir la pièce qui convient à votre intérieur.',
      sections: [
        { title: 'Tapis noué ou kilim : quelle différence ?', text: <>Un tapis <strong>noué</strong> (Beni Ouarain, Azilal) est fait de milliers de nœuds qui forment un velours épais, doux et isolant : idéal au salon ou dans une chambre. Un <strong>kilim</strong> est tissé à plat, sans poils : plus fin, réversible et léger, il convient aux pièces de passage et se déplace facilement.</> },
        { title: 'Quelle taille pour quelle pièce ?', text: <>Au salon, le tapis passe sous les pieds avant du canapé : laissez 30 à 60 cm de sol visible tout autour. Dans une chambre, il dépasse du lit d’au moins 50 cm de chaque côté. Dans une entrée ou un couloir, comptez 10 cm de moins que la largeur du passage. L’outil ci-dessus calcule la taille idéale à partir des dimensions de votre pièce.</> },
        { title: 'Comment reconnaître un vrai tapis fait main ?', text: <>Retournez-le : sur un tapis noué main, les motifs se lisent au dos et les nœuds sont légèrement irréguliers. Les franges sont la continuité des fils de chaîne, pas un galon cousu. Chaque pièce est unique : de petites variations de couleur (l’« abrash ») sont la marque de la teinture à la main.</> },
        { title: 'Comment l’entretenir ?', text: <>Aspirez une fois par semaine sans brosse rotative, dans le sens du poil. En cas de tache, tamponnez à l’eau froide sans frotter. Tournez le tapis une à deux fois par an pour qu’il s’use régulièrement, et confiez-le à un nettoyeur spécialisé tous les deux ou trois ans.</> },
        { title: 'Les étapes pour bien choisir', text: (
          <ol className="list-decimal pl-6 space-y-1">
            <li>Mesurez la pièce et repérez les meubles qui reposeront sur le tapis.</li>
            <li>Choisissez la texture : velours épais et chaud, ou tissage plat et léger.</li>
            <li>Choisissez les couleurs : écru pour agrandir l’espace, motifs colorés pour réchauffer.</li>
            <li>Pas de dimension adaptée ? Demandez un tapis sur mesure, tissé pour vous.</li>
          </ol>
        ) },
      ],
    },
    alsoSee: [
      { label: 'tapis beni ouarain', to: shop({ recherche: 'beni ouarain' }) }, { label: 'tapis azilal', to: shop({ recherche: 'azilal' }) },
      { label: 'kilim berbère', to: shop({ recherche: 'kilim' }) }, { label: 'tapis boucherouite', to: shop({ recherche: 'boucherouite' }) },
      { label: 'grand tapis de salon', to: shop({ categorie: 'tapis', taille: 'grand' }) }, { label: 'petit tapis', to: shop({ categorie: 'tapis', taille: 'petit' }) },
      { label: 'tapis écru', to: shop({ categorie: 'tapis', couleur: 'ecru' }) }, { label: 'tapis rouge', to: shop({ categorie: 'tapis', couleur: 'rouge' }) },
      { label: 'coussin berbère', to: shop({ categorie: 'coussins' }) }, { label: 'plaid en laine', to: shop({ categorie: 'plaids' }) },
      { label: 'tapis sur mesure', to: '/sur-mesure' }, { label: 'tapis en promotion', to: shop({ categorie: 'tapis', promotion: '1' }) },
    ],
  },

  bijoux: {
    title: 'Boutique des bijoux berbères',
    heroTitle: 'Bijoux kabyles et berbères, faits main',
    heroImage: imageOf('bijoux', 'collier'),
    columns: [
      { title: 'Colliers', image: imageOf('bijoux', 'collier'), groups: [
        { title: 'Colliers', to: shop({ categorie: 'bijoux', recherche: 'collier' }), links: [
          { label: 'Colliers kabyles émaillés', to: shop({ categorie: 'bijoux', recherche: 'collier' }) },
          { label: 'Colliers de corail', to: shop({ categorie: 'bijoux', recherche: 'corail' }) },
        ] },
      ] },
      { title: 'Boucles d’oreilles', image: imageOf('bijoux', 'boucles'), groups: [
        { title: 'Boucles d’oreilles', to: shop({ categorie: 'bijoux', recherche: 'boucles' }), links: [
          { label: 'Pendants émaillés', to: shop({ categorie: 'bijoux', recherche: 'émail' }) },
          { label: 'Créoles et anneaux', to: shop({ categorie: 'bijoux', recherche: 'boucles' }) },
        ] },
      ] },
      { title: 'Bracelets', image: imageOf('bijoux', 'bracelet'), groups: [
        { title: 'Bracelets', to: shop({ categorie: 'bijoux', recherche: 'bracelet' }), links: [
          { label: 'Manchettes ciselées', to: shop({ categorie: 'bijoux', recherche: 'manchette' }) },
          { label: 'Bracelets fins', to: shop({ categorie: 'bijoux', recherche: 'bracelet' }) },
        ] },
      ] },
      { title: 'Offrir', image: imageOf('bijoux'), groups: [
        { title: 'Idées cadeaux', to: shop({ categorie: 'bijoux' }), links: [
          { label: 'Moins de 50 €', to: shop({ categorie: 'bijoux', 'prix-max': '50' }) },
          { label: 'Moins de 100 €', to: shop({ categorie: 'bijoux', 'prix-max': '100' }) },
          { label: 'Carte cadeau', to: '/carte-cadeau' },
        ] },
      ] },
    ],
    banner: { text: 'Chaque bijou indique son métal : le choix en toute confiance', cta: { label: 'Voir tous les bijoux', to: shop({ categorie: 'bijoux' }) } },
    guide: {
      title: 'Tout savoir sur les bijoux berbères',
      intro: 'Des parures kabyles aux bijoux des Aurès, les bijoux berbères associent le métal ciselé, l’émail et le corail. Ils se transmettent, se portent aux fêtes comme au quotidien.',
      sections: [
        { title: 'Les grandes familles', text: <>Les bijoux <strong>kabyles</strong> sont reconnaissables à leur émail cloisonné vert, jaune et bleu, serti de corail rouge. Ceux des <strong>Aurès</strong> et du sud jouent sur le métal ciselé et les pampilles. Les fibules (<em>tabzimt</em>, <em>khelkhal</em>) fermaient autrefois les vêtements.</> },
        { title: 'Quel métal choisir ?', text: <>L’<strong>argent 925</strong> est durable et se patine avec le temps. Le <strong>métal argenté</strong> et le <strong>laiton</strong> permettent des pièces plus abordables. Si vous avez la peau sensible, choisissez un bijou marqué « sans nickel » : la mention n’apparaît que si notre fournisseur le garantit.</> },
        { title: 'Comment entretenir ses bijoux ?', text: <>Retirez-les pour vous baigner, faire du sport ou appliquer parfum et crème. Rangez-les séparément, à l’abri de l’air. L’argent se ravive avec un chiffon doux ; évitez les produits abrasifs sur l’émail.</> },
      ],
    },
    alsoSee: [
      { label: 'collier kabyle', to: shop({ recherche: 'collier' }) }, { label: 'bijou en argent', to: shop({ categorie: 'bijoux', recherche: 'argent' }) },
      { label: 'boucles d’oreilles berbères', to: shop({ recherche: 'boucles' }) }, { label: 'bracelet manchette', to: shop({ recherche: 'manchette' }) },
      { label: 'bijou émaillé', to: shop({ recherche: 'émail' }) }, { label: 'bijou corail', to: shop({ recherche: 'corail' }) },
    ],
  },

  beaute: {
    title: 'Boutique de la beauté traditionnelle',
    heroTitle: 'Khôl, aker fassi : la beauté de nos grands-mères',
    heroImage: imageOf('beaute', 'khôl'),
    columns: [
      { title: 'Yeux', image: imageOf('beaute', 'khôl'), groups: [
        { title: 'Khôl', to: shop({ categorie: 'beaute', recherche: 'khôl' }), links: [
          { label: 'Khôl en poudre sans plomb', to: shop({ categorie: 'beaute', recherche: 'khôl' }) },
          { label: 'Mkahla et bâtonnets', to: shop({ categorie: 'beaute', recherche: 'mkahla' }) },
        ] },
      ] },
      { title: 'Lèvres et joues', image: imageOf('beaute', 'aker'), groups: [
        { title: 'Rouges naturels', to: shop({ categorie: 'beaute', recherche: 'aker' }), links: [
          { label: 'Aker fassi', to: shop({ categorie: 'beaute', recherche: 'aker' }) },
          { label: 'Rouges à lèvres', to: shop({ categorie: 'beaute', recherche: 'rouge' }) },
        ] },
      ] },
      { title: 'Offrir', image: imageOf('beaute'), groups: [
        { title: 'Idées cadeaux', to: shop({ categorie: 'beaute' }), links: [
          { label: 'Moins de 20 €', to: shop({ categorie: 'beaute', 'prix-max': '20' }) },
          { label: 'Carte cadeau', to: '/carte-cadeau' },
        ] },
      ] },
      { title: 'Nos engagements', image: imageOf('bijoux'), groups: [
        { title: 'Sécurité', to: '/questions-frequentes', links: [
          { label: 'Sans plomb, formules évaluées', to: '/questions-frequentes' },
          { label: 'Ingrédients sur chaque fiche', to: shop({ categorie: 'beaute' }) },
        ] },
      ] },
    ],
    banner: { text: 'Khôl sans plomb, formules évaluées et notifiées en Europe', cta: { label: 'Voir la beauté traditionnelle', to: shop({ categorie: 'beaute' }) } },
    guide: {
      title: 'Tout savoir sur la beauté traditionnelle',
      intro: 'Le khôl souligne le regard depuis l’Antiquité ; l’aker fassi colore lèvres et joues d’un rouge naturel. Nous les proposons dans des formules sûres, conformes au règlement européen des cosmétiques.',
      sections: [
        { title: 'Pourquoi « sans plomb » ?', text: <>Le khôl traditionnel était fait de <strong>galène</strong>, un minerai de plomb, aujourd’hui interdit dans l’Union européenne car toxique. Nos khôls sont à base de pigments noirs autorisés. Chaque cosmétique vendu ici a fait l’objet d’une évaluation de sécurité et d’une notification européenne.</> },
        { title: 'Comment appliquer le khôl ?', text: <>Humidifiez légèrement le bâtonnet, passez-le dans la poudre et retirez l’excédent. Paupière fermée, faites glisser le bâtonnet entre les cils, de l’intérieur vers l’extérieur. N’appliquez jamais le produit à l’intérieur de l’œil.</> },
        { title: 'Comment utiliser l’aker fassi ?', text: <>Humidifiez le bout du doigt, prélevez un peu de pigment et tapotez sur les lèvres ou les pommettes. Superposez pour intensifier. Faites un essai sur une petite zone avant la première utilisation.</> },
      ],
    },
    alsoSee: [
      { label: 'khôl traditionnel', to: shop({ recherche: 'khôl' }) }, { label: 'aker fassi', to: shop({ recherche: 'aker' }) },
      { label: 'rouge à lèvres naturel', to: shop({ categorie: 'beaute', recherche: 'rouge' }) }, { label: 'beauté berbère', to: shop({ categorie: 'beaute' }) },
    ],
  },
};

export function UniversePage() {
  const { univers = 'maison' } = useParams();
  const id: Id = (['maison', 'bijoux', 'beaute'] as const).includes(univers as Id) ? (univers as Id) : 'maison';
  const u = UNIVERSES[id];
  const { data } = useAsync(listProducts, []);
  const products = data ?? [];
  const hero = u.heroImage(products);

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-6">
      <nav className="text-sm text-henne" aria-label="Fil d’Ariane"><Link to="/" className="hover:text-garance">Accueil</Link> <span className="mx-2">›</span> {u.title}</nav>
      <h1 className="mt-4 text-center font-display text-[2.4rem] sm:text-5xl text-nuit">{u.title}</h1>

      {/* Bannière */}
      <div className="relative mt-8 h-56 sm:h-72 overflow-hidden bg-nuit">
        {hero && <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
        <div className="absolute inset-0 bg-gradient-to-r from-nuit/85 via-nuit/40 to-transparent" />
        <p className="relative h-full flex items-center px-6 sm:px-14 max-w-xl font-display text-laine text-3xl sm:text-5xl leading-tight">{u.heroTitle}</p>
      </div>

      {/* Les étapes */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {u.columns.map((c, i) => (
          <section key={c.title} className="relative bg-white border border-laine-fonce shadow-[0_10px_30px_-20px_rgba(31,36,82,.35)] pt-10 pb-6 px-5">
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-nuit text-laine font-display text-xl flex items-center justify-center ring-4 ring-laine">{i + 1}</span>
            <ProductImage src={c.image(products)} alt="" className="w-full aspect-[4/3]" />
            <h2 className="mt-5 font-display text-2xl text-nuit">{c.title}</h2>
            {c.groups.map((g) => (
              <div key={g.title} className="mt-4">
                <Link to={g.to} className="inline-flex items-center gap-1.5 font-semibold text-garance hover:underline">{g.title} <ArrowRight className="w-4 h-4" /></Link>
                <ul className="mt-2 space-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.label} className="flex gap-2 text-[15px]"><span className="text-garance" aria-hidden>•</span><Link to={l.to} className="hover:text-garance">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>

      {/* Bandeau engagement */}
      <div className="mt-12 bg-menthe text-laine px-6 py-5 flex flex-wrap items-center gap-4 justify-between">
        <p className="font-display text-2xl flex items-center gap-3"><ShieldCheck className="w-7 h-7" /> {u.banner.text}</p>
        <Link to={u.banner.cta.to} className="bg-laine text-menthe rounded-full px-6 py-3 font-semibold uppercase text-sm tracking-wide hover:bg-safran hover:text-nuit">{u.banner.cta.label}</Link>
      </div>

      <Tools id={id} />

      {/* Guide complet */}
      <article className="mt-16 max-w-4xl mx-auto">
        <h2 className="font-display text-[2rem] sm:text-4xl text-nuit text-center">{u.guide.title}</h2>
        <p className="lecture mt-6 text-encre/85">{u.guide.intro}</p>
        {u.guide.sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h3 className="font-display text-2xl text-nuit">{s.title}</h3>
            <div className="lecture mt-2 text-encre/85">{s.text}</div>
          </section>
        ))}
        <div className="mt-10">
          <p className="font-semibold text-nuit">Découvrez également :</p>
          <ul className="mt-3 columns-2 sm:columns-3 gap-6 text-[15px]">
            {u.alsoSee.map((l) => <li key={l.label} className="mb-1.5"><Link to={l.to} className="text-garance hover:underline">{l.label}</Link></li>)}
          </ul>
        </div>
      </article>
    </div>
  );
}

/** « Des outils pour vous guider » : petits assistants de choix selon l'univers. */
function Tools({ id }: { id: Id }) {
  const { openContact } = usePanels();
  const card = 'bg-white border border-laine-fonce p-5 flex gap-5 items-start';
  const iconBox = 'w-20 h-20 shrink-0 flex items-center justify-center bg-laine-fonce/60 text-nuit';
  return (
    <section className="mt-14">
      <h2 className="font-display text-[2rem] sm:text-4xl text-nuit">Des outils pour vous guider</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {id === 'maison' && <><RugSizeFinder /><ColorFinder category="tapis" /></>}
        {id === 'bijoux' && <><BudgetFinder category="bijoux" steps={[30, 50, 100, 200]} /><ColorFinder category="bijoux" /></>}
        {id === 'beaute' && <BudgetFinder category="beaute" steps={[15, 20, 30, 50]} />}
        <div className={card}>
          <div className={iconBox}>{id === 'maison' ? <Scissors className="w-9 h-9" /> : <Gift className="w-9 h-9" />}</div>
          <div>
            <p className="font-display text-2xl text-nuit">{id === 'maison' ? 'Un tapis à vos mesures' : 'Offrir sans se tromper'}</p>
            <p className="text-henne mt-1">{id === 'maison' ? 'Dimensions, couleurs, motifs : nous le tissons pour vous.' : 'La carte cadeau, valable sur toute la boutique pendant un an.'}</p>
            <Link to={id === 'maison' ? '/sur-mesure' : '/carte-cadeau'} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-garance hover:underline">{id === 'maison' ? 'Demander un devis' : 'Choisir une carte'} <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
        <div className={card}>
          <div className={iconBox}><BookOpen className="w-9 h-9" /></div>
          <div>
            <p className="font-display text-2xl text-nuit">Feuilletez le catalogue</p>
            <p className="text-henne mt-1">Toutes nos pièces, en ligne ou en version papier reçue chez vous.</p>
            <Link to="/catalogue" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-garance hover:underline">Ouvrir le catalogue <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
        <div className={card}>
          <div className={iconBox}><MessageCircle className="w-9 h-9" /></div>
          <div>
            <p className="font-display text-2xl text-nuit">Un conseil de l’atelier</p>
            <p className="text-henne mt-1">Une question sur une pièce, une photo de votre intérieur ? Nous vous répondons.</p>
            <button onClick={() => openContact('contact')} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-garance hover:underline">Nous écrire <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Taille de tapis conseillée à partir des dimensions de la pièce (60 cm de sol visible de chaque côté). */
function RugSizeFinder() {
  const navigate = useNavigate();
  const [w, setW] = useState('');
  const [l, setL] = useState('');
  const W = parseInt(w, 10), L = parseInt(l, 10);
  const ok = W > 100 && L > 100;
  const rugW = ok ? Math.max(60, Math.min(W, L) - 120) : 0;
  const rugL = ok ? Math.max(90, Math.max(W, L) - 120) : 0;
  const size = rugL <= 150 ? 'petit' : rugL < 250 ? 'moyen' : 'grand';
  function go(e: FormEvent) { e.preventDefault(); if (ok) navigate(shop({ categorie: 'tapis', taille: size })); }
  return (
    <form onSubmit={go} className="bg-white border border-laine-fonce p-5 flex gap-5 items-start md:col-span-2 lg:col-span-1">
      <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-laine-fonce/60 text-nuit"><Ruler className="w-9 h-9" /></div>
      <div className="flex-1">
        <p className="font-display text-2xl text-nuit">Trouvez la taille de votre tapis</p>
        <p className="text-henne mt-1">Indiquez les dimensions de la pièce, en centimètres.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input inputMode="numeric" value={w} onChange={(e) => setW(e.target.value.replace(/\D/g, ''))} placeholder="Largeur" aria-label="Largeur de la pièce en cm" className="w-28 px-3 py-2.5 border border-laine-fonce" />
          <span className="text-henne">×</span>
          <input inputMode="numeric" value={l} onChange={(e) => setL(e.target.value.replace(/\D/g, ''))} placeholder="Longueur" aria-label="Longueur de la pièce en cm" className="w-28 px-3 py-2.5 border border-laine-fonce" />
          <button disabled={!ok} className="w-12 h-12 rounded-full bg-nuit text-laine font-semibold disabled:opacity-40">OK</button>
        </div>
        {ok && <p className="mt-2 text-sm text-menthe">Taille conseillée : environ {rugW} × {rugL} cm.</p>}
      </div>
    </form>
  );
}

function ColorFinder({ category }: { category: string }) {
  return (
    <div className="bg-white border border-laine-fonce p-5 flex gap-5 items-start">
      <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-laine-fonce/60 text-nuit"><Sparkles className="w-9 h-9" /></div>
      <div>
        <p className="font-display text-2xl text-nuit">Choisissez par couleur</p>
        <p className="text-henne mt-1">Touchez une couleur pour voir les pièces correspondantes.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <Link key={c.id} to={shop({ categorie: category, couleur: c.id })} title={c.label} aria-label={c.label}
              className="w-9 h-9 rounded-full border border-black/15 hover:scale-110 transition-transform" style={{ background: c.hex }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetFinder({ category, steps }: { category: string; steps: number[] }) {
  return (
    <div className="bg-white border border-laine-fonce p-5 flex gap-5 items-start">
      <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-laine-fonce/60 text-nuit"><Gift className="w-9 h-9" /></div>
      <div>
        <p className="font-display text-2xl text-nuit">Trouvez selon votre budget</p>
        <p className="text-henne mt-1">Pour vous faire plaisir ou pour offrir.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((s) => <Link key={s} to={shop({ categorie: category, 'prix-max': String(s) })} className="px-4 py-2 rounded-full border-2 border-nuit text-nuit font-medium hover:bg-nuit hover:text-laine">Moins de {s} €</Link>)}
        </div>
      </div>
    </div>
  );
}
