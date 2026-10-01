import { useState, useEffect, useRef } from 'react';
import { useGame, has } from '../store';
import { asset } from '../asset';
import D from '../data/dialog.json';
import { IconAsk, IconSympathy, IconPressure, IconEvidence, IconTimer, IconDialog } from './Icons';

const TONE = {
  neutral: { label: 'Tanya', Icon: IconAsk },
  sympathy: { label: 'Simpati', Icon: IconSympathy },
  pressure: { label: 'Desak', Icon: IconPressure },
};
const TYPE_MS = 15;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Pertanyaan detektif untuk sebuah baris; save lama tanpa field `q` dicarikan dari teks node (fallback)
const questionOf = (l) => {
  if (l.q) return l.q;
  if (l.broke) return null;
  const n = D.nodes.find((x) => x.speaker === l.who && (x.text === l.text || (x.variants || []).some((v) => v.text === l.text)));
  return n ? n.label : null;
};

function Gauge({ value, max }) {
  return (
    <div className="dlg-gauge" role="meter" aria-label="Tekanan" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span className="dlg-gauge__label">Tekanan</span>
      <span className="dlg-gauge__segs" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? 'lit' : ''} />)}
      </span>
      <span className="dlg-gauge__num" aria-hidden="true">{value}/{max}</span>
    </div>
  );
}

export default function Dialogue() {
  const s = useGame();
  const [who, setWho] = useState('vivian');
  const ch = D.characters[who];
  const p = s.pressure[who] || 0;
  const greet = D.nodes.find((n) => n.id === ch.greetingNode);
  const nodes = D.nodes.filter((n) => n.speaker === who && n.type !== 'greeting' && !s.asked.includes(n.id) &&
    has(s.evidence, n.requires.evidence) && has(s.asked, n.requires.nodes));

  // Efek mengetik: hanya baris yang ditambahkan selama komponen ini terpasang. Baris lama (rev awal) langsung tampil penuh.
  const total = s.lines.length;
  const [rev, setRev] = useState(total);   // jumlah baris yang sudah tampil penuh
  const [pos, setPos] = useState(0);       // jumlah karakter baris ke-`rev` yang sudah tampil
  const logRef = useRef(null);

  useEffect(() => {
    if (rev > total) { setRev(total); setPos(0); return undefined; }
    if (rev === total) return undefined;
    if (reducedMotion()) { setRev(total); setPos(0); return undefined; }
    const len = s.lines[rev].text.length;
    if (pos >= len) { setRev(rev + 1); setPos(0); return undefined; }
    const t = setTimeout(() => setPos((x) => Math.min(len, x + 1)), TYPE_MS);
    return () => clearTimeout(t);
  }, [rev, pos, total, s.lines]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [total, rev, pos, who]);

  const typing = rev < total;
  const skip = () => { if (typing) { setRev(total); setPos(0); } };
  const ask = (n) => { setRev(total); setPos(0); s.ask(n); };

  const mine = s.lines.map((l, i) => ({ l, i })).filter(({ l, i }) => l.who === who && i <= rev);

  return (
    <div className="dlg">
      <div className="dlg-suspects" role="group" aria-label="Pilih tersangka">
        {Object.entries(D.characters).map(([id, c]) => {
          const on = id === who;
          const cleared = s.cleared.includes(id);
          return (
            <button key={id} type="button" aria-pressed={on}
              className={`dlg-card${on ? ' dlg-card--on' : ''}${cleared ? ' dlg-card--cleared' : ''}`}
              onClick={() => setWho(id)}>
              <span className="dlg-card__photo">
                <img src={asset(c.portrait)} alt="" />
                {cleared && <span className="dlg-stamp">Bersih</span>}
              </span>
              <span className="dlg-card__name">{c.name}</span>
              <span className="dlg-card__role">{c.role}</span>
            </button>
          );
        })}
      </div>

      <div className="dlg-head">
        <img className="dlg-avatar dlg-avatar--lg" src={asset(ch.portrait)} alt="" />
        <div className="dlg-head__info">
          <h3 className="dlg-head__name">{ch.name}</h3>
          <span className="dlg-head__role">{ch.role}</span>
        </div>
        <Gauge value={p} max={D.config.pressureMax} />
      </div>

      <div className="dlg-log" ref={logRef} role="log" aria-live="polite" onClick={skip}
        title={typing ? 'Klik untuk melewati' : undefined}>
        {greet && <p className="dlg-narration">{greet.text}</p>}
        {!mine.length && <p className="dlg-hint">Pilih pertanyaan di bawah untuk memulai interogasi.</p>}
        {mine.map(({ l, i }) => {
          const q = questionOf(l);
          const live = i === rev;
          const shown = live ? l.text.slice(0, pos) : l.text;
          return (
            <div key={i} className="dlg-turn">
              {q && (
                <div className="dlg-msg dlg-msg--me">
                  <div className="dlg-bubble dlg-bubble--me">
                    <span className="dlg-who">Detektif</span>
                    <p className="dlg-text">{q}</p>
                  </div>
                </div>
              )}
              <div className="dlg-msg dlg-msg--them">
                <img className="dlg-avatar" src={asset(ch.portrait)} alt="" />
                <div className={`dlg-bubble dlg-bubble--them${l.broke ? ' dlg-bubble--broke' : ''}`}>
                  <span className="dlg-who">{ch.name}</span>
                  {l.broke && <span className="dlg-broke-tag">Pertahanan runtuh</span>}
                  {live ? (
                    <p className="dlg-text">
                      <span aria-hidden="true">{shown}<span className="dlg-caret" /></span>
                      <span className="sr-only">{l.text}</span>
                    </p>
                  ) : <p className="dlg-text">{shown}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dlg-questions">
        {nodes.map((n) => {
          const t = TONE[n.tone] || TONE.neutral;
          const needsEv = (n.requires.evidence || []).length > 0;
          return (
            <button key={n.id} type="button" className={`dlg-q dlg-q--${n.tone}`} onClick={() => ask(n)}>
              <span className="dlg-q__tone"><t.Icon /><span>{t.label}</span></span>
              <span className="dlg-q__text">{n.label}</span>
              <span className="dlg-q__chips">
                {needsEv && <span className="dlg-chip dlg-chip--ev"><IconEvidence />Tunjukkan bukti</span>}
                <span className="dlg-chip"><IconTimer />{'\u2212'}{n.timeCost} mnt</span>
              </span>
            </button>
          );
        })}
        {!nodes.length && (
          <div className="dlg-empty">
            <IconDialog />
            <p className="dlg-empty__title">Tidak ada pertanyaan baru untuk {ch.name}.</p>
            <p className="dlg-empty__body">Kumpulkan bukti lain di tab Peta atau Bukti; temuan baru bisa membuka pertanyaan lanjutan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
