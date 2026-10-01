import { useState, useEffect, useRef } from 'react';
import { useGame, evAvailable, locOpen } from '../store';
import { asset } from '../asset';
import { IconMagnify, IconLock, IconMap } from './Icons';
import C from '../data/case.json';

/* ---------- Data turunan (tanpa mengubah case.json) ---------- */

// Area diturunkan dari path peta tiap lokasi: denah_lantai2 -> "Mansion Lantai 2", peta_kota -> "Kota Ravenport".
const areaOf = (map) => {
  const m = /lantai(\d+)/i.exec(map);
  return m ? { key: `lantai${m[1]}`, label: `Mansion Lantai ${m[1]}`, order: 100 - Number(m[1]) }
    : { key: 'kota', label: 'Kota Ravenport', order: 200 };
};
const AREAS = (() => {
  const g = {};
  Object.entries(C.locations).forEach(([id, l]) => {
    const a = areaOf(l.map);
    (g[a.key] = g[a.key] || { ...a, ids: [] }).ids.push(id);
  });
  return Object.values(g).sort((a, b) => a.order - b.order);
})();

// "meja_kerja" -> "Meja kerja"
const spotName = (slug = '') => {
  const t = slug.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const COST = C.config.explorationCostMinutes;
const COST_TXT = `\u2212${COST} mnt`;
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
    seenLocs = new Set(openIds.filter((id) => C.locations[id].unlocked)); // game baru -> reset
  }
  return seenLocs;
};

/* ---------- Komponen ---------- */

export default function MapView() {
  const s = useGame();
  const openIds = Object.entries(C.locations).filter(([, l]) => locOpen(l, s)).map(([id]) => id);
  const seen = syncSeen(openIds);

  const [pick, setPick] = useState(lastLoc);
  const [zoomed, setZoomed] = useState(true);
  const [armed, setArmed] = useState(null); // titik yang tooltip-nya dibuka lewat sentuhan
  const [hot, setHot] = useState(null);     // titik yang disorot dari daftar
  const [, bump] = useState(0);
  const pType = useRef('mouse');

  const loc = openIds.includes(pick) ? pick : openIds[0];
  const L = C.locations[loc], R = L.room;
  const items = C.evidence.filter((e) => e.location === loc && evAvailable(e, s));
  const html = useInlineSvg(L.map);

  useEffect(() => { seen.add(loc); lastLoc = loc; }, [loc, seen]);

  const choose = (id) => {
    seen.add(id); lastLoc = id;
    setPick(id); setZoomed(true); setArmed(null); setHot(null); bump((n) => n + 1);
  };

  // Zoom: pusatkan ruangan terpilih; wrapper di-transform, hotspot diberi counter-scale (--k).
  const k = zoomed ? clamp(0.86 * Math.min(100 / R.w, 100 / R.h), 1, 2.6) : 1;
  const tx = clamp(50 - k * (R.x + R.w / 2), 100 - 100 * k, 0);
  const ty = clamp(50 - k * (R.y + R.h / 2), 100 - 100 * k, 0);

  const collect = (id) => { setArmed(null); setHot(null); s.collect(id); };
  const onSpotClick = (id) => {
    // Sentuh/pena: ketukan pertama menampilkan tooltip, ketukan kedua memeriksa.
    if (pType.current !== 'mouse' && pType.current !== 'key' && armed !== id) { setArmed(id); return; }
    collect(id);
  };

  const area = areaOf(L.map);

  return (
    <div className="mapview">
      <p className="sr-only" aria-live="polite">{`${L.name}: ${items.length ? `${items.length} titik dapat diperiksa` : 'tidak ada titik baru'}`}</p>

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
                return (
                  <li key={id}>
                    <button type="button" className={`locplate${id === loc ? ' is-on' : ''}`} aria-pressed={id === loc} onClick={() => choose(id)}>
                      {C.locations[id].name}
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
              <div className="map-stage" role="group" aria-label={`Denah ${L.name}`}
                style={{ '--k': k, transform: `translate(${tx}%, ${ty}%) scale(${k})` }}>
                {html === false && <img className="map-fallback" src={asset(L.map)} alt="" />}
                {html && <div className="map-svg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />}

                <div className="map-room" style={{ left: `${R.x}%`, top: `${R.y}%`, width: `${R.w}%`, height: `${R.h}%` }}>
                  <div className="map-room__plaque">{L.name}</div>
                </div>

                {items.map((e) => {
                  const px = R.x + (e.hotspot.x / 100) * R.w, py = R.y + (e.hotspot.y / 100) * R.h;
                  const vx = k * px + tx, vy = k * py + ty; // posisi di layar (%), untuk arah tooltip
                  const name = spotName(e.spot);
                  const cls = ['spot', vy < 34 ? 'spot--below' : '', vx < 24 ? 'spot--left' : vx > 76 ? 'spot--right' : '',
                    armed === e.id ? 'is-armed' : '', hot === e.id ? 'is-hot' : ''].filter(Boolean).join(' ');
                  return (
                    <div key={e.id} className={cls} style={{ left: `${px}%`, top: `${py}%` }}>
                      <div className="spot__ctr">
                        <button type="button" className="spot__btn" aria-label={`Periksa ${name}, ${COST} menit`}
                          onPointerDown={(ev) => { pType.current = ev.pointerType || 'mouse'; }}
                          onKeyDown={() => { pType.current = 'key'; }}
                          onClick={() => onSpotClick(e.id)}>
                          <IconMagnify />
                        </button>
                        <span className="spot__tip" aria-hidden="true">
                          <b>{name}</b>
                          <span>{COST_TXT}</span>
                          {armed === e.id && <em>Ketuk lagi untuk memeriksa</em>}
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
              <p className="checklist__note">{items.length} titik di {L.name}. Tiap titik memakan {COST} menit.</p>
              <ul className="checklist__list">
                {items.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="checkitem" onClick={() => collect(e.id)}
                      onMouseEnter={() => setHot(e.id)} onMouseLeave={() => setHot(null)}
                      onFocus={() => setHot(e.id)} onBlur={() => setHot(null)}
                      aria-label={`Periksa ${spotName(e.spot)}, ${COST} menit`}>
                      <IconMagnify />
                      <span className="checkitem__name">{spotName(e.spot)}</span>
                      <span className="checkitem__cost">{COST_TXT}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="checklist__note">Tidak ada petunjuk baru di {L.name}.</p>
          )}
        </section>
      </div>
    </div>
  );
}
