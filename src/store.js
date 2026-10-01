import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import sfx from './audio';
import C from './data/case.json';
import D from './data/dialog.json';

export const has = (arr, list = []) => list.every((x) => arr.includes(x));
export const locOpen = (l, s) => l.unlocked || (l.unlock && has(s.evidence, l.unlock.evidence) && has(s.asked, l.unlock.nodes));
export const evAvailable = (e, s) =>
  !s.evidence.includes(e.id) && locOpen(C.locations[e.location], s) &&
  has(s.evidence, e.requires.evidence) && has(s.asked, e.requires.nodes);

const init = { status: 'menu', diff: 'normal', timeLeft: 0, evidence: [], asked: [], pressure: {},
  notebook: [], confirmed: [], cleared: [], hintsUsed: [], lines: [], msg: '', boardPos: {}, reason: '', score: null, accused: [], partial: false, wrongLinks: 0, doc: null };

// Kurangi waktu (menit); bila habis -> kalah
const drain = (s, m) => {
  const t = s.timeLeft - m * 60;
  if (t <= 0) sfx.lose();
  return t <= 0 ? { timeLeft: 0, status: 'lost', reason: 'timeout', msg: 'Waktu habis. Kasus ini menjadi dingin...' } : { timeLeft: t };
};
const note = (s, t) => (s.notebook.includes(t) ? s.notebook : [...s.notebook, t]);

export const useGame = create(persist((set, get) => ({
  ...init,
  start: (diff) => set({ ...init, status: 'playing', diff, timeLeft: C.config.difficulty[diff].timerMinutes * 60 }),
  moveCard: (id, x, y) => set((s) => ({ boardPos: { ...s.boardPos, [id]: { x, y } } })),
  begin: (diff) => set({ ...init, status: 'intro', diff }),
  finishIntro: () => get().start(get().diff),
  finishEnding: () => set({ status: 'won' }),
  openDoc: (id) => set({ doc: id }),
  resume: () => set({ status: 'playing' }),
  // Waktu nyata mengurangi timer hanya sebesar realtimeFactor; berhenti saat dokumen dibaca.
  tick: () => set((s) => {
    if (s.status !== 'playing' || s.doc) return s;
    const f = C.config.difficulty[s.diff].realtimeFactor || 0;
    if (!f) return s;
    if (s.timeLeft - f <= 0) { sfx.lose(); return { timeLeft: 0, status: 'lost', reason: 'timeout', msg: 'Waktu habis. Kasus ini menjadi dingin...' }; }
    return { timeLeft: s.timeLeft - f };
  }),

  collect: (id) => set((s) => {
    const e = C.evidence.find((x) => x.id === id);
    if (s.evidence.includes(id)) return s;
    sfx.collect();
    return { doc: id, evidence: [...s.evidence, id], notebook: note(s, `Bukti ${id}: ${e.name}. ${e.description}`),
      msg: `Bukti ditemukan: ${e.name}`, ...drain(s, C.config.explorationCostMinutes) };
  }),

  ask: (n) => set((s) => {
    if (s.asked.includes(n.id)) return s;
    let text = n.text;
    (n.variants || []).forEach((v) => { if (has(s.evidence, v.if.evidence)) text = v.text; });
    const fx = [n.effects || {}];
    (n.conditionalEffects || []).forEach((c) => { if (has(s.evidence, c.if.evidence)) fx.push(c.effects); });
    const p = Math.min(D.config.pressureMax, (s.pressure[n.speaker] || 0) + n.pressure);
    const lines = [{ who: n.speaker, text, q: n.label }];
    sfx.ask();
    if (n.breakCheck && n.onBreak && p >= D.config.breakThreshold) {
      lines.push({ who: n.speaker, text: n.onBreak.text, broke: true });
      fx.push(n.onBreak.effects);
      sfx.sting();
    }
    let notebook = s.notebook, confirmed = s.confirmed, cleared = s.cleared;
    fx.forEach((f) => {
      (f.notebook || []).forEach((t) => { notebook = notebook.includes(t) ? notebook : [...notebook, t]; });
      confirmed = [...new Set([...confirmed, ...(f.confirmDeductions || [])])];
      if (f.clearSuspect) cleared = [...new Set([...cleared, f.clearSuspect])];
    });
    return { asked: [...s.asked, n.id], pressure: { ...s.pressure, [n.speaker]: p }, notebook, confirmed, cleared,
      lines: [...s.lines, ...lines], ...drain(s, n.timeCost) };
  }),

  link: (a, b) => set((s) => {
    const d = C.deductions.find((x) => a !== b && x.link.includes(a) && x.link.includes(b));
    if (!d) { sfx.wrong(); return { msg: `Tidak ada hubungan yang jelas antara kedua bukti ini. (-${C.config.wrongLinkCostMinutes} menit)`, wrongLinks: s.wrongLinks + 1, ...drain(s, C.config.wrongLinkCostMinutes) }; }
    if (s.confirmed.includes(d.id)) return { msg: `Deduksi ${d.id} sudah terkonfirmasi.` };
    sfx.link();
    return { confirmed: [...s.confirmed, d.id], notebook: note(s, `Deduksi ${d.id}: ${d.title}. ${d.conclusion}`),
      msg: `Deduksi terbuka: ${d.title}` };
  }),

  hint: () => set((s) => {
    const h = [...C.hints].reverse().find((x) => !s.hintsUsed.includes(x.id) && has(s.evidence, x.when.evidence));
    if (!h) return { msg: 'Tidak ada petunjuk baru saat ini.' };
    sfx.hint();
    return { hintsUsed: [...s.hintsUsed, h.id], notebook: note(s, `Petunjuk: ${h.text}`), msg: `Petunjuk: ${h.text}`,
      ...drain(s, C.config.difficulty[s.diff].hintCostMinutes) };
  }),

  accuse: (names) => set((s) => {
    const need = C.config.difficulty[s.diff].deductionsRequired;
    if (s.confirmed.length < need) return { msg: `Belum cukup deduksi (${s.confirmed.length}/${need}).` };
    const ok = names.length === C.solution.culprits.length && C.solution.culprits.every((c) => names.includes(c));
    (ok ? sfx.win : sfx.lose)();
    if (!ok) return { status: 'lost', reason: 'wrong', accused: names, partial: names.some((n) => C.solution.culprits.includes(n)), msg: 'Tuduhan salah.' };
    const sc = C.solution.scoring, dif = C.config.difficulty[s.diff], held = (l) => l.every((x) => s.evidence.includes(x));
    const score = { base: sc.correctCulprits, motive: held(C.solution.motive.evidence) ? sc.motiveBonus : 0,
      method: held(C.solution.method.evidence) ? sc.methodBonus : 0,
      time: Math.round(sc.timeBonusMax * (s.timeLeft / (dif.timerMinutes * 60))),       // bonus proporsional terhadap total timer
      hints: -sc.hintPenalty * s.hintsUsed.length, links: -sc.wrongLinkPenalty * s.wrongLinks };
    const sub = Object.values(score).reduce((a, b) => a + b, 0);
    score.mult = dif.scoreMultiplier;
    score.total = Math.max(0, Math.round(sub * dif.scoreMultiplier));
    score.max = Math.round((sc.correctCulprits + sc.motiveBonus + sc.methodBonus + sc.timeBonusMax) * dif.scoreMultiplier);
    score.pct = Math.round((score.total / score.max) * 100);
    return { status: 'ending', score, msg: 'Kasus terpecah!' };
  }),
}), {
  name: 'hartwell-save-v1', version: 1,
  // Simpan progres hanya saat kasus berjalan; setelah reload game 'dijeda' agar timer tidak jalan sendiri.
  partialize: (s) => (s.status === 'playing' || s.status === 'paused'
    ? { status: 'paused', diff: s.diff, timeLeft: s.timeLeft, evidence: s.evidence, asked: s.asked, pressure: s.pressure,
        notebook: s.notebook, confirmed: s.confirmed, cleared: s.cleared, hintsUsed: s.hintsUsed, lines: s.lines, boardPos: s.boardPos, wrongLinks: s.wrongLinks }
    : { status: 'menu' }),
}));
