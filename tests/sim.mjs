// Simulasi alur permainan memakai store ASLI (src/store.js). Jalankan: npm run test:sim
import fs from 'fs';
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = globalThis; globalThis.addEventListener = () => {};
const { useGame, has, evAvailable } = await import('../.simcache/store.mjs');
const J = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/${f}.json`, import.meta.url)));
const C = J('case'), D = J('dialog'), DOCS = J('documents');
const G = () => useGame.getState();
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? '✔' : '✘'} ${m}`); if (!c) fails++; };
const sec = (t) => console.log(`\n${t}`);
const nodeById = Object.fromEntries(D.nodes.map((n) => [n.id, n])), evById = Object.fromEntries(C.evidence.map((e) => [e.id, e]));
const askable = (n) => n.type !== 'greeting' && !G().asked.includes(n.id) && has(G().evidence, n.requires.evidence) && has(G().asked, n.requires.nodes);
function rngOf(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Pemain otomatis: lakukan semua aksi yang tersedia (urutan tetap, atau acak bila rng diberikan)
function sweep(rng) {
  for (;;) {
    const acts = [];
    C.evidence.forEach((e) => evAvailable(e, G()) && acts.push(() => G().collect(e.id)));
    D.nodes.forEach((n) => askable(n) && acts.push(() => G().ask(n)));
    C.deductions.forEach((d) => !G().confirmed.includes(d.id) && d.link.every((x) => G().evidence.includes(x)) && acts.push(() => G().link(d.link[0], d.link[1])));
    if (!acts.length || G().status !== 'playing') return;
    acts[rng ? Math.floor(rng() * acts.length) : 0]();
  }
}
const fresh = (diff = 'normal', rng) => { G().start(diff); useGame.setState({ timeLeft: 999999 }); sweep(rng); };
const broke = (who) => G().lines.some((l) => l.who === who && l.broke);

sec('1. Kelengkapan data & konsistensi antar file');
const assets = [...C.evidence.map((e) => e.image), ...Object.values(C.locations).map((l) => l.map), ...Object.values(D.characters).map((c) => c.portrait)];
ok(assets.every((a) => fs.existsSync(new URL(`../public/${a}`, import.meta.url))), `semua ${new Set(assets).size} file aset gambar ada`);
ok(C.evidence.every((e) => DOCS[e.id]) && Object.keys(DOCS).length === C.evidence.length, 'setiap bukti punya dokumen isi');
ok(C.evidence.every((e) => e.hotspot.x >= 0 && e.hotspot.x <= 100 && e.hotspot.y >= 0 && e.hotspot.y <= 100), 'hotspot bukti berada dalam ruangan (0-100)');
const dlgConfirm = {}; D.nodes.forEach((n) => [n.effects, n.onBreak?.effects, ...(n.conditionalEffects || []).map((c) => c.effects)].forEach((f) => f?.confirmDeductions?.forEach((d) => (dlgConfirm[d] ||= new Set()).add(n.id))));
ok(C.deductions.every((d) => d.confirmedByDialog.every((n) => dlgConfirm[d.id]?.has(n))), 'confirmedByDialog di case.json cocok dengan efek di dialog.json');
ok(new Set(C.hints.map((h) => h.id)).size === C.hints.length && C.hints.every((h) => h.when.evidence.every((e) => evById[e])), 'petunjuk (hints): ID unik & merujuk bukti valid');

sec('2. Keterjangkauan penuh (pemain yang melakukan semua hal, waktu tak terbatas)');
fresh();
const allNodes = D.nodes.filter((n) => n.type !== 'greeting');
ok(G().evidence.length === C.evidence.length, `semua ${C.evidence.length} bukti bisa didapat (dapat ${G().evidence.length})`);
const missing = allNodes.filter((n) => !G().asked.includes(n.id)).map((n) => n.id);
ok(!missing.length, `semua ${allNodes.length} node dialog bisa ditanyakan${missing.length ? ' (tak terjangkau: ' + missing + ')' : ''}`);
ok(G().confirmed.length === C.deductions.length, `semua ${C.deductions.length} deduksi bisa dikonfirmasi (dapat ${G().confirmed.length})`);
ok(broke('vivian') && broke('lowell'), 'Vivian dan Lowell sama-sama "retak" (mengaku)');
ok(G().cleared.includes('charles') && G().cleared.includes('graves'), 'Charles dan Graves berhasil dibersihkan dari daftar tersangka');
const spent = (999999 - G().timeLeft) / 60;
console.log(`  ℹ total waktu bila mengerjakan SEMUA hal: ${spent} menit (timer: easy ${C.config.difficulty.easy.timerMinutes}, normal ${C.config.difficulty.normal.timerMinutes}, hard ${C.config.difficulty.hard.timerMinutes})`);
let h = 0; while (G().status === 'playing' && h < 30) { const b = G().hintsUsed.length; G().hint(); if (G().hintsUsed.length === b) break; h++; }
ok(G().hintsUsed.length === C.hints.length, `semua ${C.hints.length} petunjuk bisa muncul (muncul ${G().hintsUsed.length})`);

sec('3. Analisis jalan buntu: tekanan minimum yang DIJAMIN sebelum node pengakuan');
const chain = (id, sp, seen = new Set()) => { if (seen.has(id)) return seen; seen.add(id); nodeById[id].requires.nodes.forEach((r) => nodeById[r].speaker === sp && chain(r, sp, seen)); return seen; };
D.nodes.filter((n) => n.breakCheck).forEach((n) => {
  const g = [...chain(n.id, n.speaker)].reduce((a, id) => a + nodeById[id].pressure, 0);
  ok(g >= D.config.breakThreshold, `${n.id} (${n.speaker}): tekanan terjamin ${g} dari minimal ${D.config.breakThreshold}`);
});

sec('4. Uji acak: 300 permainan dengan urutan aksi acak');
let noBreak = { vivian: 0, lowell: 0 }, incomplete = 0;
for (let i = 1; i <= 300; i++) {
  fresh('normal', rngOf(i));
  if (!broke('vivian')) noBreak.vivian++; if (!broke('lowell')) noBreak.lowell++;
  if (G().evidence.length < 16 || G().confirmed.length < 6) incomplete++;
}
ok(incomplete === 0, `semua permainan acak menjangkau 16 bukti & 6 deduksi (gagal: ${incomplete}/300)`);
ok(noBreak.vivian === 0 && noBreak.lowell === 0, `pengakuan selalu terpicu (Vivian gagal: ${noBreak.vivian}, Lowell gagal: ${noBreak.lowell} dari 300)`);

sec('5. Jalur menang tercepat per tingkat kesulitan (perencana berbasis dependensi)');
const cl = (acc) => acc;
function needEv(id, a) { if (a.ev.has(id)) return a; a.ev.add(id); const e = evById[id], L = C.locations[e.location];
  e.requires.evidence.forEach((x) => needEv(x, a)); e.requires.nodes.forEach((n) => needNode(n, a));
  if (!L.unlocked && L.unlock) { L.unlock.evidence.forEach((x) => needEv(x, a)); L.unlock.nodes.forEach((n) => needNode(n, a)); } return a; }
function needNode(id, a) { if (a.nodes.has(id)) return a; a.nodes.add(id); const n = nodeById[id]; n.requires.evidence.forEach((x) => needEv(x, a)); n.requires.nodes.forEach((x) => needNode(x, a)); return a; }
const cost = (a) => a.ev.size * C.config.explorationCostMinutes + [...a.nodes].reduce((s, n) => s + nodeById[n].timeCost, 0);
const combos = (arr, k) => k === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), k - 1).map((r) => [x, ...r]));
const bestPlan = (k, extra = []) => combos(C.deductions, k).map((sub) => { const a = { ev: new Set(), nodes: new Set() }; sub.forEach((d) => d.link.forEach((e) => needEv(e, a))); extra.forEach((e) => needEv(e, a)); return { a, c: cost(a) }; }).sort((x, y) => x.c - y.c)[0];
const bonusEv = [...C.solution.motive.evidence, ...C.solution.method.evidence];
const REAL_MIN = 40;                                             // asumsi: pemain ahli memakai 40 menit nyata
const TARGET = { easy: { all: [0, 1.0], expert: 0.6 }, normal: { all: [1.1, 1.6], expert: 0.7 }, hard: { all: [1.6, 2.4], expert: 0.9 } };
for (const [name, cfg] of Object.entries(C.config.difficulty)) {
  const T = cfg.timerMinutes, k = cfg.deductionsRequired, fast = bestPlan(k).c, ideal = bestPlan(k, bonusEv).c, idle = cfg.realtimeFactor * REAL_MIN;
  const ratio = spent / T, [lo, hi] = TARGET[name].all;
  ok(ratio >= lo && ratio <= hi, `${name}: mengerjakan SEMUA butuh ${spent}m = ${ratio.toFixed(2)}x timer ${T}m (target ${lo}-${hi}x)`);
  ok(ideal + idle <= T * TARGET[name].expert, `${name}: pemain ahli (jalur ideal ${ideal}m + waktu nyata ${idle}m) memakai ${Math.round(((ideal + idle) / T) * 100)}% timer (batas ${TARGET[name].expert * 100}%)`);
  ok(fast + idle < T, `${name}: jalur tercepat ${fast}m + waktu nyata ${idle}m < ${T}m (masih bisa menang)`);
}

sec('6. Jalur menang & skor');
fresh(); useGame.setState({ timeLeft: 45 * 60 });
G().accuse(['vivian', 'lowell']);
ok(G().status === 'ending' && G().score?.total > 0, `tuduhan benar → cutscene ending, skor ${G().score?.total} (${JSON.stringify(G().score)})`);
G().finishEnding(); ok(G().status === 'won', 'setelah ending → layar hasil (status won)');

sec('7. Jalur game over');
G().start('normal'); G().accuse(['vivian', 'lowell']);
ok(G().status === 'playing' && /Belum cukup/.test(G().msg), 'menuduh sebelum cukup deduksi ditolak (tidak langsung game over)');
fresh(); G().accuse(['charles', 'graves']); ok(G().status === 'lost' && G().reason === 'wrong' && !G().partial, 'dua nama salah → "Tuduhan Salah"');
fresh(); G().accuse(['vivian']); ok(G().status === 'lost' && G().partial, 'hanya satu pelaku benar → "Separuh Kebenaran"');
fresh(); G().accuse(['vivian', 'lowell', 'graves']); ok(G().status === 'lost' && G().partial, 'pelaku benar + satu nama ekstra → kalah (harus persis)');
G().start('hard'); useGame.setState({ timeLeft: 2 }); let nt = 0; while (G().status === 'playing' && nt < 100) { G().tick(); nt++; }
ok(G().status === 'lost' && G().reason === 'timeout', `timer habis lewat waktu nyata (hard) → "Kasus Dingin" setelah ${nt} detik`);
G().start('easy'); useGame.setState({ timeLeft: 30 }); G().collect('E01');
ok(G().status === 'lost' && G().reason === 'timeout', 'waktu habis karena aksi (menjelajah) → "Kasus Dingin"');
G().start('normal'); useGame.setState({ timeLeft: 120 }); G().hint();
ok(G().status === 'lost' && G().reason === 'timeout', 'waktu habis karena memakai petunjuk → "Kasus Dingin"');

sec('8. Alur menu, simpan progres, dan lanjutkan');
G().begin('easy'); ok(G().status === 'intro', 'Mulai → intro'); const tBefore = G().timeLeft;
G().tick(); ok(G().timeLeft === tBefore, 'timer TIDAK jalan saat intro');
G().finishIntro(); ok(G().status === 'playing' && G().timeLeft === C.config.difficulty.easy.timerMinutes * 60, 'intro selesai → kasus dimulai dengan timer penuh');
G().collect('E01'); G().collect('E02'); const snap = { ev: [...G().evidence], t: G().timeLeft };
const raw = mem['hartwell-save-v1'], saved = JSON.parse(raw).state;
ok(saved.status === 'paused' && saved.evidence.length === 2, 'progres tersimpan di localStorage sebagai "paused"');
useGame.setState({ status: 'menu', evidence: [], timeLeft: 0 }); mem['hartwell-save-v1'] = raw; await useGame.persist.rehydrate(); // meniru reload: state kosong, save di disk utuh
ok(G().status === 'paused' && G().evidence.join() === snap.ev.join() && G().timeLeft === snap.t, 'reload → progres pulih & game dijeda');
G().tick(); ok(G().timeLeft === snap.t, 'timer tidak jalan saat dijeda'); G().resume(); ok(G().status === 'playing', 'Lanjutkan → bermain lagi');
fresh(); G().accuse(['charles']); ok(JSON.parse(mem['hartwell-save-v1']).state.status === 'menu', 'setelah kalah, save dibersihkan (tidak ada "Lanjutkan" basi)');

sec('9. Anti-eksploit & waktu nyata');
G().start('easy'); let t0 = G().timeLeft; for (let i = 0; i < 600; i++) G().tick();
ok(G().timeLeft === t0, 'easy: timer tidak berkurang saat pemain menganggur (faktor 0)');
G().start('hard'); t0 = G().timeLeft; for (let i = 0; i < 100; i++) G().tick();
ok(Math.abs(t0 - G().timeLeft - 40) < 1e-6, 'hard: 100 detik nyata = 40 detik permainan (faktor 0.4)');
useGame.setState({ doc: 'E01' }); t0 = G().timeLeft; for (let i = 0; i < 100; i++) G().tick();
ok(G().timeLeft === t0, 'timer berhenti selama dokumen bukti dibaca'); useGame.setState({ doc: null });
const allIds = C.evidence.map((e) => e.id), pairs = combos(allIds, 2);
for (const [name, cfg] of Object.entries(C.config.difficulty)) {
  let sum = 0; const N = 40;
  for (let i = 1; i <= N; i++) {
    G().start(name); useGame.setState({ timeLeft: 999999, evidence: allIds }); const r = rngOf(i * 97), before = G().timeLeft, order = [...pairs];
    for (let x = order.length - 1; x > 0; x--) { const y = Math.floor(r() * (x + 1)); [order[x], order[y]] = [order[y], order[x]]; }
    for (const [a, b] of order) { if (G().confirmed.length >= cfg.deductionsRequired) break; G().link(a, b); }
    sum += (before - G().timeLeft) / 60;
  }
  ok(sum / N > cfg.timerMinutes, `${name}: menebak semua pasangan bukti butuh rata-rata ${Math.round(sum / N)}m > timer ${cfg.timerMinutes}m (tidak layak)`);
}

sec('10. Skor & peringkat per profil pemain');
const rankOf = (pct) => J('story').ranks.find(([m]) => pct >= m)[1];
function play({ diff, plan, hints = 0, wrong = 0 }) {
  G().start(diff); const ev = [...plan.a.ev], nodes = [...plan.a.nodes];
  for (let g = 0; g < 300; g++) {
    const acts = [];
    C.evidence.forEach((e) => ev.includes(e.id) && evAvailable(e, G()) && acts.push(() => G().collect(e.id)));
    D.nodes.forEach((n) => nodes.includes(n.id) && askable(n) && acts.push(() => G().ask(n)));
    C.deductions.forEach((d) => !G().confirmed.includes(d.id) && d.link.every((x) => G().evidence.includes(x)) && acts.push(() => G().link(d.link[0], d.link[1])));
    if (!acts.length) break; acts[0]();
  }
  for (let i = 0; i < hints; i++) G().hint();
  for (let i = 0; i < wrong; i++) G().link('E01', 'E06');              // pasangan yang pasti salah
  useGame.setState({ doc: null }); G().accuse(['vivian', 'lowell']);
  return { st: G().status, ...(G().score || {}) };
}
const totals = {};
for (const [diff, cfg] of Object.entries(C.config.difficulty)) {
  const k = cfg.deductionsRequired;
  const R = { ahli: play({ diff, plan: bestPlan(k, bonusEv) }), minimalis: play({ diff, plan: bestPlan(k) }), ceroboh: play({ diff, plan: bestPlan(k, bonusEv), hints: 2, wrong: 3 }) };
  totals[diff] = R.ahli.total;
  for (const [n, r] of Object.entries(R)) console.log(`  ℹ ${diff.padEnd(6)} ${n.padEnd(9)} ${r.st === 'ending' ? `skor ${r.total}/${r.max} (${r.pct}%) peringkat ${rankOf(r.pct)}` : 'KALAH (' + r.st + ')'}`);
  ok(R.ahli.st === 'ending' && rankOf(R.ahli.pct) === 'S', `${diff}: pemain ahli menang & meraih peringkat S`);
  // di hard, 5 deduksi wajib sudah memaksa mengumpulkan bukti motif & metode, jadi jalur minimalis = ideal
  ok(R.minimalis.st === 'ending' && (diff === 'hard' ? R.minimalis.pct <= R.ahli.pct : R.minimalis.pct < R.ahli.pct), `${diff}: jalur minimalis menang dengan skor ${diff === 'hard' ? '<=' : '<'} pemain ahli`);
  ok(R.ceroboh.st === 'ending' && R.ceroboh.pct < R.ahli.pct && rankOf(R.ceroboh.pct) !== 'S', `${diff}: pemain ceroboh (2 petunjuk, 3 salah hubung) menang tapi turun dari peringkat S`);
}
ok(totals.hard > totals.normal && totals.normal > totals.easy, `pengali kesulitan bekerja: skor ahli hard ${totals.hard} > normal ${totals.normal} > easy ${totals.easy}`);

console.log(fails ? `\n✘ ${fails} pemeriksaan GAGAL` : '\n✔ Semua pemeriksaan lolos');
process.exit(fails ? 1 : 0);
