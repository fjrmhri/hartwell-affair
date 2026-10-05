import { useState } from 'react';
import { useGame, P } from '../store';
import { asset } from '../asset';
import { pengecohTerbantah } from '../engine/aksi';
import { IconEvidence, IconMagnify, IconHint, IconDialog, IconLock, IconNotebook, IconBoard, IconSwap, IconAlert } from './Icons';

const K = P.kasus;
const CATS = [
  { key: 'bukti', label: 'Bukti', Icon: IconEvidence },
  { key: 'keterangan', label: 'Keterangan', Icon: IconDialog },
  { key: 'deduksi', label: 'Deduksi', Icon: IconMagnify },
  { key: 'petunjuk', label: 'Petunjuk', Icon: IconHint },
  { key: 'temuan', label: 'Temuan', Icon: IconNotebook },
];

// Kategori dari awalan teks catatan yang ditulis engine (Bukti/Keterangan/Deduksi/Dugaan/Teka-teki/Petunjuk)
function classify(t) {
  const pola = [
    [/^(Bukti E\d+):\s*/, 'bukti'], [/^(Keterangan K\d+):\s*/, 'keterangan'], [/^(Deduksi D\d+):\s*/, 'deduksi'],
    [/^(Dugaan F\d+):\s*/, 'deduksi'], [/^(Teka-teki P\d+):\s*/, 'deduksi'], [/^(Petunjuk):\s*/, 'petunjuk'],
  ];
  for (const [re, cat] of pola) { const m = t.match(re); if (m) return { cat, head: m[1], text: t.slice(m[0].length) }; }
  return { cat: 'temuan', head: 'Temuan', text: t };
}

function Thumb({ id, collected, openDoc }) {
  const e = K.bukti.find((x) => x.id === id);
  if (!e) return <span className="nb-thumb nb-thumb--static nb-thumb--k"><span>{id}</span></span>;
  const img = <img src={asset(e.gambar)} alt="" />;
  return collected
    ? <button type="button" className="nb-thumb" onClick={() => openDoc(id)} aria-label={`Baca ${e.nama}`}>{img}<span>{id}</span></button>
    : <span className="nb-thumb nb-thumb--static">{img}<span>{id}</span></span>;
}

export default function Notebook() {
  const s = useGame();
  const { catatan, deduksi, bukti, diff, openDoc } = s;
  const [filter, setFilter] = useState('all');
  const need = K.config.kesulitan[diff].deduksiWajib;
  const all = P.deduksi.benar.length;
  const done = deduksi.length;
  const entries = catatan.map((t) => ({ t, ...classify(t) }));
  const count = (k) => entries.filter((x) => x.cat === k).length;
  const shown = filter === 'all' ? entries : entries.filter((x) => x.cat === filter);
  const catOf = (k) => CATS.find((c) => c.key === k);
  const dugaan = P.deduksi.pengecoh.filter((f) => s.pengecoh.includes(f.id));

  return (
    <div className="nb">
      <section className="nb-ded" aria-labelledby="nb-ded-title">
        <div className="nb-ded__head">
          <h3 id="nb-ded-title">Deduksi</h3>
          <span className="nb-ded__count">{done} dari {all} terbuka</span>
        </div>
        <div className="nb-prog" role="progressbar" aria-valuemin={0} aria-valuemax={all} aria-valuenow={done} aria-label={`${done} dari ${all} deduksi terbuka`}>
          {Array.from({ length: all }, (_, i) => <i key={i} className={`${i < done ? 'on' : ''}${i === need - 1 ? ' req' : ''}`} />)}
        </div>
        <p className={`nb-need${done >= need ? ' nb-need--ok' : ''}`}>
          {done >= need ? `Syarat menuduh terpenuhi (${need} deduksi).` : `Butuh ${need} deduksi untuk menuduh. Kurang ${need - done}.`}
        </p>
        <ul className="nb-dlist">
          {P.deduksi.benar.map((d) => (deduksi.includes(d.id) ? (
            <li key={d.id} className="nb-dcard">
              <div className="nb-dcard__text">
                <b className="nb-dcard__title">{d.id} · {d.judul}</b>
                <span className="nb-dcard__concl">{d.kesimpulan}</span>
              </div>
              {d.kartu.length > 0 && (
                <div className="nb-dcard__links" aria-label="Kartu terkait">
                  {d.kartu.map((id, i) => (
                    <span key={id} className="nb-dcard__pair">
                      {i > 0 && <span className="nb-dcard__arrow" aria-hidden="true"><IconSwap /></span>}
                      <Thumb id={id} collected={bukti.includes(id)} openDoc={openDoc} />
                    </span>
                  ))}
                </div>
              )}
            </li>
          ) : (
            <li key={d.id} className="nb-dlock"><IconLock /><span>Deduksi terkunci</span><span className="sr-only"> (hubungkan kartu di tab Papan atau pecahkan teka-teki di tab Analisis)</span></li>
          )))}
        </ul>
        {dugaan.length > 0 && (
          <>
            <h4 className="nb-sub">Dugaan (bisa keliru)</h4>
            <ul className="nb-dlist">
              {dugaan.map((f) => {
                const runtuh = pengecohTerbantah(f, s);
                return (
                  <li key={f.id} className={`nb-dcard nb-dcard--dugaan${runtuh ? ' is-runtuh' : ''}`}>
                    <div className="nb-dcard__text">
                      <b className="nb-dcard__title"><IconAlert /> {f.judul} {runtuh && <span className="nb-tag">Terbantah</span>}</b>
                      <span className="nb-dcard__concl">{runtuh ? `Dibantah oleh ${f.dibantahOleh.join(' dan ')}.` : f.kesimpulan}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="nb-tip"><IconBoard /> Hubungkan dua atau tiga kartu di tab Papan untuk membuka deduksi.</p>
      </section>

      <section className="nb-book" aria-labelledby="nb-book-title">
        <h3 id="nb-book-title" className="nb-book__title"><IconNotebook /> Buku Catatan</h3>
        <div className="nb-tabs" role="group" aria-label="Saring catatan">
          <button type="button" className="nb-tab" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Semua <span className="nb-tab__n">{entries.length}</span></button>
          {CATS.map((c) => (
            <button key={c.key} type="button" className="nb-tab" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
              {c.label} <span className="nb-tab__n">{count(c.key)}</span>
            </button>
          ))}
        </div>
        <div className="nb-paper">
          {!shown.length && (
            <div className="nb-empty"><IconNotebook /><p>{entries.length ? 'Belum ada catatan di kategori ini.' : 'Belum ada catatan. Temuan, bukti, dan petunjuk akan tercatat di sini.'}</p></div>
          )}
          <ul className="nb-list">
            {shown.map((x, i) => {
              const { Icon } = catOf(x.cat);
              return (
                <li key={`${i}-${x.t.slice(0, 12)}`} className={`nb-entry nb-entry--${x.cat}`}>
                  <span className="nb-entry__icon"><Icon /></span>
                  <div className="nb-entry__body"><span className="nb-entry__head">{x.head}</span><p className="nb-entry__text">{x.text}</p></div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
