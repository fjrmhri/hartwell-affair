import { useState, useEffect, useRef } from 'react';
import { useGame, P } from '../store';
import { lokasiTerbuka, buktiTersedia, infoTersedia, biayaBukti } from '../engine/aksi';
import { cekSyarat } from '../engine/kondisi';
import { asset } from '../asset';
import { IconMagnify, IconLock, IconMap } from './Icons';

const K = P.kasus;

/* ---------- Data turunan ---------- */

const AREA = { lantai1: { label: 'Mansion Lantai 1', order: 1 }, lantai2: { label: 'Mansion Lantai 2', order: 2 }, kota: { label: 'Kota Ravenport', order: 3 } };
const areaOf = (l) => ({ key: l.area, ...AREA[l.area] });
const AREAS = (() => {
  const g = {};
  Object.entries(K.lokasi).forEach(([id, l]) => {
    const a = areaOf(l);
    (g[a.key] = g[a.key] || { ...a, ids: [] }).ids.push(id);
  });
  return Object.values(g).sort((a, b) => a.order - b.order);
})();

// "meja_kerja" -> "Meja kerja"
const spotName = (slug = '') => {
  const t = slug.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const COST_TXT = (m) => `\u2212${m} mnt`;
const BIAYA_JALAN = K.config.biayaPerjalananMenit;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- Cache modul (bertahan selama tab Peta dibuka-tutup) ---------- */

// SVG peta di-inline agar font web berlaku pada label. File lokal terpercaya.
const svgStore = {};
const svgPending = {};
function loadSvg(path) {
  if (path in svgStore) return Promise.resolve(svgStore[path]);
  if (!svgPending[path]) {
    svgPending[path] = fetch(asset(path))
      .then((r) => { if (!r.ok) throw new Error('http'); return r.text(); })
      .then((t) => {
        if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(t)) throw new Error('bukan svg');
        const clean = t.replace(/<metadata[\s\S]*?<\/metadata>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
        svgStore[path] = clean;
        return clean;
      })
      .finally(() => { delete svgPending[path]; });
  }
  return svgPending[path];
}

// null = memuat, false = gagal, string = markup SVG
function useInlineSvg(path) {
  const [st, setSt] = useState({ path: null, html: null });
  useEffect(() => {
    let live = true;
    loadSvg(path).then((html) => live && setSt({ path, html })).catch(() => live && setSt({ path, html: false }));
    return () => { live = false; };
  }, [path]);
  if (path in svgStore) return svgStore[path];
  return st.path === path ? st.html : null;
}

let lastLoc = null;   // lokasi terakhir dibuka
let seenLocs = null;  // lokasi terbuka yang sudah pernah dipilih (untuk penanda "Baru")
const syncSeen = (openIds) => {
  if (!seenLocs || [...seenLocs].some((id) => !openIds.includes(id))) {
    seenLocs = new Set(openIds.filter((id) => !Object.keys(K.lokasi[id].syarat || {}).length)); // game baru -> reset
  }
  return seenLocs;
};

/* ---------- Komponen ---------- */

export default function MapView() {
  const s = useGame();
  const openIds = Object.keys(K.lokasi).filter((id) => lokasiTerbuka(id, s, P));
  const seen = syncSeen(openIds);

  const [pick, setPick] = useState(lastLoc);
  const [zoomed, setZoomed] = useState(true);
  const [armed, setArmed] = useState(null); // titik yang tooltip-nya dibuka lewat sentuhan
  const [hot, setHot] = useState(null);     // titik yang disorot dari daftar
  const [, bump] = useState(0);
  const pType = useRef('mouse');

  const loc = openIds.includes(pick) ? pick : (openIds.includes(s.lokasiSekarang) ? s.lokasiSekarang : openIds[0]);
  const L = K.lokasi[loc], R = L.ruang;
  // Titik periksa: bukti dan temuan (info) di lokasi ini
  const items = [
    ...K.bukti.filter((e) => e.lokasi === loc && buktiTersedia(e, s, P)).map((e) => ({ key: e.id, spot: e.spot, hotspot: e.hotspot, menit: biayaBukti(e.id, s, P), go: () => s.collect(e.id) })),
    ...(L.info || []).filter((inf) => infoTersedia(loc, inf, s, P)).map((inf) => ({ key: inf.id, spot: inf.judul, hotspot: inf.hotspot, menit: inf.menit ?? K.config.biayaJelajahMenit, go: () => s.periksaInfo(loc, inf.id) })),
  ];
  const html = useInlineSvg(L.peta);
  const telepon = cekSyarat(K.config.syaratPenandaTelepon, s, P)
    ? K.config.penandaTelepon.filter((t) => K.lokasi[t.lokasi].peta === L.peta) : [];

  useEffect(() => { seen.add(loc); lastLoc = loc; }, [loc, seen]);

  const choose = (id) => {
    seen.add(id); lastLoc = id;
    s.kunjungi(id); // lokasi kota memakan biaya perjalanan
    setPick(id); setZoomed(true); setArmed(null); setHot(null); bump((n) => n + 1);
  };

  // Zoom: pusatkan ruangan terpilih; wrapper di-transform, hotspot diberi counter-scale (--k).
  const k = zoomed ? clamp(0.86 * Math.min(100 / R.w, 100 / R.h), 1, 2.6) : 1;
  const tx = clamp(50 - k * (R.x + R.w / 2), 100 - 100 * k, 0);
  const ty = clamp(50 - k * (R.y + R.h / 2), 100 - 100 * k, 0);

  const collect = (it) => { setArmed(null); setHot(null); s.kunjungi(loc); it.go(); };
  const onSpotClick = (it) => {
    // Sentuh/pena: ketukan pertama menampilkan tooltip, ketukan kedua memeriksa.
    if (pType.current !== 'mouse' && pType.current !== 'key' && armed !== it.key) { setArmed(it.key); return; }
    collect(it);
  };

  const area = areaOf(L);

  return (
    <div className="mapview">
      <p className="sr-only" aria-live="polite">{`${L.nama}: ${items.length ? `${items.length} titik dapat diperiksa` : 'tidak ada titik baru'}`}</p>

      {/* Pemilih lokasi: papan nama kuningan per area */}
      <nav className="locboard" aria-label="Pilih lokasi">
        {AREAS.map((a) => (
          <div className="locgroup" key={a.key}>
            <div className="locgroup__title">{a.label}</div>
            <ul className="locgroup__list">
              {a.ids.map((id) => {
                if (!openIds.includes(id)) {
                  return <li key={id}><span className="locplate locplate--locked"><IconLock /> Terkunci</span></li>;
                }
                const fresh = !seen.has(id) && id !== loc;
                const jalan = K.lokasi[id].area === 'kota' && s.lokasiSekarang !== id;
                return (
                  <li key={id}>
                    <button type="button" className={`locplate${id === loc ? ' is-on' : ''}`} aria-pressed={id === loc} onClick={() => choose(id)}
                      aria-label={`${K.lokasi[id].nama}${jalan ? `, perjalanan ${BIAYA_JALAN} menit` : ''}`}>
                      {K.lokasi[id].nama}
                      {jalan && <span className="locplate__cost" aria-hidden="true">{COST_TXT(BIAYA_JALAN)}</span>}
                      {fresh && <><span className="locplate__new" aria-hidden="true">Baru</span><span className="sr-only"> (baru)</span></>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="map-layout">
        {/* Cetak biru yang ditempel di meja */}
        <div className="map-desk">
          <div className="blueprint">
            <div className="blueprint__view" onPointerDown={(e) => { if (!e.target.closest('.spot')) setArmed(null); }}>
              <div className="map-stage" role="group" aria-label={`Denah ${L.nama}`}
                style={{ '--k': k, transform: `translate(${tx}%, ${ty}%) scale(${k})` }}>
                {html === false && <img className="map-fallback" src={asset(L.peta)} alt="" />}
                {html && <div className="map-svg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />}

                <div className="map-room" style={{ left: `${R.x}%`, top: `${R.y}%`, width: `${R.w}%`, height: `${R.h}%` }}>
                  <div className="map-room__plaque">{L.nama}</div>
                </div>

                {telepon.map((t) => {
                  const r = K.lokasi[t.lokasi].ruang;
                  return <span key={t.saluran} className="map-tel" style={{ left: `${r.x + r.w - 4}%`, top: `${r.y + 7}%` }} title={`Telepon saluran ${t.label}`}>{t.label}</span>;
                })}

                {items.map((e) => {
                  const px = R.x + (e.hotspot.x / 100) * R.w, py = R.y + (e.hotspot.y / 100) * R.h;
                  const vx = k * px + tx, vy = k * py + ty; // posisi di layar (%), untuk arah tooltip
                  const name = spotName(e.spot);
                  const cls = ['spot', vy < 34 ? 'spot--below' : '', vx < 24 ? 'spot--left' : vx > 76 ? 'spot--right' : '',
                    armed === e.key ? 'is-armed' : '', hot === e.key ? 'is-hot' : ''].filter(Boolean).join(' ');
                  return (
                    <div key={e.key} className={cls} style={{ left: `${px}%`, top: `${py}%` }}>
                      <div className="spot__ctr">
                        <button type="button" className="spot__btn" aria-label={`Periksa ${name}, ${e.menit} menit`}
                          onPointerDown={(ev) => { pType.current = ev.pointerType || 'mouse'; }}
                          onKeyDown={() => { pType.current = 'key'; }}
                          onClick={() => onSpotClick(e)}>
                          <IconMagnify />
                        </button>
                        <span className="spot__tip" aria-hidden="true">
                          <b>{name}</b>
                          <span>{COST_TXT(e.menit)}</span>
                          {armed === e.key && <em>Ketuk lagi untuk memeriksa</em>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="blueprint__foot">
              <span className="blueprint__title">{area.label}</span>
              <button type="button" className="btn btn--secondary map-zoombtn" onClick={() => setZoomed((z) => !z)}>
                {zoomed ? <><IconMap /> Lihat seluruh denah</> : <><IconMagnify /> Perbesar ruangan</>}
              </button>
            </div>
          </div>
        </div>

        {/* Alternatif untuk keyboard dan layar sentuh */}
        <section className="checklist" aria-labelledby="checklist-title">
          <h3 id="checklist-title" className="checklist__title">Titik pemeriksaan</h3>
          {items.length ? (
            <>
              <p className="checklist__note">{items.length} titik di {L.nama}.</p>
              <ul className="checklist__list">
                {items.map((e) => (
                  <li key={e.key}>
                    <button type="button" className="checkitem" onClick={() => collect(e)}
                      onMouseEnter={() => setHot(e.key)} onMouseLeave={() => setHot(null)}
                      onFocus={() => setHot(e.key)} onBlur={() => setHot(null)}
                      aria-label={`Periksa ${spotName(e.spot)}, ${e.menit} menit`}>
                      <IconMagnify />
                      <span className="checkitem__name">{spotName(e.spot)}</span>
                      <span className="checkitem__cost">{COST_TXT(e.menit)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="checklist__note">Tidak ada petunjuk baru di {L.nama}.</p>
          )}
        </section>
      </div>
    </div>
  );
}
