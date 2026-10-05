import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGame, P } from '../store';
import { asset } from '../asset';
import { pengecohTerbantah } from '../engine/aksi';
import { IconLink, IconAlert, IconDialog } from './Icons';

const K = P.kasus;
const W = 116, H = 142, GAP = 12, PAD = 12, MIN_BH = 460, PIN_Y = 6;
const MAKS_PILIH = 3;
const infoKartu = (id) => {
  const b = K.bukti.find((x) => x.id === id);
  return b ? { nama: b.nama, gambar: b.gambar } : { nama: K.kartu[id]?.nama || id, gambar: null };
};

export default function Board() {
  const s = useGame();
  const [tmp, setTmp] = useState(null); // benang yang sedang ditarik: {from, x, y}
  const [w, setW] = useState(720);
  const [connect, setConnect] = useState(false); // "Mode hubungkan"
  const [sel, setSel] = useState([]);            // kartu terpilih di mode hubungkan (2-3)
  const [shake, setShake] = useState([]);
  const [flash, setFlash] = useState(0);
  const drag = useRef(null);
  const ref = useRef(null);
  const pairRef = useRef([]);
  const prevWrong = useRef(s.salahHubung);
  const need = K.config.kesulitan[s.diff].deduksiWajib;
  const kartu = [...s.bukti, ...s.kartu];

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
  const rows = Math.ceil(kartu.length / cols);
  const BH = Math.max(MIN_BH, PAD + rows * (H + GAP + 4) + 16);
  const clampP = (p) => ({ x: Math.max(0, Math.min(Math.max(0, w - W), p.x)), y: Math.max(0, Math.min(BH - H, p.y)) });

  const pos = (id) => clampP(s.boardPos[id] || defPos(Math.max(0, kartu.indexOf(id))));
  const pin = (id) => ({ x: pos(id).x + W / 2, y: pos(id).y + PIN_Y });
  const rel = (e) => { const r = ref.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const curve = (a, b) => `M${a.x},${a.y} Q${(a.x + b.x) / 2},${Math.max(a.y, b.y) + 45} ${b.x},${b.y}`;

  const doLink = (ids) => { pairRef.current = ids; s.link(ids); };
  const activate = (id) => { // klik/Enter pada kartu
    if (!connect) { s.lihat(id); s.openDoc(id); return; }
    setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length < MAKS_PILIH ? [...x, id] : x));
  };
  const cancelConnect = () => { if (sel.length) setSel([]); else setConnect(false); };

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
      if (t && t.dataset.id !== d.id) doLink([d.id, t.dataset.id]);
    }
  };
  const onCardKey = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(id); }
  };

  // hubungan salah: kartu bergetar + kilat merah singkat
  useEffect(() => {
    if (s.salahHubung > prevWrong.current) {
      setShake(pairRef.current);
      setFlash((n) => n + 1);
      const t = setTimeout(() => setShake([]), 700);
      prevWrong.current = s.salahHubung;
      return () => clearTimeout(t);
    }
    prevWrong.current = s.salahHubung;
    return undefined;
  }, [s.salahHubung]);

  // Benang: deduksi terkonfirmasi (utuh) dan dugaan pengecoh (putus-putus); 3 kartu = 2 ruas benang
  const ruas = (list, jenis) => list.flatMap((d) => d.kartu.slice(1).map((b, i) => ({ id: `${d.id}-${i}`, dId: d.id, a: d.kartu[i], b, judul: i === 0 ? d.judul : '', jenis: jenis(d) })));
  const threads = [
    ...ruas(P.deduksi.benar.filter((d) => s.deduksi.includes(d.id) && d.kartu.length && d.kartu.every((x) => kartu.includes(x))), () => 'benar'),
    ...ruas(P.deduksi.pengecoh.filter((f) => s.pengecoh.includes(f.id)), (f) => (pengecohTerbantah(f, s) ? 'runtuh' : 'dugaan')),
  ];
  // benang yang sudah ada saat papan dibuka langsung tampil; yang baru terbuka digambar animatif
  const initial = useRef(null);
  if (initial.current === null) initial.current = new Set(threads.map((d) => d.id));

  const reason = s.deduksi.length < need ? `Butuh ${need - s.deduksi.length} deduksi lagi` : '';

  return (
    <div className="bd">
      <h3>Papan Bukti</h3>
      <p className="muted bd-help">Klik kartu untuk membaca. Seret untuk memindahkan. Seret dari <b className="redtxt">pin merah</b> ke kartu lain untuk dua kartu, atau pakai Mode hubungkan untuk dua atau tiga kartu. Hubungan salah memakan {K.config.biayaSalahHubungMenit} menit dan mengurangi skor. Dugaan yang masuk akal tetapi keliru dicatat dengan benang putus-putus.</p>

      <div className="bd-tools">
        <button type="button" className="bd-mode" aria-pressed={connect} onClick={() => { setConnect((v) => !v); setSel([]); }}>
          <IconLink /> Mode hubungkan
        </button>
        {connect && (
          <>
            <span className="bd-status" role="status">
              {sel.length ? `Terpilih: ${sel.join(', ')}. ${sel.length < MAKS_PILIH ? 'Pilih kartu lain atau hubungkan.' : 'Maksimal tiga kartu.'}` : 'Pilih dua atau tiga kartu.'}
            </span>
            <button type="button" className="btn btn--primary bd-go" disabled={sel.length < 2} onClick={() => { doLink(sel); setSel([]); }}>Hubungkan</button>
            <button type="button" className="bd-cancel" onClick={cancelConnect}>Batal</button>
          </>
        )}
      </div>

      <div className={`board${connect ? ' board--connect' : ''}`} ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onKeyDown={(e) => { if (e.key === 'Escape' && connect) { e.stopPropagation(); cancelConnect(); } }} style={{ height: BH }}>
        {!kartu.length && <p className="muted pad">Belum ada bukti. Jelajahi lokasi terlebih dulu.</p>}
        {kartu.map((id) => {
          const e = infoKartu(id), p = pos(id);
          const cls = `pcard${sel.includes(id) ? ' pcard--sel' : ''}${shake.includes(id) ? ' pcard--shake' : ''}${e.gambar ? '' : ' pcard--k'}`;
          return (
            <div key={id} data-id={id} className={cls} style={{ left: p.x, top: p.y, width: W, height: H }}
              role="button" tabIndex={0} aria-pressed={connect ? sel.includes(id) : undefined}
              aria-label={`${id} ${e.nama}${connect ? '' : ', buka dokumen'}`} onKeyDown={(ev) => onCardKey(ev, id)}>
              <span data-pin className="pin" />
              {e.gambar ? <img src={asset(e.gambar)} alt="" draggable={false} /> : <span className="pcard__k"><IconDialog /></span>}
              <small><b>{id}</b> {e.nama}</small>
            </div>
          );
        })}
        <svg className="threads" width="100%" height={BH}>
          {threads.map((d) => {
            const a = pin(d.a), b = pin(d.b);
            const fresh = !initial.current.has(d.id);
            const pw = Math.round(d.judul.length * 7.4 + 26), ph = 24;
            const cx = Math.max(pw / 2 + 4, Math.min(w - pw / 2 - 4, (a.x + b.x) / 2));
            const cy = 0.25 * a.y + 0.5 * (Math.max(a.y, b.y) + 45) + 0.25 * b.y;
            return (
              <g key={d.id} className={`thread-g thread-g--${d.jenis}`}>
                <path d={curve(a, b)} pathLength="1" className={`thread${fresh ? ' thread--draw' : ''}`} />
                {d.judul && (
                  <g className={`tpill${fresh ? ' tpill--in' : ''}`}>
                    <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx={ph / 2} className="tpill-bg" />
                    <text x={cx} y={cy + 4} className="tlabel" textAnchor="middle">{d.judul}</text>
                  </g>
                )}
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
          <span className="acc-prog" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(s.deduksi.length, need)}
            aria-label={`Deduksi terbuka ${s.deduksi.length} dari ${need} yang dibutuhkan`}>
            <span className="acc-prog__label">Deduksi {Math.min(s.deduksi.length, need)}/{need}</span>
            <span className="acc-prog__segs" aria-hidden="true">
              {Array.from({ length: need }, (_, i) => <i key={i} className={i < s.deduksi.length ? 'on' : ''} />)}
            </span>
          </span>
        </header>
        <p className="acc-lead">Tuduhan akhir meminta penalaran lengkap: pembunuh, pelaku lain, motif, metode, kesempatan, dan satu kebenaran yang tidak diketahui pembunuh. Skor dihitung dari jawaban Anda, bukan dari jumlah bukti yang dimiliki.</p>
        <div className="acc-foot">
          <span className="acc-count">{s.deduksi.length} deduksi · {kartu.length} kartu</span>
          <button type="button" className="btn btn--danger acc-go" disabled={!!reason} aria-describedby="acc-reason" onClick={() => s.bukaTuduhan()}>Susun tuduhan</button>
        </div>
        <p id="acc-reason" className="acc-reason">{reason && <><IconAlert /> {reason}</>}</p>
      </section>
    </div>
  );
}
