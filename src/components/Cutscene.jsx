import { useEffect, useRef, useState } from 'react';
import Scene from './Scene';
import audio from '../audio';
import { asset } from '../asset';
import { IconArrowRight } from './Icons';

const CAMS = ['zin', 'panl', 'zout', 'panr'];          // variasi gerak kamera bila slide tidak menentukan `kamera`
const XFADE = 800;                                     // slide lama bertahan selama crossfade (ms)
const isQuote = (l) => /^["“„]/.test(l);
const TYPE_MS = 26, KEY_EVERY = 3;                     // suara ketik tiap 3 karakter

function Lines({ lines, n, caret }) {                  // render baris; n = jumlah karakter terlihat (Infinity = semua)
  const starts = lines.map((_, k) => lines.slice(0, k).reduce((a, x) => a + x.length + 2, 0));
  const lastVis = starts.reduce((acc, st, k) => (k === 0 || n > st ? k : acc), 0);
  return lines.map((l, k) => (
    <p key={k} className={`narr-line${isQuote(l) ? ' q' : ''}`}>
      {k <= lastVis && l.slice(0, Math.max(0, n - starts[k]))}
      {caret && k === lastVis && <span className="caret">▌</span>}
    </p>
  ));
}

function Slide({ sl, i, total, last, slate, advRef, onNext }) {
  const [n, setN] = useState(0);                       // jumlah karakter yang sudah "diketik"
  const text = sl.lines.join('\n\n'), typing = n < text.length;
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => {
      if (n % KEY_EVERY === 0 && !/\s/.test(text[n])) audio.key();
      setN(n + 1);
    }, TYPE_MS);
    return () => clearTimeout(t);
  }, [n, typing, text]);
  const click = () => { if (typing) setN(text.length); else { audio.ask(); onNext(); } };
  advRef.current = click;
  useEffect(() => {
    const k = (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.repeat || e.target.closest?.('button')) return;   // tombol yang fokus punya aksinya sendiri
      e.preventDefault();
      click();
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });
  return (<>
    <div className={`cut-head${slate ? ' cut-head--slate' : ''}${sl.title ? ' cut-head--title' : ''}`}>
      {slate && <div className="slate"><span>{slate}</span></div>}
      {sl.title && <div className="ctitle-wrap"><i className="rule" /><h1 className="ctitle">{sl.title === 'THE HARTWELL AFFAIR' ? <>THE HARTWELL<br />AFFAIR</> : sl.title}</h1><i className="rule" /></div>}
    </div>
    <div className="sub">
      <p className="sr-only">{text}</p>
      <div className="narr" aria-hidden="true">
        <div className="narr-ghost"><Lines lines={sl.lines} n={Infinity} /></div>
        <div className="narr-live"><Lines lines={sl.lines} n={n} caret /></div>
      </div>
    </div>
    <div className="bar bot">
      <div className="prog" role="progressbar" aria-label="Kemajuan adegan" aria-valuemin={1} aria-valuemax={total} aria-valuenow={i + 1}>
        {Array.from({ length: total }, (_, k) => <i key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />)}
      </div>
      <span className={`hintk${typing ? ' hintk--off' : ''}`} aria-hidden={typing}>
        klik<span className="hk-kb"> / Spasi / Enter</span> {last ? 'untuk mengakhiri' : 'untuk lanjut'}
      </span>
    </div>
  </>);
}

export default function Cutscene({ slides, onDone, slate }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(null);              // indeks slide lama selama crossfade
  const [leaving, setLeaving] = useState(false);       // fade-to-black sebelum onDone
  const advRef = useRef(() => {}), doneRef = useRef(false), timers = useRef([]), doneCb = useRef(onDone);
  doneCb.current = onDone;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const finish = (fast) => {                           // sekali saja; fade lalu panggil onDone
    if (doneRef.current) return;
    doneRef.current = true; setLeaving(fast ? 'fast' : 'slow');
    later(() => doneCb.current(), fast ? 450 : 900);
  };
  const next = () => {
    if (doneRef.current) return;
    if (i >= slides.length - 1) return finish(false);
    setPrev(i); setI(i + 1);
    later(() => setPrev(null), XFADE);
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { e.preventDefault(); finish(true); } };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  const showSlate = slate || null;
  // Lapisan slide: latar Scene + potret opsional; kilas balik dan transisi "bakar" memakai kelas CSS sendiri
  const layer = (idx, cls) => {
    const sl = slides[idx];
    const kelas = ['cut-bg', cls, sl.kilasBalik ? 'cut-bg--kilas' : '', sl.transisi === 'bakar' ? 'cut-bg--bakar' : ''].filter(Boolean).join(' ');
    return (
      <div key={`bg${idx}`} className={kelas}>
        <div className={`cam cam--${sl.kamera || CAMS[idx % CAMS.length]}`}>
          <Scene kind={sl.scene} />
          {sl.potret && <img className={`cut-potret cut-potret--${sl.posisi || 'kanan'}`} src={asset(sl.potret)} alt="" />}
        </div>
      </div>
    );
  };
  return (<>
    <div className="cut" onClick={() => !doneRef.current && advRef.current()}>
      {prev !== null && layer(prev, 'is-out')}
      {layer(i, 'is-in')}
      <div className="cut-ui" key={`ui${i}`}>
        <div className="bar top" />
        <Slide sl={slides[i]} i={i} total={slides.length} last={i === slides.length - 1}
          slate={i === 0 ? showSlate : null} advRef={advRef} onNext={next} />
      </div>
      <div className={`cut-fade${leaving ? ` on ${leaving}` : ''}`} />
    </div>
    <button className="btn btn--secondary skip" onClick={() => finish(true)} aria-label="Lewati adegan (Esc)">
      Lewati <IconArrowRight />
    </button>
  </>);
}
