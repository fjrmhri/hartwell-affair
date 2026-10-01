import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGame } from '../store';
import { asset } from '../asset';
import C from '../data/case.json';
import D from '../data/dialog.json';
import ConfirmDialog from './ConfirmDialog';
import { IconLink, IconCheck, IconAlert } from './Icons';

const W = 116, H = 142, GAP = 12, PAD = 12, MIN_BH = 460, PIN_Y = 6;
const NAME = (id) => C.suspects[id]?.name || id;

export default function Board() {
  const s = useGame();
  const [picked, setPicked] = useState([]);
  const [tmp, setTmp] = useState(null); // benang yang sedang ditarik: {from, x, y}
  const [w, setW] = useState(720);
  const [connect, setConnect] = useState(false); // "Mode hubungkan"
  const [sel, setSel] = useState(null);          // kartu A terpilih di mode hubungkan
  const [shake, setShake] = useState([]);
  const [flash, setFlash] = useState(0);
  const [askAccuse, setAskAccuse] = useState(false);
  const drag = useRef(null);
  const ref = useRef(null);
  const pairRef = useRef([]);
  const prevWrong = useRef(s.wrongLinks);
  const need = C.config.difficulty[s.diff].deductionsRequired;

  // Lebar papan -> jumlah kolom; posisi awal dihitung dari lebar sebenarnya
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setW(el.clientWidth || 720);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(1, Math.floor((w - PAD) / (W + GAP)));
  const left0 = Math.max(PAD, Math.floor((w - (cols * (W + GAP) - GAP)) / 2));
  const defPos = (i) => ({ x: left0 + (i % cols) * (W + GAP), y: PAD + Math.floor(i / cols) * (H + GAP + 4) });
  const rows = Math.ceil(s.evidence.length / cols);
  const BH = Math.max(MIN_BH, PAD + rows * (H + GAP + 4) + 16);
  const clampP = (p) => ({ x: Math.max(0, Math.min(Math.max(0, w - W), p.x)), y: Math.max(0, Math.min(BH - H, p.y)) });

  const pos = (id) => clampP(s.boardPos[id] || defPos(Math.max(0, s.evidence.indexOf(id))));
  const pin = (id) => ({ x: pos(id).x + W / 2, y: pos(id).y + PIN_Y });
  const rel = (e) => { const r = ref.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const curve = (a, b) => `M${a.x},${a.y} Q${(a.x + b.x) / 2},${Math.max(a.y, b.y) + 45} ${b.x},${b.y}`;

  const doLink = (a, b) => { pairRef.current = [a, b]; s.link(a, b); };
  const activate = (id) => { // klik/Enter pada kartu
    if (!connect) { s.openDoc(id); return; }
    if (!sel) setSel(id);
    else if (sel === id) setSel(null);
    else { doLink(sel, id); setSel(null); }
  };
  const cancelConnect = () => { if (sel) setSel(null); else setConnect(false); };

  const down = (e) => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const id = card.dataset.id, p = rel(e), o = pos(id);
    const isPin = !!e.target.closest('[data-pin]');
    drag.current = isPin ? { mode: 'thread', id } : { mode: 'move', id, dx: p.x - o.x, dy: p.y - o.y, sx: e.clientX, sy: e.clientY, moved: false };
    ref.current.setPointerCapture(e.pointerId);
    if (isPin) setTmp({ from: id, ...p });
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const p = rel(e);
    if (d.mode === 'move' && !d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    if (d.mode === 'move')
      s.moveCard(d.id, Math.max(0, Math.min(ref.current.clientWidth - W, p.x - d.dx)), Math.max(0, Math.min(BH - H, p.y - d.dy)));
    else setTmp({ from: d.id, ...p });
  };
  const up = (e) => {
    const d = drag.current;
    drag.current = null; setTmp(null);
    if (d?.mode === 'move' && !d.moved) activate(d.id); // klik tanpa geser = baca dokumen (atau pilih di mode hubungkan)
    if (d?.mode === 'thread') {
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-id]');
      if (t && t.dataset.id !== d.id) doLink(d.id, t.dataset.id);
    }
  };
  const onCardKey = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(id); }
  };
  const tog = (id) => setPicked((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  // hubungan salah: kartu bergetar + kilat merah singkat
  useEffect(() => {
    if (s.wrongLinks > prevWrong.current) {
      setShake(pairRef.current);
      setFlash((n) => n + 1);
      const t = setTimeout(() => setShake([]), 700);
      prevWrong.current = s.wrongLinks;
      return () => clearTimeout(t);
    }
    prevWrong.current = s.wrongLinks;
    return undefined;
  }, [s.wrongLinks]);

  // benang hanya muncul untuk deduksi yang sudah terkonfirmasi dan kedua buktinya ada di papan
  const threads = C.deductions.filter((d) => s.confirmed.includes(d.id) && d.link.every((x) => s.evidence.includes(x)));
  // benang yang sudah ada saat papan dibuka langsung tampil; yang baru terbuka digambar animatif
  const initial = useRef(null);
  if (initial.current === null) initial.current = new Set(threads.map((d) => d.id));

  const reason = s.confirmed.length < need
    ? `Butuh ${need - s.confirmed.length} deduksi lagi`
    : (!picked.length ? 'Pilih minimal satu tersangka' : '');
  const names = picked.map(NAME).join(', ');

  return (
    <div className="bd">
      <h3>Papan Bukti</h3>
      <p className="muted bd-help">Klik kartu untuk membaca. Seret untuk memindahkan. Seret dari <b className="redtxt">pin merah</b> ke kartu lain untuk merentangkan benang, atau pakai Mode hubungkan. Hubungan salah memakan {C.config.wrongLinkCostMinutes} menit dan mengurangi skor.</p>

      <div className="bd-tools">
        <button type="button" className="bd-mode" aria-pressed={connect} onClick={() => { setConnect((v) => !v); setSel(null); }}>
          <IconLink /> Mode hubungkan
        </button>
        {connect && (
          <>
            <span className="bd-status" role="status">
              {sel ? `Kartu pertama: ${sel}. Pilih kartu kedua.` : 'Pilih kartu pertama.'}
            </span>
            <button type="button" className="bd-cancel" onClick={cancelConnect}>Batal</button>
          </>
        )}
      </div>

      <div className={`board${connect ? ' board--connect' : ''}`} ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onKeyDown={(e) => { if (e.key === 'Escape' && connect) { e.stopPropagation(); cancelConnect(); } }} style={{ height: BH }}>
        {!s.evidence.length && <p className="muted pad">Belum ada bukti. Jelajahi lokasi terlebih dulu.</p>}
        {s.evidence.map((id) => {
          const e = C.evidence.find((x) => x.id === id), p = pos(id);
          const cls = `pcard${sel === id ? ' pcard--sel' : ''}${shake.includes(id) ? ' pcard--shake' : ''}`;
          return (
            <div key={id} data-id={id} className={cls} style={{ left: p.x, top: p.y, width: W, height: H }}
              role="button" tabIndex={0} aria-pressed={connect ? sel === id : undefined}
              aria-label={`${id} ${e.name}${connect ? '' : ', buka dokumen'}`} onKeyDown={(ev) => onCardKey(ev, id)}>
              <span data-pin className="pin" />
              <img src={asset(e.image)} alt="" draggable={false} />
              <small><b>{id}</b> {e.name}</small>
            </div>
          );
        })}
        <svg className="threads" width="100%" height={BH}>
          {threads.map((d) => {
            const a = pin(d.link[0]), b = pin(d.link[1]);
            const fresh = !initial.current.has(d.id);
            const pw = Math.round(d.title.length * 7.4 + 26), ph = 24;
            const cx = Math.max(pw / 2 + 4, Math.min(w - pw / 2 - 4, (a.x + b.x) / 2));
            const cy = 0.25 * a.y + 0.5 * (Math.max(a.y, b.y) + 45) + 0.25 * b.y;
            return (
              <g key={d.id}>
                <path d={curve(a, b)} pathLength="1" className={`thread${fresh ? ' thread--draw' : ''}`} />
                <g className={`tpill${fresh ? ' tpill--in' : ''}`}>
                  <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx={ph / 2} className="tpill-bg" />
                  <text x={cx} y={cy + 4} className="tlabel" textAnchor="middle">{d.title}</text>
                </g>
                {[a, b].map((q, i) => <circle key={i} cx={q.x} cy={q.y} r="7" className="knob" />)}
              </g>
            );
          })}
          {tmp && <path d={curve(pin(tmp.from), tmp)} className="thread drag" />}
        </svg>
        {flash > 0 && <div className="board-flash" key={flash} aria-hidden="true" />}
      </div>

      <section className="acc" aria-labelledby="acc-title">
        <header className="acc-head">
          <h3 id="acc-title">Surat Tuduhan</h3>
          <span className="acc-prog" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(s.confirmed.length, need)}
            aria-label={`Deduksi terbuka ${s.confirmed.length} dari ${need} yang dibutuhkan`}>
            <span className="acc-prog__label">Deduksi {Math.min(s.confirmed.length, need)}/{need}</span>
            <span className="acc-prog__segs" aria-hidden="true">
              {Array.from({ length: need }, (_, i) => <i key={i} className={i < s.confirmed.length ? 'on' : ''} />)}
            </span>
          </span>
        </header>
        <p className="acc-lead">Kepada Kepala Kepolisian Ravenport. Berdasarkan bukti dan deduksi yang terkumpul, dengan ini saya menuduh:</p>
        <div className="acc-suspects" role="group" aria-label="Pilih tersangka yang dituduh">
          {Object.entries(C.suspects).map(([id, p]) => {
            const on = picked.includes(id);
            const portrait = D.characters[id]?.portrait;
            return (
              <button key={id} type="button" className={`acc-card${on ? ' acc-card--on' : ''}`} aria-pressed={on} onClick={() => tog(id)}>
                <span className="acc-card__photo">
                  {portrait && <img src={asset(portrait)} alt="" />}
                  {on && <span className="acc-card__mark"><IconCheck /></span>}
                </span>
                <span className="acc-card__name">{p.name}</span>
                <span className="acc-card__role">{p.role}</span>
              </button>
            );
          })}
        </div>
        <div className="acc-foot">
          <span className="acc-count" aria-live="polite">{picked.length} dari {Object.keys(C.suspects).length} tersangka dipilih</span>
          <button type="button" className="btn btn--danger acc-go" disabled={!!reason} aria-describedby="acc-reason" onClick={() => setAskAccuse(true)}>Tuduh</button>
        </div>
        <p id="acc-reason" className="acc-reason">{reason && <><IconAlert /> {reason}</>}</p>
      </section>

      <ConfirmDialog
        open={askAccuse}
        title="Ajukan tuduhan?"
        body={<>Tuduhan tidak dapat ditarik kembali. Bila salah, kasus berakhir.<br /><b>Tersangka: {names}</b></>}
        confirmLabel="Ya, tuduh"
        cancelLabel="Batal"
        danger
        onConfirm={() => { setAskAccuse(false); s.accuse(picked); }}
        onCancel={() => setAskAccuse(false)}
      />
    </div>
  );
}
