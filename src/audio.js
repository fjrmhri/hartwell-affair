// Musik jazz noir prosedural + hujan + efek suara (Web Audio API). Tidak butuh file audio.
// AudioContext baru dibuat saat audio.start() dipanggil dari klik pemain (aturan autoplay browser).
const R = Math.random;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const BEAT = 60 / 66;                                              // tempo santai 66 BPM
const CHORDS = [[62, 65, 68, 72], [65, 71, 74, 79], [63, 67, 70, 74], [63, 67, 70, 74]]; // Dm7b5 G7 Cm7 Cm7
const BASS = [[50, 53, 56, 54], [55, 59, 62, 59], [48, 51, 55, 53], [48, 55, 51, 50]];    // walking bass
const SCALE = [60, 63, 65, 66, 67, 70, 72, 75];                    // blues C minor
let ctx, master, music, bus, buf, timer, step = 0, next = 0, mi = 3, muted = false;

function init() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 0.55; music.connect(master);
  bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(master);
  buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
}
const env = (g, t, a, dur, peak) => {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};
function tone(f, t, dur, type, peak, dest, lp) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  let n = o;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
  n.connect(g); g.connect(dest); env(g, t, 0.02, dur, peak); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(t, dur, type, freq, peak, dest, q = 1) {
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(dest);
  env(g, t, 0.005, dur, peak); s.start(t, R() * 1.5); s.stop(t + dur + 0.05);
}
function sax(f, t, dur) {                                          // "saksofon" sederhana: sawtooth + vibrato + lowpass
  const o = tone(f, t, dur, 'sawtooth', 0.05, music, 1300);
  const l = ctx.createOscillator(), lg = ctx.createGain();
  l.frequency.value = 5; lg.gain.value = 9; l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + 0.05);
}
function schedule(s, t) {
  const bar = Math.floor(s / 8) % 4, i = s % 8, beat = i >> 1, off = i & 1;
  if (!off) tone(midi(BASS[bar][beat]), t, BEAT * 0.9, 'triangle', 0.24, music, 500);       // bass
  if (!off || (off && (beat === 1 || beat === 3))) noise(t, 0.12, 'highpass', 6500, 0.045, music); // ride
  if ((i === 0 && R() < 0.7) || (i === 3 && R() < 0.5))                                        // piano comping
    CHORDS[bar].forEach((n, k) => tone(midi(n), t + k * 0.012, 1.1, 'triangle', 0.05, music, 2400));
  if (!off && (beat === 0 || beat === 2) && R() < (bar % 2 ? 0.25 : 0.4)) {                    // melodi jarang
    mi = Math.max(0, Math.min(SCALE.length - 1, mi + Math.floor(R() * 5) - 2));
    sax(midi(SCALE[mi]), t, BEAT * (1 + R() * 1.5));
  }
  if (R() < 0.12) noise(t + R() * 0.3, 0.012, 'highpass', 3000, 0.05, music);                // kresek piringan hitam
}
function pump() {
  while (next < ctx.currentTime + 0.2) { schedule(step, next); next += step % 2 === 0 ? (BEAT * 2) / 3 : BEAT / 3; step++; } // swing
}
function rain() {
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
  const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 1600; b.Q.value = 0.4;
  const g = ctx.createGain(); g.gain.value = 0.07; s.connect(b); b.connect(g); g.connect(master); s.start();
}
const ok = () => ctx && !muted && ctx.state !== 'closed';
const at = () => ctx.currentTime;
window.addEventListener('thunder', () => {                          // dikirim oleh Effects.jsx bersama kilat
  if (!ok()) return;
  const t = at() + 0.8 + R() * 0.6;
  noise(t, 3.5, 'lowpass', 160, 0.7, bus); noise(t + 0.3, 2.5, 'lowpass', 90, 0.6, bus);
});

export default {
  start() {
    if (!ctx) { init(); rain(); next = ctx.currentTime + 0.1; timer = setInterval(pump, 25); }
    if (ctx.state === 'suspended') ctx.resume();
  },
  setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.1); },
  collect() { if (!ok()) return; const t = at(); tone(660, t, 0.25, 'triangle', 0.12, bus); tone(990, t + 0.09, 0.35, 'triangle', 0.1, bus); },
  ask() { if (ok()) noise(at(), 0.09, 'bandpass', 3000, 0.09, bus, 2); },
  key() { if (ok()) noise(at(), 0.03, 'bandpass', 1900 + R() * 900, 0.03, bus, 3); }, // klik mesin ketik halus (cutscene)
  hint() { if (ok()) tone(880, at(), 0.6, 'sine', 0.1, bus); },
  link() { if (!ok()) return; const t = at(); tone(196, t, 0.9, 'triangle', 0.16, bus, 900); tone(392, t + 0.05, 0.7, 'triangle', 0.08, bus); },
  wrong() { if (ok()) tone(110, at(), 0.3, 'sawtooth', 0.06, bus, 500); },
  sting() { if (!ok()) return; const t = at(); [48, 51, 55].forEach((n) => tone(midi(n), t, 1.4, 'sawtooth', 0.07, bus, 700)); },
  win() { if (!ok()) return; const t = at(); [60, 63, 67, 70, 74].forEach((n, k) => tone(midi(n), t + k * 0.16, 1.4, 'triangle', 0.1, bus)); },
  lose() { if (!ok()) return; const t = at(); [55, 49].forEach((n, k) => tone(midi(n), t + k * 0.5, 1.6, 'sawtooth', 0.08, bus, 600)); },
};
