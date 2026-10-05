import { useState } from 'react';
import { useGame, P } from '../store';
import { asset } from '../asset';
import { IconEvidence, IconDialog } from './Icons';

const K = P.kasus;
export const TYPE_LABEL = { dokumen: 'Dokumen', benda: 'Benda', foto: 'Foto', laporan: 'Laporan' };
export const typeLabel = (t) => TYPE_LABEL[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Lainnya');
const typeOrder = Object.keys(TYPE_LABEL);

export default function Evidence() {
  const s = useGame();
  const [filter, setFilter] = useState('all');
  const total = K.bukti.length;
  const found = s.bukti.map((id) => K.bukti.find((x) => x.id === id)).filter(Boolean);
  const types = [...new Set(found.map((e) => e.jenis))]
    .sort((a, b) => (typeOrder.indexOf(a) + 1 || 99) - (typeOrder.indexOf(b) + 1 || 99));
  const active = filter === 'kartu' || types.includes(filter) ? filter : 'all';
  const shown = active === 'all' ? found : found.filter((e) => e.jenis === active);
  const missing = Math.max(0, total - found.length - s.hilang.length);
  const lokasiNama = (e) => (e.lokasi ? K.lokasi[e.lokasi]?.nama : 'Diserahkan langsung');

  return (
    <div className="ev">
      <h3>Bukti Terkumpul ({found.length}/{total})</h3>
      <p className="muted ev-lead">Klik sebuah berkas untuk membaca isi lengkapnya. Keterangan saksi (K) bisa disodorkan dalam kesaksian dan dihubungkan di Papan seperti bukti fisik.</p>

      <div className="ev-filters" role="group" aria-label="Saring bukti menurut jenis">
        <button type="button" className="ev-chip" aria-pressed={active === 'all'} onClick={() => setFilter('all')}>
          Semua <span className="ev-chip__n">{found.length}</span>
        </button>
        {types.map((t) => (
          <button key={t} type="button" className="ev-chip" aria-pressed={active === t} onClick={() => setFilter(t)}>
            {typeLabel(t)} <span className="ev-chip__n">{found.filter((e) => e.jenis === t).length}</span>
          </button>
        ))}
        <button type="button" className="ev-chip" aria-pressed={active === 'kartu'} onClick={() => setFilter('kartu')}>
          Keterangan <span className="ev-chip__n">{s.kartu.length}</span>
        </button>
      </div>

      {active === 'kartu' ? (
        <div className="ev-kartu">
          {!s.kartu.length && <p className="muted">Belum ada keterangan saksi. Keterangan penting dari interogasi akan tercatat di sini.</p>}
          {s.kartu.map((id) => {
            const k = K.kartu[id];
            return (
              <button key={id} type="button" className="ev-kcard" onClick={() => s.openDoc(id)}>
                <span className="ev-kcard__head"><IconDialog /> <b>{id}</b> {K.tokoh[k.tokoh]?.nama}</span>
                <span className="ev-kcard__name">{k.nama}</span>
                <span className="ev-kcard__text">{k.teks}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {!found.length && (
            <div className="ev-empty"><IconEvidence /><p>Belum ada bukti. Jelajahi lokasi di tab Peta.</p></div>
          )}
          <div className="ev-grid">
            {shown.map((e) => (
              <button key={e.id} type="button" className="ev-card" onClick={() => s.openDoc(e.id)}>
                <span className="ev-card__photo"><img src={asset(e.gambar)} alt="" /></span>
                <span className="ev-card__meta"><span className="ev-card__id">{e.id}</span><span className="ev-card__type">{typeLabel(e.jenis)}</span></span>
                <span className="ev-card__name">{e.nama}</span>
                <span className="ev-card__loc">{lokasiNama(e)}</span>
              </button>
            ))}
            {active === 'all' && s.hilang.map((id) => (
              <div key={id} className="ev-slot ev-slot--lost" title="Bukti ini hilang sebelum sempat diamankan"><span>Hilang</span></div>
            ))}
            {active === 'all' && Array.from({ length: missing }, (_, i) => (
              <div key={`slot${i}`} className="ev-slot" aria-hidden="true"><span>?</span></div>
            ))}
          </div>
          {missing > 0 && <p className="muted ev-missing">{missing} bukti lagi belum ditemukan.</p>}
          {s.hilang.length > 0 && <p className="muted ev-missing">{s.hilang.length} bukti hilang karena Anda terlambat.</p>}
        </>
      )}
    </div>
  );
}
