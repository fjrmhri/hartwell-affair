import { useEffect, useRef, useState } from 'react';
import { useGame, P } from '../store';
import { cekSyarat } from '../engine/kondisi';
import { asset } from '../asset';
import ConfirmDialog from './ConfirmDialog';
import { IconCheck, IconClose } from './Icons';

const K = P.kasus;
const namaItem = (id) => K.bukti.find((b) => b.id === id)?.nama || K.kartu[id]?.nama || P.deduksi.benar.find((d) => d.id === id)?.judul || id;

function SlotTokoh({ slot, nilai, ubah }) {
  const maks = slot.jumlah[1];
  const tog = (id) => {
    if (maks === 1) return ubah([id]);
    ubah(nilai.includes(id) ? nilai.filter((x) => x !== id) : nilai.filter((x) => K.tokoh[x]).length < maks ? [...nilai, id] : nilai);
  };
  return (
    <>
      <div className="tdh-tokoh" role="group" aria-label={slot.pertanyaan}>
        {Object.entries(K.tokoh).map(([id, t]) => (
          <button key={id} type="button" className={`acc-card${nilai.includes(id) ? ' acc-card--on' : ''}`} aria-pressed={nilai.includes(id)} onClick={() => tog(id)}>
            <span className="acc-card__photo"><img src={asset(t.potret.tenang)} alt="" />{nilai.includes(id) && <span className="acc-card__mark"><IconCheck /></span>}</span>
            <span className="acc-card__name">{t.nama}</span>
          </button>
        ))}
      </div>
      {(slot.tambahan || []).map((x) => (
        <label key={x.id} className="tdh-cek">
          <input type="checkbox" checked={nilai.includes(x.id)} onChange={(e) => ubah(e.target.checked ? [...nilai, x.id] : nilai.filter((y) => y !== x.id))} /> {x.teks}
        </label>
      ))}
    </>
  );
}

function SlotKartu({ slot, nilai, ubah, s }) {
  const maks = slot.jumlah[1];
  const pilihan = [...s.bukti, ...s.kartu, ...(slot.jenis === 'kartuDeduksi' ? s.deduksi : [])];
  const tog = (id) => ubah(nilai.includes(id) ? nilai.filter((x) => x !== id) : nilai.length < maks ? [...nilai, id] : nilai);
  return (
    <div className="ks-picker" role="group" aria-label={slot.pertanyaan}>
      {pilihan.map((id) => (
        <button key={id} type="button" className="ks-pick" aria-pressed={nilai.includes(id)} onClick={() => tog(id)} title={namaItem(id)}>
          <b>{id}</b> <span>{namaItem(id)}</span>
        </button>
      ))}
    </div>
  );
}

function SlotPernyataan({ slot, nilai, ubah }) {
  return (
    <div className="tt-opsi" role="radiogroup" aria-label={slot.pertanyaan}>
      {slot.opsi.map((o) => (
        <label key={o.id} className={`tt-op${nilai.includes(o.id) ? ' is-on' : ''}`}>
          <input type="radio" name={slot.id} checked={nilai.includes(o.id)} onChange={() => ubah([o.id])} /> {o.teks}
        </label>
      ))}
    </div>
  );
}

export default function Tuduhan() {
  const s = useGame();
  const [jawab, setJawab] = useState({});
  const [moral, setMoral] = useState({});
  const [konfirmasi, setKonfirmasi] = useState(false);
  const ref = useRef(null);
  const morals = (P.tuduhan.moral || []).filter((m) => cekSyarat(m.syarat, s, P));
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && !konfirmasi) s.tutupTuduhan(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  const kurang = P.tuduhan.slot.filter((sl) => (jawab[sl.id] || []).filter((x) => sl.jenis !== 'tokoh' || K.tokoh[x]).length < sl.jumlah[0]);
  const moralKurang = morals.filter((m) => !moral[m.id]);
  const siap = !kurang.length && !moralKurang.length;
  const ubah = (id) => (v) => setJawab((j) => ({ ...j, [id]: v }));

  return (
    <div className="modal tdh-modal" role="dialog" aria-modal="true" aria-labelledby="tdh-title">
      <div className="tdh" ref={ref} tabIndex={-1}>
        <header className="tdh-head">
          <h2 id="tdh-title">Surat Tuduhan</h2>
          <button type="button" className="ctrl-icon" aria-label="Tutup, kembali menyelidiki" onClick={() => s.tutupTuduhan()}><IconClose /></button>
        </header>
        <p className="muted">Kepada Kepala Kepolisian Ravenport. Tuduhan tidak bisa ditarik kembali. Waktu tidak berjalan selama Anda menyusun surat ini.</p>
        {P.tuduhan.slot.map((sl, i) => (
          <section key={sl.id} className="tdh-slot" aria-labelledby={`slot-${sl.id}`}>
            <h3 id={`slot-${sl.id}`}><span className="tdh-no">{i + 1}</span> {sl.judul}</h3>
            <p className="tdh-q">{sl.pertanyaan} {sl.jumlah[1] > 1 && <small>(pilih hingga {sl.jumlah[1]})</small>}</p>
            {sl.jenis === 'tokoh' && <SlotTokoh slot={sl} nilai={jawab[sl.id] || []} ubah={ubah(sl.id)} />}
            {(sl.jenis === 'kartu' || sl.jenis === 'kartuDeduksi') && <SlotKartu slot={sl} nilai={jawab[sl.id] || []} ubah={ubah(sl.id)} s={s} />}
            {sl.jenis === 'pernyataan' && <SlotPernyataan slot={sl} nilai={jawab[sl.id] || []} ubah={ubah(sl.id)} />}
          </section>
        ))}
        {morals.map((m) => (
          <section key={m.id} className="tdh-slot tdh-slot--moral" aria-labelledby={`moral-${m.id}`}>
            <h3 id={`moral-${m.id}`}>{m.judul}</h3>
            <p className="tdh-q">{m.pertanyaan} Pilihan ini tidak memengaruhi skor, hanya akhir cerita.</p>
            <div className="tt-opsi" role="radiogroup" aria-label={m.pertanyaan}>
              {m.opsi.map((o) => (
                <label key={o.id} className={`tt-op${moral[m.id] === o.id ? ' is-on' : ''}`}>
                  <input type="radio" name={m.id} checked={moral[m.id] === o.id} onChange={() => setMoral((x) => ({ ...x, [m.id]: o.id }))} /> {o.teks}
                </label>
              ))}
            </div>
          </section>
        ))}
        <footer className="tdh-foot">
          <span className="muted">{siap ? 'Surat siap diajukan.' : `Belum lengkap: ${[...kurang.map((x) => x.judul), ...moralKurang.map((m) => m.judul)].join(', ')}.`}</span>
          <button type="button" className="btn btn--secondary" onClick={() => s.tutupTuduhan()}>Kembali menyelidiki</button>
          <button type="button" className="btn btn--danger" disabled={!siap} onClick={() => setKonfirmasi(true)}>Ajukan tuduhan</button>
        </footer>
      </div>
      <ConfirmDialog
        open={konfirmasi}
        title="Ajukan tuduhan?"
        body="Tuduhan tidak dapat ditarik kembali. Kasus akan berakhir sesuai penalaran Anda."
        confirmLabel="Ya, ajukan"
        cancelLabel="Periksa lagi"
        danger
        onConfirm={() => { setKonfirmasi(false); s.accuse({ ...jawab, moral }); }}
        onCancel={() => setKonfirmasi(false)}
      />
    </div>
  );
}
