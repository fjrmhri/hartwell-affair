import { useState } from 'react';
import { useGame } from '../store';
import { asset } from '../asset';
import C from '../data/case.json';
import { IconEvidence } from './Icons';

// Jenis bukti di case.json sudah berbahasa Indonesia; ini hanya merapikan huruf kapital.
export const TYPE_LABEL = { dokumen: 'Dokumen', benda: 'Benda', foto: 'Foto', laporan: 'Laporan' };
export const typeLabel = (t) => TYPE_LABEL[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Lainnya');
const typeOrder = Object.keys(TYPE_LABEL);

export default function Evidence() {
  const s = useGame();
  const [filter, setFilter] = useState('all');
  const total = C.evidence.length;
  const found = s.evidence.map((id) => C.evidence.find((x) => x.id === id)).filter(Boolean);
  const types = [...new Set(found.map((e) => e.type))]
    .sort((a, b) => (typeOrder.indexOf(a) + 1 || 99) - (typeOrder.indexOf(b) + 1 || 99));
  const active = types.includes(filter) ? filter : 'all';
  const shown = active === 'all' ? found : found.filter((e) => e.type === active);
  const missing = Math.max(0, total - found.length);

  return (
    <div className="ev">
      <h3>Bukti Terkumpul ({found.length}/{total})</h3>
      <p className="muted ev-lead">Klik sebuah berkas untuk membaca isi lengkapnya.</p>

      {types.length > 0 && (
        <div className="ev-filters" role="group" aria-label="Saring bukti menurut jenis">
          <button type="button" className="ev-chip" aria-pressed={active === 'all'} onClick={() => setFilter('all')}>
            Semua <span className="ev-chip__n">{found.length}</span>
          </button>
          {types.map((t) => (
            <button key={t} type="button" className="ev-chip" aria-pressed={active === t} onClick={() => setFilter(t)}>
              {typeLabel(t)} <span className="ev-chip__n">{found.filter((e) => e.type === t).length}</span>
            </button>
          ))}
        </div>
      )}

      {!found.length && (
        <div className="ev-empty">
          <IconEvidence />
          <p>Belum ada bukti. Jelajahi lokasi di tab Peta.</p>
        </div>
      )}

      <div className="ev-grid">
        {shown.map((e) => (
          <button key={e.id} type="button" className="ev-card" onClick={() => s.openDoc(e.id)}>
            <span className="ev-card__photo"><img src={asset(e.image)} alt="" /></span>
            <span className="ev-card__meta">
              <span className="ev-card__id">{e.id}</span>
              <span className="ev-card__type">{typeLabel(e.type)}</span>
            </span>
            <span className="ev-card__name">{e.name}</span>
            <span className="ev-card__loc">{C.locations[e.location]?.name || e.location}</span>
          </button>
        ))}
        {active === 'all' && Array.from({ length: missing }, (_, i) => (
          <div key={`slot${i}`} className="ev-slot" aria-hidden="true"><span>?</span></div>
        ))}
      </div>
      {missing > 0 && <p className="muted ev-missing">{missing} bukti lagi belum ditemukan.</p>}
    </div>
  );
}
