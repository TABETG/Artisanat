import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, Phone } from 'lucide-react';
import { adminListCustomRequests, adminListProducts, updateCustomRequest } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';
import { CUSTOM_STATUS, CustomRequest, CustomStatus } from '../../types';
import { Field, Select, Textarea, Toast } from './ui';
import { SHOP } from '../../config';

type Filter = 'open' | 'all' | CustomStatus;

export function AdminCustomRequests() {
  const { data, loading, error, setData } = useAsync(() => Promise.all([adminListCustomRequests(), adminListProducts()]), []);
  const [filter, setFilter] = useState<Filter>('open');
  const [openId, setOpenId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const [requests, products] = data;
  const isOpen = (r: CustomRequest) => r.status === 'new' || r.status === 'quoted' || r.status === 'accepted';
  const list = requests.filter((r) => filter === 'all' || (filter === 'open' ? isOpen(r) : r.status === filter));

  function saved(r: CustomRequest) {
    setData((d) => d && [d[0].map((x) => (x.id === r.id ? r : x)), d[1]]);
    setToast('Demande mise à jour'); setTimeout(() => setToast(null), 2500);
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-nuit">Demandes sur mesure</h1>
      <p className="text-stone-500 mt-1">Les clients décrivent la pièce souhaitée depuis la page « Sur mesure » ou une fiche produit.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {([['open', 'En cours'], ['new', 'Nouvelles'], ['quoted', 'Devis envoyé'], ['accepted', 'En fabrication'], ['done', 'Terminées'], ['all', 'Toutes']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`px-3.5 py-2 rounded-md text-sm ${filter === f ? 'bg-nuit text-laine' : 'bg-white border border-stone-200'}`}>
            {label} <span className="opacity-60">{requests.filter((r) => f === 'all' || (f === 'open' ? isOpen(r) : r.status === f)).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">Aucune demande dans cette liste.</p>}
      <ul className="mt-5 space-y-3">
        {list.map((r) => {
          const p = products.find((x) => x.id === r.product_id);
          return (
            <li key={r.id} className="bg-white rounded-lg border border-stone-200">
              <button onClick={() => setOpenId(openId === r.id ? null : r.id)} aria-expanded={openId === r.id} className="w-full p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-left">
                <span className="font-medium">{r.name}</span>
                <span className={`text-sm px-2.5 py-0.5 rounded ${CUSTOM_STATUS[r.status].tone}`}>{CUSTOM_STATUS[r.status].label}</span>
                {r.width_cm && r.length_cm && <span className="text-sm text-stone-600">{r.width_cm} × {r.length_cm} cm</span>}
                {r.budget && <span className="text-sm text-stone-600">{r.budget}</span>}
                <span className="ml-auto text-sm text-stone-400">{formatDate(r.created_at)}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openId === r.id ? 'rotate-180' : ''}`} />
              </button>
              {openId === r.id && <Detail request={r} productName={p?.name} productId={p?.id} onSaved={saved} />}
            </li>
          );
        })}
      </ul>
      <Toast message={toast} />
    </div>
  );
}

function Detail({ request: r, productName, productId, onSaved }: { request: CustomRequest; productName?: string; productId?: string; onSaved: (r: CustomRequest) => void }) {
  const [status, setStatus] = useState<CustomStatus>(r.status);
  const [note, setNote] = useState(r.note ?? '');
  const [saving, setSaving] = useState(false);
  const subject = encodeURIComponent('Votre projet de tapis sur mesure');
  const body = encodeURIComponent(`Bonjour ${r.name},\n\nMerci pour votre demande${r.width_cm && r.length_cm ? ` d’un tapis de ${r.width_cm} × ${r.length_cm} cm` : ''}.\n\nNotre proposition :\n- Prix : … €\n- Délai de fabrication : … semaines\n\nN’hésitez pas à nous envoyer une photo de la pièce.\n\n${SHOP.name}`);

  async function save() {
    setSaving(true);
    await updateCustomRequest(r.id, { status, note: note.trim() || null });
    setSaving(false);
    onSaved({ ...r, status, note: note.trim() || null });
  }

  return (
    <div className="border-t border-stone-200 p-4 sm:p-5 grid gap-6 md:grid-cols-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px] content-start">
        {productName && <><dt className="text-stone-500">Inspiré de</dt><dd><Link to={`/admin/produits/${productId}`} className="underline">{productName}</Link></dd></>}
        {r.room && <><dt className="text-stone-500">Pièce</dt><dd>{r.room}</dd></>}
        {r.width_cm && r.length_cm && <><dt className="text-stone-500">Dimensions</dt><dd>{r.width_cm} × {r.length_cm} cm</dd></>}
        {r.colors && <><dt className="text-stone-500">Couleurs</dt><dd>{r.colors}</dd></>}
        {r.budget && <><dt className="text-stone-500">Budget</dt><dd>{r.budget}</dd></>}
        {r.message && <><dt className="text-stone-500">Projet</dt><dd className="whitespace-pre-line">{r.message}</dd></>}
        <dt className="text-stone-500">Contact</dt>
        <dd className="space-y-1">
          <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-garance underline break-all"><Mail className="w-4 h-4" />{r.email}</a>
          {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-garance underline"><Phone className="w-4 h-4" />{r.phone}</a>}
        </dd>
      </dl>
      <div className="space-y-4">
        <Field label="Étape">
          <Select value={status} onChange={(e) => setStatus(e.target.value as CustomStatus)}>
            {(Object.keys(CUSTOM_STATUS) as CustomStatus[]).map((s) => <option key={s} value={s}>{CUSTOM_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <Field label="Note interne" optional hint="Prix proposé, délai, avancement de la fabrication…">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={saving} className="bg-nuit text-laine px-6 py-3 rounded-md hover:bg-garance disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          <a href={`mailto:${r.email}?subject=${subject}&body=${body}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-stone-300"><Mail className="w-4 h-4" /> Envoyer un devis</a>
        </div>
      </div>
    </div>
  );
}
