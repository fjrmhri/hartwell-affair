import { useEffect, useRef } from 'react';
import { useGame } from '../store';
import C from '../data/case.json';
import STORY from '../data/story.json';

const tanda = (v) => (v > 0 ? `+${v}` : v < 0 ? `\u2212${Math.abs(v)}` : `${v}`);

export default function EndScreen() {
  const s = useGame();
  const judulRef = useRef(null);
  const menu = () => useGame.setState({ status: 'menu' });

  useEffect(() => {
    judulRef.current?.focus({ preventScroll: true });
  }, []);

  if (s.status === 'won') {
    const sc = s.score, [, rank, title] = STORY.ranks.find(([min]) => sc.pct >= min);
    const rows = [['Pelaku terungkap', sc.base], ['Bonus motif', sc.motive], ['Bonus metode', sc.method], ['Sisa waktu', sc.time], ['Petunjuk terpakai', sc.hints], ['Hubungan salah', sc.links]];
    return (
      <main className="over won" aria-labelledby="over-title">
        <h1 id="over-title" className="over-title" tabIndex={-1} ref={judulRef}>KASUS SELESAI</h1>
        <section className="report" aria-label="Laporan akhir kasus">
          <div className="report-head"><span className="over-stamp" aria-hidden="true">CLOSED</span></div>
          <table className="score">
            <caption className="sr-only">Rincian skor</caption>
            <tbody>
              {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{tanda(v)}</td></tr>)}
              <tr><td>Pengali kesulitan</td><td>{'\u00d7'}{sc.mult}</td></tr>
              <tr className="tot"><td>Total</td><td>{sc.total} / {sc.max}</td></tr>
            </tbody>
          </table>
          <div className="rank">
            <b className="rank-letter" aria-label={`Peringkat ${rank}`}>{rank}</b>
            <span className="rank-info"><span className="rank-title">{title}</span><small className="rank-pct">{sc.pct}%</small></span>
          </div>
        </section>
        <div className="over-actions">
          <button type="button" className="btn btn--primary" onClick={menu}>Main lagi</button>
        </div>
      </main>
    );
  }
  const L = STORY.lose[s.reason === 'timeout' ? 'timeout' : s.partial ? 'partial' : 'wrong'];
  const names = (s.accused || []).map((id) => C.suspects[id].name).join(', ');
  return (
    <main className="over lost" aria-labelledby="over-title">
      <h1 id="over-title" className="over-title glitch" tabIndex={-1} ref={judulRef}>GAME OVER</h1>
      <h2>{L.title}</h2>
      {L.lines.map((l, i) => <p key={i}>{l}</p>)}
      {names && <p className="muted">Tuduhan Anda: {names}</p>}
      <div className="over-actions">
        <button type="button" className="btn btn--primary" onClick={() => s.start(s.diff)}>Coba lagi</button>
        <button type="button" className="btn btn--secondary" onClick={menu}>Menu utama</button>
      </div>
    </main>
  );
}
