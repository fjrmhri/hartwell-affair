import { useState } from 'react';
import { useGame, P } from '../store';
import { tekaTekiTersedia, vigenere, normalSandi, selKunciSalah } from '../engine/aksi';
import { IconMagnify, IconCheck, IconLock, IconAlert } from './Icons';

const K = P.kasus;
const namaTokoh = (t, id) => t.namaTokoh?.[id] || K.tokoh[id]?.nama || id;

function Pilihan({ t, jawab }) {
  const [pilih, setPilih] = useState(null);
  return (
    <div className="tt">
      <table className="tt-data"><tbody>{t.data.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
      <p className="tt-q">{t.pertanyaan}</p>
      <div className="tt-opsi" role="radiogroup" aria-label={t.pertanyaan}>
        {t.opsi.map((o) => (
          <label key={o.id} className={`tt-op${pilih === o.id ? ' is-on' : ''}`}>
            <input type="radio" name={t.id} checked={pilih === o.id} onChange={() => setPilih(o.id)} /> {o.teks}
          </label>
        ))}
      </div>
      <button type="button" className="btn btn--primary" disabled={!pilih} onClick={() => jawab(pilih)}>Periksa jawaban (salah: −{t.menitSalah} mnt)</button>
    </div>
  );
}

function Sandi({ t, jawab, terpecah }) {
  const [kunci, setKunci] = useState('');
  const k = normalSandi(kunci);
  return (
    <div className="tt">
      <label className="tt-kunci">Kunci: <input value={kunci} onChange={(e) => setKunci(e.target.value)} placeholder="ketik kata kunci" autoComplete="off" spellCheck="false" /></label>
      <p className="muted tt-note">Teks di bawah berubah mengikuti kunci yang Anda ketik. Tidak ada biaya waktu untuk mencoba.</p>
      {t.halaman.map((h) => {
        const sandi = vigenere(h.teks, t.kunci, 1);
        const tampil = terpecah ? h.teks : (k ? vigenere(sandi, k, -1) : sandi);
        return (
          <div key={h.judul} className="tt-halaman">
            <b>{h.judul}</b>
            <p className="tt-sandi">{tampil}</p>
          </div>
        );
      })}
      {!terpecah && <button type="button" className="btn btn--primary" disabled={!k} onClick={() => jawab(kunci)}>Gunakan kunci ini</button>}
    </div>
  );
}

function Grid({ t, jawab }) {
  const [isi, setIsi] = useState({});
  const [salah, setSalah] = useState([]);
  const kirim = () => { setSalah(selKunciSalah(t, isi)); jawab(isi); };
  return (
    <div className="tt">
      <ul className="tt-data-list">{t.petunjukData.map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="tt-grid">
        {t.baris.map((b) => (
          <label key={b} className={`tt-row${salah.includes(b) ? ' is-salah' : ''}`}>
            <span>Saluran {b}</span>
            <select value={isi[b] || ''} onChange={(e) => setIsi({ ...isi, [b]: e.target.value })}>
              <option value="">Pilih ruangan</option>
              {t.opsi.map((o) => <option key={o.id} value={o.id}>{o.teks}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button type="button" className="btn btn--primary" disabled={t.baris.some((b) => !isi[b])} onClick={kirim}>Periksa pemetaan (salah: −{t.menitSalah} mnt)</button>
    </div>
  );
}

function GarisWaktu({ t, jawab }) {
  const [isi, setIsi] = useState({});
  const [salah, setSalah] = useState([]);
  // Sel yang salah ditandai hanya bila pemain sudah mengisinya; sel kosong tidak dihukum dua kali
  const kirim = () => { setSalah(selKunciSalah(t, isi).filter((k) => isi[k] && isi[k] !== 'tidak_diketahui')); jawab(isi); };
  return (
    <div className="tt">
      <div className="tt-tl" role="table" aria-label={t.nama}>
        <div className="tt-tl__row tt-tl__head" role="row">
          <span role="columnheader">Orang</span>{t.slot.map((sl) => <span key={sl} role="columnheader">{sl}</span>)}
        </div>
        {t.tokoh.map((tok) => (
          <div key={tok} className="tt-tl__row" role="row">
            <span role="rowheader">{namaTokoh(t, tok)}</span>
            {t.slot.map((sl) => {
              const kunci = `${tok}|${sl}`;
              return (
                <span key={sl} role="cell" className={salah.includes(kunci) ? 'is-salah' : ''}>
                  <select aria-label={`${namaTokoh(t, tok)} pukul ${sl}`} value={isi[kunci] || 'tidak_diketahui'} onChange={(e) => setIsi({ ...isi, [kunci]: e.target.value })}>
                    {t.opsi.map((o) => <option key={o.id} value={o.id}>{o.teks}</option>)}
                  </select>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--primary" onClick={kirim}>Periksa garis waktu (salah: −{t.menitSalah} mnt)</button>
    </div>
  );
}

const PANEL = { pilihan: Pilihan, sandi: Sandi, grid: Grid, garisWaktu: GarisWaktu };

export default function Analisis() {
  const s = useGame();
  const tersedia = P.tekaTeki.filter((t) => tekaTekiTersedia(t, s, P));
  const selesai = P.tekaTeki.filter((t) => s.tekaTeki.includes(t.id));
  const terkunci = P.tekaTeki.length - tersedia.length - selesai.length;
  const [buka, setBuka] = useState(tersedia[0]?.id || null);
  const daftar = [...tersedia, ...selesai];
  const t = daftar.find((x) => x.id === buka) || daftar[0];

  return (
    <div className="an">
      <h3>Analisis</h3>
      <p className="muted">Teka-teki terbuka saat bukti yang dibutuhkan sudah terkumpul. Jawaban yang salah memakan waktu dan mengurangi skor.</p>
      <div className="an-list" role="group" aria-label="Pilih teka-teki">
        {daftar.map((x) => (
          <button key={x.id} type="button" className="an-chip" aria-pressed={t?.id === x.id} onClick={() => setBuka(x.id)}>
            {s.tekaTeki.includes(x.id) ? <IconCheck /> : <IconMagnify />} {x.nama}
          </button>
        ))}
        {terkunci > 0 && <span className="an-chip an-chip--lock"><IconLock /> {terkunci} terkunci</span>}
      </div>
      {!t && <div className="an-empty"><IconAlert /><p>Belum ada teka-teki. Kumpulkan bukti medis dan dokumen pribadi Edmund terlebih dulu.</p></div>}
      {t && (
        <section className="an-panel" aria-labelledby={`tt-${t.id}`}>
          <h4 id={`tt-${t.id}`}>{t.nama} {s.tekaTeki.includes(t.id) && <span className="nb-tag">Terpecahkan</span>}</h4>
          <p>{t.pengantar}</p>
          {s.tekaTeki.includes(t.id)
            ? (t.jenis === 'sandi' ? <Sandi t={t} terpecah jawab={() => {}} /> : <p className="tt-hasil"><IconCheck /> {t.teksBenar}</p>)
            : (() => { const Panel = PANEL[t.jenis]; return <Panel key={t.id} t={t} jawab={(j) => s.jawabTekaTeki(t.id, j)} />; })()}
        </section>
      )}
    </div>
  );
}
