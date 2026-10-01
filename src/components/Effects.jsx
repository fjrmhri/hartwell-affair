import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../prefs';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Effects() {
  const fx = usePrefs((p) => p.fx);
  const cv = useRef(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {                                   // hujan (canvas)
    if (!fx || reduced() || !cv.current) return;
    const c = cv.current, x = c.getContext('2d');
    let w, h, drops, raf;
    const size = () => {
      w = c.width = innerWidth; h = c.height = innerHeight;
      drops = Array.from({ length: Math.floor(w / 6) }, () => ({ x: Math.random() * w, y: Math.random() * h, l: 10 + Math.random() * 16, v: 12 + Math.random() * 10 }));
    };
    const draw = () => {
      x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(200,200,200,.28)'; x.beginPath();
      for (const d of drops) {
        x.moveTo(d.x, d.y); x.lineTo(d.x - d.l * 0.25, d.y + d.l);
        d.y += d.v; d.x -= d.v * 0.25;
        if (d.y > h || d.x < 0) { d.y = -20; d.x = Math.random() * (w + 100); }
      }
      x.stroke(); raf = requestAnimationFrame(draw);
    };
    size(); draw(); addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, [fx]);

  useEffect(() => {                                   // petir acak: kilat + suara guntur (lewat event 'thunder')
    let t;
    const loop = () => { t = setTimeout(() => { dispatchEvent(new Event('thunder')); setFlash((k) => k + 1); loop(); }, 25000 + Math.random() * 40000); };
    loop();
    return () => clearTimeout(t);
  }, []);

  if (!fx) return null;
  return (<>
    <canvas ref={cv} className="rain" />
    <div className="vignette" />
    <div className="grain" />
    {flash > 0 && <div key={flash} className="flash" />}
  </>);
}
