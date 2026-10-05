import { useEffect, useRef } from 'react';
import { useGame, P } from '../store';
import { asset } from '../asset';
import { IconArrowLeft, IconArrowRight, IconClose, IconPause } from './Icons';

const FOCUSABLE = 'button:not([aria-disabled="true"]), [tabindex="0"]';

export default function DocViewer() {
  const id = useGame((s) => s.doc);
  const bukti = useGame((s) => s.bukti);
  const kartu = useGame((s) => s.kartu);
  const list = id && P.kasus.kartu[id] ? kartu : bukti;
  const openDoc = useGame((s) => s.openDoc);
  const stageRef = useRef(null);
  const paperRef = useRef(null);
  const open = !!id;
  const idx = list.indexOf(id);
  const close = () => useGame.setState({ doc: null });
  const go = (d) => { const t = list[idx + d]; if (t) openDoc(t); };

  // Fokus masuk ke kertas saat dibuka; kembali ke pemicu saat ditutup
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const raf = requestAnimationFrame(() => paperRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(raf);
      if (prev && prev !== document.body && prev.isConnected && typeof prev.focus === 'function') prev.focus();
    };
  }, [open]);

  // Esc, panah kiri/kanan, dan focus trap
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...(stageRef.current?.querySelectorAll(FOCUSABLE) || [])];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1], cur = document.activeElement;
      if (!stageRef.current.contains(cur)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!id) return null;
  // Kartu keterangan saksi tidak punya dokumen; tampilkan sebagai catatan wawancara
  const kt = P.kasus.kartu[id];
  const d = kt ? { kind: 'paper', style: 'hand', title: kt.nama, body: [kt.teks], note: 'Keterangan ini bisa disodorkan dalam kesaksian atau dihubungkan di Papan.' } : P.dokumen[id];
  const e = kt ? null : P.kasus.bukti.find((x) => x.id === id);
  if (!d || (!kt && !e)) return null;
  const loc = kt ? `Keterangan ${P.kasus.tokoh[kt.tokoh]?.nama}` : (e.lokasi ? P.kasus.lokasi[e.lokasi]?.nama : 'Diserahkan langsung');
  const hasPrev = idx > 0, hasNext = idx >= 0 && idx < list.length - 1;

  return (
    <div className="modal" onClick={close}>
      <div className="docstage" ref={stageRef} role="dialog" aria-modal="true" aria-labelledby="doc-title" onClick={(ev) => ev.stopPropagation()}>
        <div className="doc-paused"><IconPause /> Waktu dijeda selama membaca</div>
        <div className={`docwrap docwrap--${d.kind}`} key={id}>
          <article className={`doc ${d.style}`} ref={paperRef} tabIndex={0}>
            <small className="docid">{kt ? 'Kartu' : 'Bukti'} {id} · {loc}</small>
            {d.kind === 'obj' && e && <img className="docimg" src={asset(e.gambar)} alt="" />}
            <h2 id="doc-title">{d.title}</h2>
            {d.meta && <table><tbody>{d.meta.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>}
            {d.body.map((p, i) => <p key={i}>{p}</p>)}
            {d.sign && <p className="sign">{d.sign}</p>}
            {d.stamp && <span className="stamp">{d.stamp}</span>}
            <footer><b>Catatan detektif:</b> {d.note}</footer>
          </article>
        </div>
        <div className="docbar">
          <button type="button" className="docbtn" aria-label="Bukti sebelumnya" aria-disabled={!hasPrev} onClick={() => go(-1)}><IconArrowLeft /></button>
          <span className="docbar__count" aria-live="polite">{idx >= 0 ? `${kt ? 'Kartu' : 'Bukti'} ${idx + 1} dari ${list.length}` : id}</span>
          <button type="button" className="docbtn" aria-label="Bukti berikutnya" aria-disabled={!hasNext} onClick={() => go(1)}><IconArrowRight /></button>
          <button type="button" className="docbtn docbtn--close" onClick={close} aria-label="Tutup"><IconClose /><span>Tutup</span></button>
        </div>
      </div>
    </div>
  );
}
