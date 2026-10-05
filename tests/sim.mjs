// Simulasi alur permainan v2 memakai engine dan paket kasus ASLI. Jalankan: npm run test:sim
import fs from 'fs';
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = globalThis; globalThis.addEventListener = () => {};
const { P, A, cekSyarat, validasiPaket, useGame, KUNCI_SAVE, migrasiSaveLama } = await import('../.simcache/sim.mjs');

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? '✔' : '✘'} ${m}`); if (!c) fails++; };
const info = (m) => console.log(`  ℹ ${m}`);
const sec = (t) => console.log(`\n${t}`);
const K = P.kasus;
const rngOf = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const TIMER = (d) => K.config.kesulitan[d].timerMenit;
const benarTekaTeki = (t) => {
  if (t.jenis === 'pilihan') return t.benar;
  if (t.jenis === 'sandi') return t.kunci;
  if (t.jenis === 'grid') return { ...t.solusi };
  return { ...t.kunci };
};

/* ---------- Pemain otomatis ---------- */
// mode: 'semua' (lakukan semua hal, urutan tetap), 'acak' (urutan dan pilihan acak, termasuk kesalahan), atau daftar putih (ahli)
function aksiTersedia(s, opsi) {
  const acts = [], rng = opsi.rng, putih = opsi.putih;
  const boleh = (jenis, id) => !putih || putih[jenis]?.includes(id);
  for (const b of K.bukti) if (A.buktiTersedia(b, s, P) && boleh('bukti', b.id)) acts.push(['bukti', b.id, (x) => { x = A.kunjungi(x, P, b.lokasi).state; return A.periksa(x, P, b.id).state; }]);
  for (const [lok, L] of Object.entries(K.lokasi)) for (const inf of L.info || []) {
    if (!A.infoTersedia(lok, inf, s, P) || !boleh('info', inf.id)) continue;
    if (inf.id === 'I-surat-s' && !rng && !opsi.bacaSurat) continue;
    acts.push(['info', inf.id, (x) => { x = A.kunjungi(x, P, lok).state; return A.periksaInfo(x, P, lok, inf.id).state; }]);
  }
  for (const n of P.dialog.nodes) {
    if (!A.nodeTersedia(n, s, P) || !boleh('node', n.id)) continue;
    if (!rng && !putih && n.nada === 'desak' && K.tokoh[n.tokoh].bisaMenutupDiri) {
      // pemain "semua" yang sopan: mendesak hanya bila kepercayaan cukup agar tidak menutup diri
      const kp = s.meter[n.tokoh]?.kepercayaan ?? K.tokoh[n.tokoh].meterAwal.kepercayaan;
      if (kp + (K.tokoh[n.tokoh].watak.desak.kepercayaan || 0) <= 0) continue;
    }
    acts.push(['node', n.id, (x) => A.tanya(x, P, n.id).state]);
  }
  for (const k of P.kesaksian) {
    if (!A.kesaksianTersedia(k, s, P) || !boleh('kesaksian', k.id)) continue;
    for (const p of k.pernyataan) {
      if (!p.bantah?.length || (s.bantahan[k.id] || []).includes(p.id)) continue;
      const punya = p.bantah.flatMap((b) => b.dengan).find((id) => s.bukti.includes(id) || s.kartu.includes(id));
      if (rng && rng() < 0.15) {
        const salah = [...s.bukti, ...s.kartu].find((id) => !p.bantah.some((b) => b.dengan.includes(id)));
        if (salah) acts.push(['bantahSalah', `${k.id}.${p.id}`, (x) => A.bantah(x, P, k.id, p.id, salah).state]);
      }
      if (punya) acts.push(['bantah', `${k.id}.${p.id}`, (x) => A.bantah(x, P, k.id, p.id, punya).state]);
    }
  }
  for (const d of P.deduksi.benar) {
    if (s.deduksi.includes(d.id) || !d.kartu.length || !boleh('deduksi', d.id)) continue;
    if (d.kartu.every((id) => s.bukti.includes(id) || s.kartu.includes(id)) && cekSyarat(d.syarat, s, P))
      acts.push(['deduksi', d.id, (x) => A.hubungkan(x, P, d.kartu).state]);
  }
  for (const t of P.tekaTeki) {
    if (!A.tekaTekiTersedia(t, s, P) || !boleh('tekaTeki', t.id)) continue;
    if (rng && t.jenis !== 'sandi' && rng() < 0.2) acts.push(['tekaTekiSalah', t.id, (x) => A.jawabTekaTeki(x, P, t.id, t.jenis === 'pilihan' ? 'a' : {}).state]);
    acts.push(['tekaTeki', t.id, (x) => A.jawabTekaTeki(x, P, t.id, benarTekaTeki(t)).state]);
  }
  if (opsi.pengecoh) for (const f of P.deduksi.pengecoh) {
    if (!s.pengecoh.includes(f.id) && f.kartu.every((id) => s.bukti.includes(id) || s.kartu.includes(id)))
      acts.push(['pengecoh', f.id, (x) => A.hubungkan(x, P, f.kartu).state]);
  }
  return acts;
}

function main(s, opsi = {}) {
  const log = [];
  for (let langkah = 0; langkah < 5000; langkah++) {
    while (s.antreanCutscene.length) s = A.selesaiCutscene(s).state;
    if (s.status !== 'playing') break;
    const acts = aksiTersedia(s, opsi);
    if (!acts.length) break;
    const a = acts[opsi.rng ? Math.floor(opsi.rng() * acts.length) : opsi.balik ? acts.length - 1 : 0];
    log.push(`${a[0]}:${a[1]}`);
    s = { ...a[2](s), doc: null };
  }
  return { s, log };
}
// Waktu tak terbatas mencegah kejadian berbasis waktu; kedatangan Pruitt (pasti terjadi pada sisa 30%) disimulasikan dengan flag
const baru = (diff = 'normal', tak = true) => { const s = A.mulai(A.stateAwal(), P, diff).state; return tak ? { ...s, timeLeft: 9e9, flags: { pruitt_hadir: true } } : s; };
const habisDipakai = (s, awal) => (awal - s.timeLeft) / 60;

// Tuduhan terbaik yang bisa disusun dari barang yang dimiliki pemain
function tuduhanTerbaik(s) {
  const punya = (id) => s.bukti.includes(id) || s.kartu.includes(id) || s.deduksi.includes(id);
  const pilihDua = (calon) => calon.filter(punya).slice(0, 2);
  return {
    pembunuh: ['eleanor'], pelaku_lain: ['lowell', ...(s.bukti.includes('E31') ? ['tuduhan_1931'] : [])],
    motif: pilihDua(['E18', 'E08', 'E14', 'E19']),
    metode: ['E16', ...pilihDua(['E17', 'E32', 'E29']).slice(0, 1)].filter(punya),
    kesempatan: punya('D15') ? ['D15'] : pilihDua(['K03', 'K02', 'E06', 'E19', 'E20']),
    kebenaran_tersembunyi: ['wasiat_diteken'],
  };
}

/* ---------- 1. Validasi skema ---------- */
sec('1. Validasi skema paket kasus');
const galat = validasiPaket(P);
ok(!galat.length, `paket valid (${galat.length} galat)${galat.length ? '\n    ' + galat.join('\n    ') : ''}`);
const rusak = JSON.parse(JSON.stringify(P)); rusak.dialog.nodes[1].syarat = { bukti: 'E99' }; rusak.deduksi.benar[0].kartu = ['E01', 'K99'];
ok(validasiPaket(rusak).length >= 2, 'validator menolak rujukan yang rusak (uji negatif)');
const aset = [...K.bukti.map((b) => b.gambar), ...Object.values(K.lokasi).map((l) => l.peta), ...Object.values(K.tokoh).flatMap((t) => Object.values(t.potret)),
  ...[...P.cerita.intro, ...Object.values(P.cerita.cutscene).flat(), ...Object.values(P.cerita.ending).flatMap((e) => e.slides)].map((sl) => sl.potret).filter(Boolean)];
const hilang = [...new Set(aset)].filter((a) => !fs.existsSync(new URL(`../public/${a}`, import.meta.url)));
ok(!hilang.length, `semua ${new Set(aset).size} file aset ada${hilang.length ? ': ' + hilang.join(', ') : ''}`);
const src = fs.readdirSync(new URL('../src/engine/', import.meta.url)).map((f) => fs.readFileSync(new URL(`../src/engine/${f}`, import.meta.url), 'utf8')).join('\n');
const bocor = [/\bE\d\d\b/, /\bK0\d\b/, ...Object.keys(K.tokoh).map((t) => new RegExp(`['"]${t}['"]`))].filter((r) => r.test(src));
ok(!bocor.length, `engine bebas isi kasus (tanpa ID bukti/kartu atau nama tokoh)${bocor.length ? ': ' + bocor.join(' ') : ''}`);

/* ---------- 2. Keterjangkauan ---------- */
sec('2. Keterjangkauan penuh (waktu tak terbatas)');
const semua = main(baru('normal'), { pengecoh: true });
const S = semua.s;
ok(S.bukti.length + S.hilang.length === K.bukti.length, `semua ${K.bukti.length} bukti didapat (dapat ${S.bukti.length})${S.bukti.length < K.bukti.length ? ': kurang ' + K.bukti.map((b) => b.id).filter((id) => !S.bukti.includes(id)).join(',') : ''}`);
ok(S.kartu.length === Object.keys(K.kartu).length, `semua ${Object.keys(K.kartu).length} kartu keterangan didapat (dapat ${S.kartu.length}: kurang ${Object.keys(K.kartu).filter((k) => !S.kartu.includes(k)).join(',') || '-'})`);
ok(S.deduksi.length === P.deduksi.benar.length, `semua ${P.deduksi.benar.length} deduksi benar terkonfirmasi (dapat ${S.deduksi.length})`);
ok(S.pengecoh.length === P.deduksi.pengecoh.length && P.deduksi.pengecoh.every((f) => A.pengecohTerbantah(f, S)), 'semua deduksi pengecoh bisa dibuat dan semuanya terbantah');
ok(S.tekaTeki.length === P.tekaTeki.length, `semua ${P.tekaTeki.length} teka-teki terpecahkan`);
ok(S.kesaksianSelesai.length === P.kesaksian.length, `semua ${P.kesaksian.length} kesaksian selesai dibantah (selesai: ${S.kesaksianSelesai.length})`);
ok(['vivian', 'charles', 'graves'].every((t) => S.cleared.includes(t)), 'Vivian, Charles, dan Graves dibersihkan');
const nodeTerjangkau = new Set();
for (let i = 1; i <= 60; i++) main(baru('normal'), { rng: rngOf(i * 7), pengecoh: true }).s.tanya.forEach((id) => nodeTerjangkau.add(id));
semua.s.tanya.forEach((id) => nodeTerjangkau.add(id));
main(baru('normal'), { balik: true }).s.tanya.forEach((id) => nodeTerjangkau.add(id)); // urutan terbalik memilih cabang moral yang lain
{ // Jalur M1(b) diuji langsung: janji kerahasiaan, lalu Sammy bersaksi
  let x = baru('normal');
  const n = (id) => { x = { ...A.tanya(x, P, id).state, doc: null }; }, b = (id) => { x = { ...A.periksa(x, P, id).state, doc: null }; };
  ['E01', 'E05', 'E07', 'E10', 'E26'].forEach(b); n('C02'); b('E11'); n('C03'); n('C05'); n('C08'); b('E12'); b('E27');
  for (const p of P.kesaksian.find((k) => k.id === 'KS-CHA-1').pernyataan.filter((q) => q.bantah)) x = A.bantah(x, P, 'KS-CHA-1', p.id, p.bantah[0].dengan.find((id) => x.bukti.includes(id) || x.kartu.includes(id))).state;
  n('C10'); n('S03');
  ok(x.flags.m1 === 'b' && x.kartu.includes('K06'), 'jalur M1(b): janji kerahasiaan lalu kesaksian Sammy (K06)');
  x.tanya.forEach((id) => nodeTerjangkau.add(id));
}
const takTerjangkau = P.dialog.nodes.filter((n) => !n.sapaan && !n.pemulihan && !nodeTerjangkau.has(n.id)).map((n) => n.id);
ok(!takTerjangkau.length, `semua node dialog terjangkau di salah satu permainan${takTerjangkau.length ? ' (tak terjangkau: ' + takTerjangkau + ')' : ''}`);
let hS = 0; let sH = { ...S };
while (A.petunjukBerikut(sH, P) && hS < 40) { sH = A.petunjuk(sH, P).state; hS++; }
info(`petunjuk yang masih relevan di akhir: ${hS}`);
const spentSemua = habisDipakai(S, 9e9);
info(`total waktu bila mengerjakan SEMUA hal: ${spentSemua} menit`);

/* ---------- 3. Tidak ada jalan buntu ---------- */
sec('3. Uji acak: 300 permainan dengan urutan, nada, dan kesalahan acak');
let gagalUtuh = 0, urutanSalah = 0, pernahTertutup = 0, contohGagal = '';
const T7 = ['D10', 'D11', 'D12', 'D13', 'D14', 'D15'];
for (let i = 1; i <= 300; i++) {
  const r = main(baru('hard'), { rng: rngOf(i) });
  if (Object.keys(r.s.flags).some((k) => k.endsWith('_tertutup'))) pernahTertutup++;
  const idxD9 = r.log.findIndex((x) => x === 'deduksi:D9');
  if (r.log.some((x, j) => T7.some((d) => x.endsWith(d) || x === `tekaTeki:${d === 'D10' ? 'P4' : 'P8'}`) && (idxD9 < 0 || j < idxD9))) urutanSalah++;
  const t = A.tuduh(r.s, P, tuduhanTerbaik(r.s)).state;
  if (t.hasil?.ending !== 'kebenaran_utuh') { gagalUtuh++; if (!contohGagal) contohGagal = `seed ${i}: ${t.hasil?.ending || t.msg} ded=${r.s.deduksi.length}`; }
}
ok(gagalUtuh === 0, `Kebenaran Utuh selalu bisa dicapai (gagal ${gagalUtuh}/300)${contohGagal ? ' contoh ' + contohGagal : ''}`);
ok(urutanSalah === 0, `penjaga urutan: tidak ada deduksi T7 sebelum D9 (pelanggaran ${urutanSalah}/300)`);
info(`permainan dengan tokoh yang sempat menutup diri: ${pernahTertutup}/300 (semuanya tetap bisa selesai)`);

/* ---------- 4. Kejadian berbasis waktu ---------- */
sec('4. Kejadian berbasis waktu');
{
  let s = baru('normal', false);
  const total = TIMER('normal') * 60;
  s = { ...s, timeLeft: total * 0.59 };
  s = A.periksa(s, P, 'E01').state;
  ok(s.hilang.includes('E15') && s.kejadian.includes('ev_surat_dibakar'), 'pada sisa 60%: surat cinta E15 terbakar bila belum diambil');
  s = { ...s, timeLeft: total * 0.49 }; s = A.periksa(s, P, 'E03').state;
  ok(s.biayaEkstra.E17 === 4, 'pada sisa 50%: mencari botol tetes E17 butuh +4 menit');
  s = { ...s, timeLeft: total * 0.29 }; s = A.periksa(s, P, 'E02').state;
  ok(s.flags.pruitt_hadir && A.tokohHadir('pruitt', s, P), 'pada sisa 30%: Pruitt tiba dan bisa ditanyai');
  s = { ...s, timeLeft: total * 0.14 }; s = A.tanya(s, P, 'G02').state;
  ok(s.antreanCutscene.includes('C6'), 'pada sisa 15%: cutscene Fajar Mendekat diputar');
  // Jalur benar tetap terjangkau ketika semua kejadian sudah terjadi sejak awal
  let s2 = baru('normal', false); s2 = { ...s2, timeLeft: total * 0.1 }; s2 = A.periksa(s2, P, 'E01').state; s2 = { ...s2, timeLeft: 9e9 };
  const r2 = main(s2, {});
  ok(A.tuduh(r2.s, P, tuduhanTerbaik(r2.s)).state.hasil?.ending === 'kebenaran_utuh', 'dengan semua kejadian terpicu sejak awal, Kebenaran Utuh tetap bisa dicapai');
}

/* ---------- 5. Pemain ahli dan keseimbangan timer ---------- */
sec('5. Jalur ahli dan keseimbangan timer');
const PUTIH = {
  bukti: ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E10', 'E11', 'E12', 'E13', 'E14', 'E16', 'E17', 'E19', 'E20', 'E22', 'E23', 'E24', 'E26', 'E32'],
  node: ['L04', 'L05', 'G04', 'G05', 'C02', 'C03', 'C05', 'C08', 'V02', 'V03', 'V06', 'V07', 'V09', 'G11', 'G12', 'EL03', 'EL04', 'DY04'],
  info: ['I-plakat'], kesaksian: [],
  deduksi: ['D1', 'D2', 'D4', 'D5', 'D6', 'D7', 'D9', 'D11', 'D12', 'D14'], tekaTeki: ['P2', 'P3', 'P4', 'P8'],
};
const ahli = main(baru('normal'), { putih: PUTIH });
const ideal = habisDipakai(ahli.s, 9e9);
const tAhli = A.tuduh(ahli.s, P, tuduhanTerbaik(ahli.s)).state;
ok(tAhli.hasil?.ending === 'kebenaran_utuh', `jalur ahli mencapai Kebenaran Utuh (${ahli.log.length} aksi, ${ideal} menit permainan, ${ahli.s.deduksi.length} deduksi)`);
const REAL_MIN = 75;                                              // asumsi: pemain ahli memakai 75 menit nyata
const TARGET = { easy: { semua: [0, 1.0], ahli: 0.6 }, normal: { semua: [1.1, 1.6], ahli: 0.7 }, hard: { semua: [1.4, 2.4], ahli: 0.9 } };
for (const [nama, cfg] of Object.entries(K.config.kesulitan)) {
  const T = cfg.timerMenit, idle = cfg.faktorRealtime * REAL_MIN, rasio = spentSemua / T, [lo, hi] = TARGET[nama].semua;
  ok(rasio >= lo && rasio <= hi, `${nama}: mengerjakan SEMUA butuh ${spentSemua}m = ${rasio.toFixed(2)}x timer ${T}m (target ${lo}-${hi}x)`);
  ok(ideal + idle <= T * TARGET[nama].ahli, `${nama}: pemain ahli (${ideal}m + waktu nyata ${idle}m) memakai ${Math.round(((ideal + idle) / T) * 100)}% timer (batas ${TARGET[nama].ahli * 100}%)`);
  ok(ahli.s.deduksi.length >= cfg.deduksiWajib, `${nama}: jalur ahli memenuhi ${cfg.deduksiWajib} deduksi wajib`);
}

/* ---------- 6. Tuduhan, ending, skor ---------- */
sec('6. Tuduhan, ending, dan skor');
const rankOf = (pct) => P.cerita.peringkat.find(([m]) => pct >= m)[1];
const akhirDengan = (s, j) => A.tuduh(s, P, j).state;
const tb = tuduhanTerbaik(S);
ok(akhirDengan(S, tb).hasil.ending === 'kebenaran_utuh', 'tuduhan lengkap → Kebenaran Utuh');
ok(akhirDengan(S, { ...tb, kebenaran_tersembunyi: ['edmund_tahu'] }).hasil.ending === 'keadilan_tanpa_kebenaran', 'tanpa kebenaran tersembunyi → Keadilan Tanpa Kebenaran');
ok(akhirDengan(S, { ...tb, pelaku_lain: ['lowell', 'charles'] }).hasil.ending === 'pengadilan_rapuh', 'pelaku lain keliru → Pengadilan Rapuh');
ok(akhirDengan(S, { ...tb, pembunuh: ['vivian'] }).hasil.ending === 'kebenaran_dipesan', 'menuduh Vivian → Kebenaran yang Dipesan (kalah khusus)');
ok(akhirDengan(S, { ...tb, pembunuh: ['graves'] }).hasil.ending === 'kambing_hitam_kedua', 'menuduh Graves → Kambing Hitam Kedua');
ok(akhirDengan(S, { ...tb, pembunuh: ['lowell'] }).hasil.ending === 'separuh_kebenaran', 'menuduh Lowell → Separuh Kebenaran');
ok(akhirDengan(S, { ...tb, pembunuh: ['charles'] }).hasil.ending === 'tuduhan_salah', 'menuduh Charles → Tuduhan Salah');
const tanpaD9 = { ...S, deduksi: S.deduksi.filter((d) => d !== 'D9'), bukti: S.bukti.filter((b) => b !== 'E25') };
ok(akhirDengan(tanpaD9, tb).hasil.ending === 'keadilan_tanpa_kebenaran', 'menebak "wasiat sudah diteken" tanpa D9/E25 tidak dihitung');
const kurang = A.tuduh({ ...A.mulai(A.stateAwal(), P, 'normal').state }, P, tb).state;
ok(kurang.status === 'playing' && /Belum cukup/.test(kurang.msg), 'menuduh sebelum deduksi wajib terpenuhi ditolak');
const akhir = (s) => A.selesaiEnding(s).state.status;
ok(akhir(akhirDengan(S, tb)) === 'won' && akhir(akhirDengan(S, { ...tb, pembunuh: ['vivian'] })) === 'lost', 'setelah cutscene ending: menang → won, kalah → lost');
const totals = {};
for (const [diff, cfg] of Object.entries(K.config.kesulitan)) {
  const idle = cfg.faktorRealtime * REAL_MIN * 60;
  const r = main(baru(diff, false), { putih: PUTIH });
  const s0 = { ...r.s, timeLeft: r.s.timeLeft - idle };
  const ah = akhirDengan(s0, tuduhanTerbaik(s0)).hasil.skor;
  const min = akhirDengan(s0, { ...tuduhanTerbaik(s0), pelaku_lain: ['lowell'], kesempatan: ['E19', 'E20'] }).hasil.skor;
  let c = s0; for (let i = 0; i < 2; i++) c = { ...A.petunjuk(c, P).state, doc: null };
  c = { ...c, salahHubung: 3, salahBantah: 2 };
  const cer = akhirDengan(c, tuduhanTerbaik(c)).hasil.skor;
  totals[diff] = ah.total;
  info(`${diff.padEnd(6)} ahli ${ah.total}/${ah.maks} (${ah.pct}%) ${rankOf(ah.pct)} · minimalis ${min.pct}% ${rankOf(min.pct)} · ceroboh ${cer.pct}% ${rankOf(cer.pct)}`);
  ok(rankOf(ah.pct) === 'S', `${diff}: pemain ahli meraih peringkat S`);
  ok(min.pct <= ah.pct, `${diff}: jalur minimalis tidak melebihi pemain ahli`);
  ok(rankOf(cer.pct) !== 'S' && cer.pct < ah.pct, `${diff}: pemain ceroboh (2 petunjuk, 3 salah hubung, 2 salah bantah) turun dari S`);
}
ok(totals.hard > totals.normal && totals.normal > totals.easy, `pengali kesulitan bekerja: ${totals.hard} > ${totals.normal} > ${totals.easy}`);

/* ---------- 7. Kalah karena waktu ---------- */
sec('7. Kalah karena waktu');
{
  let s = { ...baru('hard', false), timeLeft: 2 }; let n = 0;
  while (s.status === 'playing' && n < 100) { s = A.selesaiCutscene(A.detak(s, P).state).state; n++; }
  ok(s.status === 'lost' && s.reason === 'timeout', `timer habis lewat waktu nyata (hard) → Kasus Dingin setelah ${n} detik`);
  s = { ...baru('easy', false), timeLeft: 30 }; s = A.periksa(s, P, 'E01').state;
  ok(s.status === 'lost' && s.hasil.ending === 'kasus_dingin', 'waktu habis karena aksi → Kasus Dingin');
  s = { ...baru('normal', false), timeLeft: 60 }; s = A.petunjuk(s, P).state;
  ok(s.status === 'lost', 'waktu habis karena petunjuk → Kasus Dingin');
}

/* ---------- 8. Anti-eksploit dan waktu nyata ---------- */
sec('8. Anti-eksploit dan waktu nyata');
{
  let s = baru('easy', false); const t0 = s.timeLeft; for (let i = 0; i < 600; i++) s = A.detak(s, P).state;
  ok(s.timeLeft === t0, 'easy: timer tidak berkurang saat menganggur');
  s = baru('hard', false); const t1 = s.timeLeft; for (let i = 0; i < 100; i++) s = A.detak(s, P).state;
  const fh = K.config.kesulitan.hard.faktorRealtime;
  ok(Math.abs(t1 - s.timeLeft - 100 * fh) < 1e-6, `hard: 100 detik nyata = ${100 * fh} detik permainan`);
  s = { ...s, doc: 'E01' }; const t2 = s.timeLeft; for (let i = 0; i < 50; i++) s = A.detak(s, P).state;
  ok(s.timeLeft === t2, 'timer berhenti saat dokumen dibaca');
  s = { ...s, doc: null, antreanCutscene: ['C1'] }; for (let i = 0; i < 50; i++) s = A.detak(s, P).state;
  ok(s.timeLeft === t2, 'timer berhenti selama cutscene');
  // Menebak pasangan bukti secara acak tidak layak
  const semuaKartu = [...S.bukti, ...S.kartu];
  for (const [nama, cfg] of Object.entries(K.config.kesulitan)) {
    let jumlah = 0; const N = 20;
    for (let i = 1; i <= N; i++) {
      const r = rngOf(i * 97); let x = { ...A.mulai(A.stateAwal(), P, nama).state, timeLeft: 9e9, bukti: S.bukti, kartu: S.kartu, flags: { ...S.flags }, tekaTeki: [...S.tekaTeki], deduksi: ['D3', 'D10', 'D15'] };
      const awal = x.timeLeft; let coba = 0;
      while (x.deduksi.length < cfg.deduksiWajib + 3 && coba < 5000) {
        const a = semuaKartu[Math.floor(r() * semuaKartu.length)], b = semuaKartu[Math.floor(r() * semuaKartu.length)];
        if (a !== b) x = A.hubungkan(x, P, [a, b]).state; coba++;
      }
      jumlah += (awal - x.timeLeft) / 60;
    }
    ok(jumlah / N > cfg.timerMenit, `${nama}: menebak pasangan bukti acak butuh rata-rata ${Math.round(jumlah / N)}m > timer ${cfg.timerMenit}m`);
  }
  const salahBantah = A.bantah({ ...S, status: 'playing', kesaksianSelesai: [], bantahan: {}, timeLeft: 9e9 }, P, 'KS-LOW-1', 'p1', 'E01').state;
  ok(salahBantah.salahBantah === 1 && (salahBantah.meter.lowell?.tekanan ?? 0) <= (S.meter.lowell?.tekanan ?? 0), 'bantahan salah memakan waktu dan menurunkan tekanan');
}

/* ---------- 9. Menutup diri dan pemulihan ---------- */
sec('9. Watak: menutup diri dan pemulihan');
{
  let s = baru('normal'); s = A.periksa(s, P, 'E01').state; s = A.periksa(s, P, 'E04').state; s = A.periksa(s, P, 'E05').state;
  s = A.periksa(s, P, 'E07').state; s = { ...s, doc: null };
  s = A.periksa({ ...s, lokasiSekarang: 'kamar_vivian' }, P, 'E15').state;
  s = A.tanya(s, P, 'V05').state;
  ok(A.tertutup('vivian', s), 'Vivian menutup diri bila didesak sebelum dipercaya');
  ok(!P.dialog.nodes.some((n) => n.tokoh === 'vivian' && !n.pemulihan && A.nodeTersedia(n, s, P)), 'saat menutup diri hanya node pemulihan yang tersedia');
  let g = baru('normal'); g = A.periksa(g, P, 'E06').state; g = A.tanya(g, P, 'G07').state;
  ok(A.tertutup('graves', g), 'Graves menutup diri bila didesak (kepercayaan turun ke 0)');
  g = A.tanya(g, P, 'G09').state;
  ok(!A.tertutup('graves', g) && A.nodeTersedia(P.dialog.nodes.find((n) => n.id === 'G04'), g, P), 'pemulihan Graves (G09) membuka interogasi lagi');
  const watakBerbeda = Object.entries(K.tokoh).filter(([, t]) => t.tersangka).every(([, t]) => JSON.stringify(t.watak.simpati) !== JSON.stringify(t.watak.desak) || JSON.stringify(t.watak.netral) !== JSON.stringify(t.watak.desak));
  ok(watakBerbeda, 'setiap tersangka bereaksi berbeda terhadap nada yang berbeda');
}

/* ---------- 10. Store: menu, simpan, lanjutkan, migrasi ---------- */
sec('10. Store: alur menu, simpan progres, dan migrasi');
{
  const G = () => useGame.getState();
  mem['hartwell-save-v1'] = '{"state":{"status":"paused"}}';
  ok(migrasiSaveLama() === true && mem['hartwell-save-v1'] === undefined, 'save v1 dihapus dan pemain diberi tahu sekali');
  ok(migrasiSaveLama() === false, 'pemberitahuan migrasi tidak muncul dua kali');
  G().begin('easy'); ok(G().status === 'intro', 'Mulai → intro');
  G().tick(); G().finishIntro(); ok(G().status === 'playing' && G().timeLeft === TIMER('easy') * 60, 'intro selesai → kasus dimulai dengan timer penuh');
  G().collect('E01'); G().collect('E03');
  const raw = mem[KUNCI_SAVE], saved = JSON.parse(raw).state;
  ok(saved.status === 'paused' && saved.bukti.length === 2 && saved.versiPaket === K.meta.versiPaket, 'progres tersimpan sebagai "paused" beserta versi paket');
  useGame.setState({ status: 'menu', bukti: [], timeLeft: 0 }); mem[KUNCI_SAVE] = raw; await useGame.persist.rehydrate();
  ok(G().status === 'paused' && G().bukti.join() === 'E01,E03', 'reload → progres pulih dan dijeda');
  const lain = JSON.parse(raw); lain.state.versiPaket = '0.0.1'; mem[KUNCI_SAVE] = JSON.stringify(lain);
  useGame.setState({ status: 'menu', bukti: [] }); await useGame.persist.rehydrate();
  ok(G().status === 'menu', 'save dengan versi paket berbeda ditolak (kembali ke menu)');
  ok(typeof G().ask === 'function' && typeof G().accuse === 'function', 'aksi store tetap utuh setelah state diganti');
}

console.log(fails ? `\n✘ ${fails} pemeriksaan GAGAL` : '\n✔ Semua pemeriksaan lolos');
process.exit(fails ? 1 : 0);
