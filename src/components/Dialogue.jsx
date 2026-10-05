import { useState, useEffect, useRef } from 'react';
import { useGame, P } from '../store';
import { tokohHadir, nodeTersedia, kesaksianTersedia, tertutup } from '../engine/aksi';
import { nilaiMeter } from '../engine/kondisi';
import { asset } from '../asset';
import { IconAsk, IconSympathy, IconPressure, IconEvidence, IconTimer, IconDialog, IconCheck, IconLock } from './Icons';

const K = P.kasus;
const NADA = {
  netral: { label: 'Tanya', Icon: IconAsk },
  simpati: { label: 'Simpati', Icon: IconSympathy },
  desak: { label: 'Desak', Icon: IconPressure },
};
const TYPE_MS = 15;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const butuhBukti = (n) => /"(bukti|kartu)"/.test(JSON.stringify(n.syarat || {}));
const namaItem = (id) => K.bukti.find((b) => b.id === id)?.nama || K.kartu[id]?.nama || id;

function Meter({ label, value, max, kind }) {
  return (
    <div className={`dlg-gauge dlg-gauge--${kind}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span className="dlg-gauge__label">{label}</span>
      <span className="dlg-gauge__segs" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? 'lit' : ''} />)}
      </span>
      <span className="dlg-gauge__num" aria-hidden="true">{value}/{max}</span>
    </div>
  );
}

// Ekspresi potret: retak > bohong (tanda bohong di baris terakhir) > tertekan (tekanan >= 2) > tenang
function potretUntuk(id, s) {
  const T = K.tokoh[id];
  const terakhir = [...s.lines].reverse().find((l) => l.who === id);
  let eks = 'tenang';
  if (terakhir?.broke) eks = 'retak';
  else if (terakhir?.bohong) eks = 'bohong';
  else if (nilaiMeter(s, P, id, 'tekanan') >= 2 || terakhir?.tertutup) eks = 'tertekan';
  return T.potret[eks] || T.potret.tenang;
}

function Kesaksian({ who, s }) {
  const daftar = P.kesaksian.filter((k) => k.tokoh === who && (kesaksianTersedia(k, s, P) || s.kesaksianSelesai.includes(k.id)));
  const aktifList = daftar.filter((k) => !s.kesaksianSelesai.includes(k.id));
  const [ksId, setKs] = useState(aktifList[0]?.id || null);
  const [pId, setP] = useState(null);
  const [item, setItem] = useState(null);
  const k = daftar.find((x) => x.id === ksId) || aktifList[0] || null;
  useEffect(() => { setP(null); setItem(null); }, [ksId, who]);
  if (!daftar.length) return <p className="dlg-hint">Belum ada kesaksian yang bisa dibantah. Kesaksian terbuka setelah Anda punya bukti yang relevan.</p>;
  const selesai = k && s.kesaksianSelesai.includes(k.id);
  const dibantah = (k && s.bantahan[k.id]) || [];
  const milik = [...s.bukti, ...s.kartu];
  const p = k?.pernyataan.find((x) => x.id === pId);
  return (
    <div className="ks">
      <div className="ev-filters" role="group" aria-label="Pilih kesaksian">
        {daftar.map((x) => (
          <button key={x.id} type="button" className="ev-chip ks-chip" aria-pressed={k?.id === x.id} onClick={() => setKs(x.id)}>
            {s.kesaksianSelesai.includes(x.id) && <IconCheck />} {x.judul}
          </button>
        ))}
      </div>
      {k && (
        <>
          <p className="ks-lead">{selesai ? 'Kesaksian ini sudah runtuh.' : 'Pilih pernyataan yang menurut Anda bohong, lalu sodorkan bukti atau keterangan yang membantahnya. Bantahan meleset memakan waktu dan menurunkan tekanan.'}</p>
          <ol className="ks-items">
            {k.pernyataan.map((x, i) => {
              const done = dibantah.includes(x.id);
              return (
                <li key={x.id}>
                  <button type="button" className={`ks-item${pId === x.id ? ' is-on' : ''}${done ? ' is-done' : ''}`} disabled={selesai || done}
                    aria-pressed={pId === x.id} onClick={() => setP(x.id)}>
                    <span className="ks-item__no">{i + 1}</span>
                    <span className="ks-item__text">{x.teks}</span>
                    {done && <span className="ks-item__tag">Terbantah</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          {p && !selesai && (
            <div className="ks-act">
              <p className="ks-act__q">Bantah: <q>{p.teks}</q></p>
              <div className="ks-picker" role="group" aria-label="Pilih bukti atau keterangan untuk disodorkan">
                {milik.map((id) => (
                  <button key={id} type="button" className="ks-pick" aria-pressed={item === id} onClick={() => setItem(id)} title={namaItem(id)}>
                    <b>{id}</b> <span>{namaItem(id)}</span>
                  </button>
                ))}
              </div>
              <div className="ks-act__btns">
                {p.tekan && !s.flags[`tekan:${k.id}:${p.id}`] && <button type="button" className="btn btn--secondary" onClick={() => s.tekan(k.id, p.id)}>Tekan (minta rincian)</button>}
                <button type="button" className="btn btn--danger" disabled={!item} onClick={() => { s.bantah(k.id, p.id, item); setP(null); setItem(null); }}>
                  Sodorkan {item || ''} (salah: −{K.config.biayaSalahBantahMenit} mnt)
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Dialogue() {
  const s = useGame();
  const hadir = Object.keys(K.tokoh).filter((id) => tokohHadir(id, s, P));
  const [who0, setWho] = useState(hadir[0]);
  const who = hadir.includes(who0) ? who0 : hadir[0];
  const [mode, setMode] = useState('tanya');
  const ch = K.tokoh[who];
  const sapaan = P.dialog.nodes.find((n) => n.tokoh === who && n.sapaan);
  const nodes = P.dialog.nodes.filter((n) => n.tokoh === who && nodeTersedia(n, s, P));
  const ksAktif = P.kesaksian.filter((k) => k.tokoh === who && kesaksianTersedia(k, s, P)).length;
  const tutup = tertutup(who, s);
  const maks = K.config.meterMaks;

  const total = s.lines.length;
  const [rev, setRev] = useState(total);
  const [pos, setPos] = useState(0);
  const logRef = useRef(null);

  useEffect(() => {
    if (rev > total) { setRev(total); setPos(0); return undefined; }
    if (rev === total) return undefined;
    if (reducedMotion()) { setRev(total); setPos(0); return undefined; }
    const len = s.lines[rev].text.length;
    if (pos >= len) { setRev(rev + 1); setPos(0); return undefined; }
    const t = setTimeout(() => setPos((x) => Math.min(len, x + 2)), TYPE_MS);
    return () => clearTimeout(t);
  }, [rev, pos, total, s.lines]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [total, rev, pos, who]);

  const typing = rev < total;
  const skip = () => { if (typing) { setRev(total); setPos(0); } };
  const ask = (n) => { setRev(total); setPos(0); s.ask(n.id); };
  const mine = s.lines.map((l, i) => ({ l, i })).filter(({ l, i }) => (l.who === who || (l.who === 'detektif' && l.ke === who)) && i <= rev);
  const foto = potretUntuk(who, s);

  return (
    <div className="dlg">
      <div className="dlg-suspects" role="group" aria-label="Pilih orang yang ditanyai">
        {hadir.map((id) => {
          const c = K.tokoh[id];
          const on = id === who;
          const cleared = s.cleared.includes(id);
          return (
            <button key={id} type="button" aria-pressed={on}
              className={`dlg-card${on ? ' dlg-card--on' : ''}${cleared ? ' dlg-card--cleared' : ''}${tertutup(id, s) ? ' dlg-card--closed' : ''}`}
              onClick={() => setWho(id)}>
              <span className="dlg-card__photo">
                <img src={asset(c.potret.tenang)} alt="" />
                {cleared && <span className="dlg-stamp">Bersih</span>}
                {tertutup(id, s) && <span className="dlg-stamp dlg-stamp--closed">Tertutup</span>}
              </span>
              <span className="dlg-card__name">{c.nama}</span>
              <span className="dlg-card__role">{c.peran}</span>
            </button>
          );
        })}
      </div>

      <div className="dlg-head">
        <img className="dlg-avatar dlg-avatar--lg" src={asset(foto)} alt="" />
        <div className="dlg-head__info">
          <h3 className="dlg-head__name">{ch.nama}</h3>
          <span className="dlg-head__role">{ch.peran}</span>
        </div>
        <div className="dlg-meters">
          <Meter label="Tekanan" value={nilaiMeter(s, P, who, 'tekanan')} max={maks} kind="tekanan" />
          <Meter label="Kepercayaan" value={nilaiMeter(s, P, who, 'kepercayaan')} max={maks} kind="percaya" />
        </div>
      </div>

      <div className="dlg-modes" role="tablist" aria-label="Mode interogasi">
        <button type="button" role="tab" aria-selected={mode === 'tanya'} className="dlg-mode" onClick={() => setMode('tanya')}><IconDialog /> Tanya</button>
        <button type="button" role="tab" aria-selected={mode === 'kesaksian'} className="dlg-mode" onClick={() => setMode('kesaksian')}>
          <IconEvidence /> Kesaksian {ksAktif > 0 && <span className="dlg-mode__n">{ksAktif}</span>}
        </button>
      </div>

      <div className="dlg-log" ref={logRef} role="log" aria-live="polite" onClick={skip} title={typing ? 'Klik untuk melewati' : undefined}>
        {sapaan && <p className="dlg-narration">{sapaan.teks}</p>}
        {!mine.length && <p className="dlg-hint">Pilih pertanyaan atau kesaksian di bawah untuk memulai.</p>}
        {mine.map(({ l, i }) => {
          const live = i === rev;
          const shown = live ? l.text.slice(0, pos) : l.text;
          if (l.who === 'detektif') {
            return (
              <div key={i} className="dlg-msg dlg-msg--me">
                <div className="dlg-bubble dlg-bubble--me"><span className="dlg-who">Detektif</span><p className="dlg-text">{shown}</p></div>
              </div>
            );
          }
          return (
            <div key={i} className="dlg-turn">
              {l.q && (
                <div className="dlg-msg dlg-msg--me">
                  <div className="dlg-bubble dlg-bubble--me"><span className="dlg-who">Detektif</span><p className="dlg-text">{l.q}</p></div>
                </div>
              )}
              <div className="dlg-msg dlg-msg--them">
                <img className="dlg-avatar" src={asset(ch.potret.tenang)} alt="" />
                <div className={`dlg-bubble dlg-bubble--them${l.broke ? ' dlg-bubble--broke' : ''}${l.tertutup ? ' dlg-bubble--closed' : ''}`}>
                  <span className="dlg-who">{ch.nama}</span>
                  {l.broke && <span className="dlg-broke-tag">Pertahanan runtuh</span>}
                  {live ? (
                    <p className="dlg-text"><span aria-hidden="true">{shown}<span className="dlg-caret" /></span><span className="sr-only">{l.text}</span></p>
                  ) : <p className="dlg-text">{shown}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mode === 'kesaksian' ? <Kesaksian key={who} who={who} s={s} /> : (
        <div className="dlg-questions">
          {tutup && <p className="dlg-closed"><IconLock /> {ch.nama} menutup diri. Hanya pendekatan pemulihan yang tersedia.</p>}
          {nodes.map((n) => {
            const t = NADA[n.nada] || NADA.netral;
            return (
              <button key={n.id} type="button" className={`dlg-q dlg-q--${n.nada}`} onClick={() => ask(n)}
                title={n.pemulihan ? 'Pendekatan pemulihan' : undefined}>
                <span className="dlg-q__tone"><t.Icon /><span>{t.label}</span></span>
                <span className="dlg-q__text">{n.label}</span>
                <span className="dlg-q__chips">
                  {butuhBukti(n) && <span className="dlg-chip dlg-chip--ev"><IconEvidence />Berdasar bukti</span>}
                  <span className="dlg-chip"><IconTimer />{'−'}{n.menit} mnt</span>
                </span>
              </button>
            );
          })}
          {!nodes.length && (
            <div className="dlg-empty">
              <IconDialog />
              <p className="dlg-empty__title">Tidak ada pertanyaan baru untuk {ch.nama}.</p>
              <p className="dlg-empty__body">{ksAktif ? 'Coba mode Kesaksian.' : 'Kumpulkan bukti lain; temuan baru bisa membuka pertanyaan lanjutan.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

