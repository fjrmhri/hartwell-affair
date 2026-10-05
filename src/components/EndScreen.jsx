import { useEffect, useRef } from 'react';
import { useGame, P, bacaPermanen } from '../store';
import { IconCheck, IconClose } from './Icons';

const K = P.kasus;
const tanda = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : `${v}`);
const PENCAPAIAN = {
  tanpa_petunjuk: 'Tanpa petunjuk', tanpa_salah: 'Tanpa satu pun kesalahan', tanpa_tertutup: 'Tidak ada saksi yang menutup diri',
  kebenaran_dipesan: 'Menemukan ending Kebenaran yang Dipesan',
};
const SEMUA_ENDING = P.tuduhan.ending.map((e) => e.id).concat('kasus_dingin');

export default function EndScreen() {
  const s = useGame();
  const judulRef = useRef(null);
  const menu = () => useGame.setState({ status: 'menu' });
  useEffect(() => { judulRef.current?.focus({ preventScroll: true }); }, []);

  const h = s.hasil || { ending: 'kasus_dingin' };
  const E = P.cerita.ending[h.ending] || P.cerita.ending.tuduhan_salah;
  const perm = bacaPermanen();
  const terlewat = K.bukti.filter((b) => !s.bukti.includes(b.id)).map((b) => (s.hilang.includes(b.id) ? `${b.id} ${b.nama} (hilang)` : `${b.id} ${b.nama}`));
  const rahasia = P.kesaksian.filter((k) => k.selesai?.retak && !s.kesaksianSelesai.includes(k.id)).map((k) => `${K.tokoh[k.tokoh].nama}: ${k.judul}`);

  const Ringkasan = () => (
    <section className="report report--detail" aria-label="Ringkasan penyelidikan">
      {h.rincian && (
        <table className="score score--slot">
          <caption>Surat tuduhan</caption>
          <tbody>{h.rincian.map((r) => <tr key={r.id}><td>{r.ok ? <IconCheck /> : <IconClose />} {r.judul}</td><td>{r.poin}/{r.maks}</td></tr>)}</tbody>
        </table>
      )}
      {terlewat.length > 0 && <details><summary>{terlewat.length} bukti terlewat</summary><ul>{terlewat.map((t) => <li key={t}>{t}</li>)}</ul></details>}
      {rahasia.length > 0 && <details><summary>{rahasia.length} rahasia belum terbongkar</summary><ul>{rahasia.map((t) => <li key={t}>{t}</li>)}</ul></details>}
      <p className="muted">Ending ditemukan: {perm.endingDilihat.length}/{SEMUA_ENDING.length}{perm.pencapaian.length ? ` · Pencapaian: ${perm.pencapaian.map((p) => PENCAPAIAN[p] || p).join(', ')}` : ''}</p>
    </section>
  );

  if (s.status === 'won') {
    const sc = h.skor, [, rank, title] = P.cerita.peringkat.find(([min]) => sc.pct >= min);
    const rows = [['Surat tuduhan', sc.slot], ['Sisa waktu', sc.waktu], ['Petunjuk terpakai', sc.petunjuk], ['Kesalahan', sc.salah]];
    return (
      <main className="over won" aria-labelledby="over-title">
        <h1 id="over-title" className="over-title" tabIndex={-1} ref={judulRef}>{E.judul}</h1>
        <section className="report" aria-label="Laporan akhir kasus">
          <div className="report-head"><span className="over-stamp" aria-hidden="true">CLOSED</span></div>
          <table className="score">
            <caption className="sr-only">Rincian skor</caption>
            <tbody>
              {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{tanda(v)}</td></tr>)}
              <tr><td>Pengali kesulitan</td><td>{'×'}{sc.pengali}</td></tr>
              <tr className="tot"><td>Total</td><td>{sc.total} / {sc.maks}</td></tr>
            </tbody>
          </table>
          <div className="rank">
            <b className="rank-letter" aria-label={`Peringkat ${rank}`}>{rank}</b>
            <span className="rank-info"><span className="rank-title">{title}</span><small className="rank-pct">{sc.pct}%</small></span>
          </div>
        </section>
        <Ringkasan />
        <div className="over-actions"><button type="button" className="btn btn--primary" onClick={menu}>Main lagi</button></div>
      </main>
    );
  }
  return (
    <main className="over lost" aria-labelledby="over-title">
      <h1 id="over-title" className="over-title glitch" tabIndex={-1} ref={judulRef}>GAME OVER</h1>
      <h2>{E.judul}</h2>
      {h.ending === 'kasus_dingin' && E.slides.flatMap((sl) => sl.lines).map((l) => <p key={l}>{l}</p>)}
      {(h.ending === 'kebenaran_dipesan' || h.ending === 'kambing_hitam_kedua') && <p className="muted">Ending khusus ini membuka satu petunjuk tambahan untuk permainan berikutnya.</p>}
      <Ringkasan />
      <div className="over-actions">
        <button type="button" className="btn btn--primary" onClick={() => s.begin(s.diff)}>Coba lagi</button>
        <button type="button" className="btn btn--secondary" onClick={menu}>Menu utama</button>
      </div>
    </main>
  );
}
