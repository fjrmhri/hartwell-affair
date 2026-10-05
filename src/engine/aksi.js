// Aksi murni: (state, paket, ...argumen) -> { state, suara }. Tanpa React, audio, atau localStorage.
// Engine tidak boleh memuat nama tokoh atau ID bukti; semua isi kasus datang dari paket `P`.
import { cekSyarat, nilaiMeter } from './kondisi.js';
import { terapkanEfek, tambahCatatan, bunyi, pesan, ubahMeter, konfirmasiDeduksi } from './efek.js';

export const stateAwal = () => ({
  status: 'menu', diff: 'normal', timeLeft: 0,
  bukti: [], kartu: [], hilang: [], tanya: [], info: [], lokasiSekarang: null,
  meter: {}, flags: {}, bantahan: {}, kesaksianSelesai: [],
  deduksi: [], pengecoh: [], tekaTeki: [], petunjuk: [], catatan: [], lines: [], cleared: [],
  msg: '', msgJenis: 'info', salahHubung: 0, salahBantah: 0, salahTekaTeki: 0,
  kejadian: [], biayaEkstra: {}, antreanCutscene: [], cutsceneDilihat: [],
  doc: null, boardPos: {}, reason: '', hasil: null,
});

// Salinan yang boleh dimutasi oleh efek. `_suara` dikumpulkan lalu dilepas sebelum state disimpan.
export function salin(s) {
  const d = { ...s, _suara: [] };
  for (const k of ['bukti', 'kartu', 'hilang', 'tanya', 'info', 'kesaksianSelesai', 'deduksi', 'pengecoh', 'tekaTeki',
    'petunjuk', 'catatan', 'lines', 'cleared', 'kejadian', 'antreanCutscene', 'cutsceneDilihat']) d[k] = [...(s[k] || [])];
  d.meter = Object.fromEntries(Object.entries(s.meter || {}).map(([k, v]) => [k, { ...v }]));
  d.flags = { ...(s.flags || {}) };
  d.bantahan = Object.fromEntries(Object.entries(s.bantahan || {}).map(([k, v]) => [k, [...v]]));
  d.biayaEkstra = { ...(s.biayaEkstra || {}) };
  return d;
}
const lepas = (d) => { const { _suara, ...state } = d; return { state, suara: _suara }; };
const tetap = (s) => ({ state: s, suara: [] });

/* ---------- Ketersediaan (dipakai UI dan simulasi) ---------- */

export const cfg = (P) => P.kasus.config;
export const cfgKesulitan = (P, diff) => P.kasus.config.kesulitan[diff];
export const lokasiTerbuka = (id, s, P) => cekSyarat(P.kasus.lokasi[id].syarat, s, P);
export const tokohHadir = (id, s, P) => cekSyarat(P.kasus.tokoh[id].syaratMuncul, s, P);
export const tertutup = (id, s) => !!s.flags[`${id}_tertutup`];

export const buktiTersedia = (b, s, P) => !!b.lokasi && !s.bukti.includes(b.id) && !s.hilang.includes(b.id)
  && lokasiTerbuka(b.lokasi, s, P) && cekSyarat(b.syarat, s, P);
export const infoTersedia = (lokId, inf, s, P) => !s.info.includes(inf.id) && lokasiTerbuka(lokId, s, P) && cekSyarat(inf.syarat, s, P);

export function nodeTersedia(n, s, P) {
  if (n.sapaan || s.tanya.includes(n.id) || !tokohHadir(n.tokoh, s, P)) return false;
  if (!!n.pemulihan !== tertutup(n.tokoh, s)) return false;
  return cekSyarat(n.syarat, s, P);
}
export const kesaksianTersedia = (k, s, P) => !s.kesaksianSelesai.includes(k.id) && tokohHadir(k.tokoh, s, P)
  && !tertutup(k.tokoh, s) && cekSyarat(k.syarat, s, P);
export const tekaTekiTersedia = (t, s, P) => !s.tekaTeki.includes(t.id) && cekSyarat(t.syarat, s, P);
export const pengecohTerbantah = (f, s) => f.dibantahOleh.every((id) => s.deduksi.includes(id));
export const biayaBukti = (id, s, P) => cfg(P).biayaJelajahMenit + (s.biayaEkstra[id] || 0);

/* ---------- Waktu dan kejadian ---------- */

function cekKejadian(d, P) {
  const total = cfgKesulitan(P, d.diff).timerMenit * 60;
  for (const k of P.kejadian) {
    if (d.kejadian.includes(k.id)) continue;
    if ((d.timeLeft / total) * 100 > k.pemicu.sisaWaktuPersen) continue;
    d.kejadian.push(k.id);
    if (cekSyarat(k.syarat, d, P)) { terapkanEfek(k.efek, d, P); if (k.pesan) pesan(d, k.pesan, 'waktu'); }
  }
}

function habis(d) {
  d.timeLeft = 0; d.status = 'lost'; d.reason = 'timeout';
  d.hasil = { ending: 'kasus_dingin' };
  pesan(d, 'Waktu habis. Kasus ini menjadi dingin...', 'waktu');
  bunyi(d, 'lose');
}

function kurangiWaktu(d, P, menit) {
  if (d.status !== 'playing') return;
  d.timeLeft -= menit * 60;
  if (d.timeLeft <= 0) { habis(d); return; }
  cekKejadian(d, P);
}

/* ---------- Siklus permainan ---------- */

export function mulai(s, P, diff) {
  const d = { ...stateAwal(), status: 'playing', diff, timeLeft: cfgKesulitan(P, diff).timerMenit * 60 };
  return tetap(d);
}

export function detak(s, P) {
  if (s.status !== 'playing' || s.doc || s.antreanCutscene.length || s.flags.tuduhanTerbuka) return tetap(s); // jeda saat membaca, cutscene, dan menyusun tuduhan
  const f = cfgKesulitan(P, s.diff).faktorRealtime || 0;
  if (!f) return tetap(s);
  const d = salin(s);
  d.timeLeft -= f;
  if (d.timeLeft <= 0) habis(d); else cekKejadian(d, P);
  return lepas(d);
}

export function selesaiCutscene(s) {
  if (!s.antreanCutscene.length) return tetap(s);
  const d = salin(s);
  const id = d.antreanCutscene.shift();
  if (!d.cutsceneDilihat.includes(id)) d.cutsceneDilihat.push(id);
  return lepas(d);
}

/* ---------- Penjelajahan ---------- */

export function kunjungi(s, P, lokId) {
  if (s.status !== 'playing' || s.lokasiSekarang === lokId || !lokasiTerbuka(lokId, s, P)) return tetap(s);
  const d = salin(s);
  const L = P.kasus.lokasi[lokId];
  d.lokasiSekarang = lokId;
  if (L.area === 'kota') {
    const m = cfg(P).biayaPerjalananMenit;
    pesan(d, `Perjalanan ke ${L.nama}. (−${m} menit)`, 'waktu');
    kurangiWaktu(d, P, m);
  }
  return lepas(d);
}

export function periksa(s, P, id) {
  const b = P.kasus.bukti.find((x) => x.id === id);
  if (!b || s.status !== 'playing' || !buktiTersedia(b, s, P)) return tetap(s);
  const d = salin(s);
  const menit = biayaBukti(id, s, P);
  d.bukti.push(id);
  d.doc = id;
  tambahCatatan(d, `Bukti ${id}: ${b.nama}. ${b.deskripsi}`);
  terapkanEfek(b.efek, d, P);
  pesan(d, `Bukti ditemukan: ${b.nama}`, 'bukti');
  bunyi(d, 'collect');
  kurangiWaktu(d, P, menit);
  return lepas(d);
}

export function periksaInfo(s, P, lokId, infoId) {
  const inf = (P.kasus.lokasi[lokId].info || []).find((x) => x.id === infoId);
  if (!inf || s.status !== 'playing' || !infoTersedia(lokId, inf, s, P)) return tetap(s);
  const d = salin(s);
  d.info.push(inf.id);
  tambahCatatan(d, inf.teks);
  terapkanEfek(inf.efek, d, P);
  pesan(d, `Temuan: ${inf.judul}`, 'bukti');
  bunyi(d, 'collect');
  kurangiWaktu(d, P, inf.menit ?? cfg(P).biayaJelajahMenit);
  return lepas(d);
}

/* ---------- Interogasi ---------- */

export function teksNode(n, s, P) {
  let teks = n.teks;
  (n.varian || []).forEach((v) => { if (cekSyarat(v.syarat, s, P)) teks = v.teks; });
  return teks;
}

export function tanya(s, P, nodeId) {
  const n = P.dialog.nodes.find((x) => x.id === nodeId);
  if (!n || s.status !== 'playing' || !nodeTersedia(n, s, P)) return tetap(s);
  const d = salin(s);
  const T = P.kasus.tokoh[n.tokoh];
  const teks = teksNode(n, s, P);
  if (!n.pemulihan) d.tanya.push(n.id); // node pemulihan boleh dipakai ulang agar tidak ada jalan buntu
  d.lines.push({ who: n.tokoh, text: teks, q: n.label, bohong: !!n.bohong, nada: n.nada || 'netral' });
  // Pergeseran meter dari watak tokoh terhadap nada, lalu efek node
  Object.entries(T.watak?.[n.nada || 'netral'] || {}).forEach(([jenis, delta]) => ubahMeter(d, P, n.tokoh, jenis, delta));
  terapkanEfek(n.efek, d, P);
  (n.efekBersyarat || []).forEach((c) => { if (cekSyarat(c.syarat, s, P)) terapkanEfek(c.efek, d, P); });
  // Menutup diri: tokoh yang bisa menutup diri, didesak sampai kepercayaan 0
  if (T.bisaMenutupDiri && n.nada === 'desak' && nilaiMeter(d, P, n.tokoh, 'kepercayaan') === 0) {
    d.flags[`${n.tokoh}_tertutup`] = true;
    d.lines.push({ who: n.tokoh, text: T.teksMenutupDiri, tertutup: true });
    pesan(d, `${T.nama} menutup diri. Cari cara memulihkan kepercayaannya.`, 'salah');
  }
  if (n.pemulihan) d.flags[`${n.tokoh}_tertutup`] = false;
  // Titik retak
  if (n.retak && cekSyarat(n.retak.syarat, d, P)) {
    d.lines.push({ who: n.tokoh, text: n.retak.teks, broke: true });
    terapkanEfek(n.retak.efek, d, P);
    bunyi(d, 'sting');
  }
  bunyi(d, 'ask');
  kurangiWaktu(d, P, n.menit);
  return lepas(d);
}

export function bantah(s, P, ksId, pId, kartuId) {
  const k = P.kesaksian.find((x) => x.id === ksId);
  if (!k || s.status !== 'playing' || !kesaksianTersedia(k, s, P)) return tetap(s);
  const p = k.pernyataan.find((x) => x.id === pId);
  if (!p || (s.bantahan[ksId] || []).includes(pId)) return tetap(s);
  if (!s.bukti.includes(kartuId) && !s.kartu.includes(kartuId)) return tetap(s);
  const d = salin(s);
  const cocok = (p.bantah || []).find((b) => b.dengan.includes(kartuId));
  d.lines.push({ who: 'detektif', ke: k.tokoh, text: `“${p.teks}” Lalu bagaimana dengan ini? (${kartuId})`, q: null });
  if (!cocok) {
    d.salahBantah += 1;
    ubahMeter(d, P, k.tokoh, 'tekanan', -1);
    d.lines.push({ who: k.tokoh, text: k.balasanSalah || 'Itu tidak membuktikan apa pun.', bohong: false });
    const m = cfg(P).biayaSalahBantahMenit;
    pesan(d, `Bantahan meleset; ${P.kasus.tokoh[k.tokoh].nama} makin percaya diri. (−${m} menit)`, 'salah');
    bunyi(d, 'wrong');
    kurangiWaktu(d, P, m);
    return lepas(d);
  }
  d.bantahan[ksId] = [...(d.bantahan[ksId] || []), pId];
  d.lines.push({ who: k.tokoh, text: cocok.balasan, bohong: false });
  if (!cocok.efek?.meter?.[k.tokoh]?.tekanan) ubahMeter(d, P, k.tokoh, 'tekanan', 1);
  terapkanEfek(cocok.efek, d, P);
  pesan(d, `Bantahan tepat: ${P.kasus.tokoh[k.tokoh].nama} goyah.`, 'deduksi');
  bunyi(d, 'link');
  const wajib = k.pernyataan.filter((x) => x.bantah?.length).map((x) => x.id);
  if (wajib.every((id) => d.bantahan[ksId].includes(id))) {
    d.kesaksianSelesai.push(ksId);
    if (k.selesai?.teks) d.lines.push({ who: k.tokoh, text: k.selesai.teks, broke: !!k.selesai.retak });
    terapkanEfek(k.selesai?.efek, d, P);
    if (k.selesai?.retak) bunyi(d, 'sting');
  }
  return lepas(d);
}

export function tekan(s, P, ksId, pId) {
  const k = P.kesaksian.find((x) => x.id === ksId);
  const p = k?.pernyataan.find((x) => x.id === pId);
  if (!p || s.status !== 'playing' || !p.tekan) return tetap(s);
  const kunci = `tekan:${ksId}:${pId}`;
  if (s.flags[kunci]) return tetap(s);
  const d = salin(s);
  d.flags[kunci] = true;
  d.lines.push({ who: 'detektif', ke: k.tokoh, text: `“${p.teks}” Jelaskan lebih rinci.`, q: null });
  d.lines.push({ who: k.tokoh, text: p.tekan, bohong: !!p.bantah?.length });
  return lepas(d);
}

/* ---------- Papan deduksi ---------- */

const samaHimpunan = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export function hubungkan(s, P, ids) {
  if (s.status !== 'playing') return tetap(s);
  const pilih = [...new Set(ids)];
  if (pilih.length < 2 || pilih.some((id) => !s.bukti.includes(id) && !s.kartu.includes(id))) return tetap(s);
  const d = salin(s);
  const ded = P.deduksi.benar.find((x) => [x.kartu, ...(x.kartuAlt || [])].some((set) => samaHimpunan(set, pilih)));
  if (ded) {
    if (s.deduksi.includes(ded.id)) { pesan(d, `Deduksi ${ded.id} sudah terkonfirmasi.`, 'info'); return lepas(d); }
    if (!cekSyarat(ded.syarat, s, P)) { pesan(d, ded.pesanTerkunci || 'Hubungannya belum jelas. Kumpulkan dasar yang lebih kuat dulu.', 'info'); return lepas(d); }
    konfirmasiDeduksi(d, P, ded.id);
    pesan(d, `Deduksi terbuka: ${ded.judul}`, 'deduksi');
    bunyi(d, 'link');
    return lepas(d);
  }
  const f = P.deduksi.pengecoh.find((x) => samaHimpunan(x.kartu, pilih));
  if (f) {
    if (s.pengecoh.includes(f.id)) { pesan(d, `Dugaan ini sudah tercatat: ${f.judul}.`, 'info'); return lepas(d); }
    d.pengecoh.push(f.id);
    tambahCatatan(d, `Dugaan ${f.id}: ${f.judul}. ${f.kesimpulan}`);
    pesan(d, `Dugaan baru: ${f.judul} (−${f.menit} menit)`, 'deduksi');
    bunyi(d, 'link');
    kurangiWaktu(d, P, f.menit);
    return lepas(d);
  }
  d.salahHubung += 1;
  const m = cfg(P).biayaSalahHubungMenit;
  pesan(d, `Tidak ada hubungan yang jelas antara bukti-bukti ini. (−${m} menit)`, 'salah');
  bunyi(d, 'wrong');
  kurangiWaktu(d, P, m);
  return lepas(d);
}

/* ---------- Petunjuk ---------- */

export function biayaPetunjuk(h, s, P) {
  const pengali = cfg(P).pengaliTingkatPetunjuk[(h.tingkat || 1) - 1] ?? 1;
  return Math.round(cfgKesulitan(P, s.diff).biayaPetunjukMenit * pengali);
}
export const petunjukBerikut = (s, P) => [...P.kasus.petunjuk].reverse()
  .find((h) => !s.petunjuk.includes(h.id) && cekSyarat(h.syarat, s, P));

export function petunjuk(s, P) {
  if (s.status !== 'playing') return tetap(s);
  const h = petunjukBerikut(s, P);
  const d = salin(s);
  if (!h) { pesan(d, 'Tidak ada petunjuk baru saat ini.', 'info'); return lepas(d); }
  d.petunjuk.push(h.id);
  tambahCatatan(d, `Petunjuk: ${h.teks}`);
  pesan(d, `Petunjuk: ${h.teks}`, 'petunjuk');
  bunyi(d, 'hint');
  kurangiWaktu(d, P, biayaPetunjuk(h, s, P));
  return lepas(d);
}

/* ---------- Teka-teki ---------- */

export const normalSandi = (t) => String(t || '').toUpperCase().replace(/[^A-Z]/g, '');
export function vigenere(teks, kunci, arah = 1) {
  const k = normalSandi(kunci);
  if (!k) return teks;
  let i = 0;
  return teks.replace(/[A-Za-z]/g, (c) => {
    const besar = c === c.toUpperCase(), a = besar ? 65 : 97;
    const geser = (k.charCodeAt(i++ % k.length) - 65) * arah;
    return String.fromCharCode(((c.charCodeAt(0) - a + geser + 26 * 2) % 26) + a);
  });
}

export function selKunciSalah(t, jawaban) {
  if (t.jenis === 'grid') return Object.entries(t.solusi).filter(([k, v]) => jawaban?.[k] !== v).map(([k]) => k);
  if (t.jenis === 'garisWaktu') return Object.entries(t.kunci).filter(([k, v]) => jawaban?.[k] !== v).map(([k]) => k);
  return [];
}

export function cekJawaban(t, jawaban) {
  if (t.jenis === 'pilihan') return jawaban === t.benar;
  if (t.jenis === 'sandi') return normalSandi(jawaban) === normalSandi(t.kunci);
  return selKunciSalah(t, jawaban).length === 0;
}

export function jawabTekaTeki(s, P, id, jawaban) {
  const t = P.tekaTeki.find((x) => x.id === id);
  if (!t || s.status !== 'playing' || !tekaTekiTersedia(t, s, P)) return tetap(s);
  const d = salin(s);
  if (!cekJawaban(t, jawaban)) {
    const m = t.menitSalah ?? 0;
    if (t.jenis !== 'sandi') d.salahTekaTeki += 1;
    pesan(d, `${t.teksSalah || 'Jawaban belum tepat.'}${m ? ` (−${m} menit)` : ''}`, 'salah');
    bunyi(d, 'wrong');
    if (m) kurangiWaktu(d, P, m);
    return lepas(d);
  }
  d.tekaTeki.push(t.id);
  tambahCatatan(d, `Teka-teki ${t.id}: ${t.nama} terpecahkan. ${t.teksBenar}`);
  terapkanEfek(t.efek, d, P);
  pesan(d, `Terpecahkan: ${t.nama}`, 'deduksi');
  bunyi(d, 'link');
  return lepas(d);
}

/* ---------- Tuduhan ---------- */

// FNV-1a 32-bit: hanya menyamarkan jawaban di bundel, bukan pengamanan.
export function hashJawaban(id, garam) {
  let h = 0x811c9dc5;
  for (const c of `${garam}:${id}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function bukaTuduhan(s, P) {
  const need = cfgKesulitan(P, s.diff).deduksiWajib;
  const d = salin(s);
  if (s.deduksi.length < need) { pesan(d, `Belum cukup deduksi (${s.deduksi.length}/${need}).`, 'salah'); return lepas(d); }
  d.flags.tuduhanTerbuka = true;
  terapkanEfek({ cutscene: P.tuduhan.cutsceneSebelum }, d, P);
  return lepas(d);
}

export function nilaiSlot(slot, dipilih, s, P) {
  const garam = P.tuduhan.garam;
  if (slot.jenis === 'tokoh') {
    const tokoh = dipilih.filter((x) => P.kasus.tokoh[x]);
    const hash = tokoh.map((x) => hashJawaban(x, garam));
    return hash.length === slot.jawabanHash.length && slot.jawabanHash.every((h) => hash.includes(h));
  }
  return cekSyarat(slot.benarBila, s, P, { dipilih, benar: {}, jumlahBuktiBenar: 0 });
}

export function evaluasiTuduhan(s, P, jawaban) {
  const benar = {}, rincian = [];
  let poin = 0, jumlahBuktiBenar = 0;
  for (const slot of P.tuduhan.slot) {
    const dipilih = jawaban[slot.id] || [];
    const ok = nilaiSlot(slot, dipilih, s, P);
    benar[slot.id] = ok;
    let p = ok ? slot.poin : 0;
    if (ok && slot.bonus && cekSyarat(slot.bonus.syarat, s, P, { dipilih, benar, jumlahBuktiBenar })) p += slot.bonus.poin;
    if (ok && slot.buktiSlot) jumlahBuktiBenar += 1;
    poin += p;
    rincian.push({ id: slot.id, judul: slot.judul, ok, poin: p, maks: slot.poin + (slot.bonus?.poin || 0) });
  }
  const konteksEnding = (slotId) => ({ dipilih: jawaban[slotId] || [], benar, jumlahBuktiBenar });
  const ending = P.tuduhan.ending.find((e) => cekSyarat(e.syarat, s, P, konteksEnding(e.slotKonteks || 'pembunuh')));
  return { benar, rincian, poin, ending, jumlahBuktiBenar };
}

export function tuduh(s, P, jawaban) {
  const need = cfgKesulitan(P, s.diff).deduksiWajib;
  if (s.status !== 'playing') return tetap(s);
  const d = salin(s);
  if (s.deduksi.length < need) { pesan(d, `Belum cukup deduksi (${s.deduksi.length}/${need}).`, 'salah'); return lepas(d); }
  const ev = evaluasiTuduhan(s, P, jawaban);
  const sk = P.tuduhan.skor, dif = cfgKesulitan(P, s.diff);
  const skor = {
    slot: ev.poin,
    // bonus penuh bila sisa waktu >= ambangWaktuPenuh dari timer, proporsional di bawahnya
    waktu: Math.round(sk.bonusWaktuMaks * Math.min(1, s.timeLeft / (dif.timerMenit * 60 * (sk.ambangWaktuPenuh || 1)))),
    petunjuk: -sk.penaltiPetunjuk * s.petunjuk.length,
    salah: -sk.penaltiSalahHubung * (s.salahHubung + s.salahTekaTeki) - sk.penaltiSalahBantah * s.salahBantah,
  };
  const menang = ev.ending.status === 'menang';
  if (!menang) skor.waktu = 0;
  const sub = Object.values(skor).reduce((a, b) => a + b, 0);
  skor.pengali = dif.pengaliSkor;
  skor.total = Math.max(0, Math.round(sub * dif.pengaliSkor));
  skor.maks = Math.round(sk.maksDasar * dif.pengaliSkor);
  skor.pct = Math.round((skor.total / skor.maks) * 100);
  if (ev.ending.batasPersen !== undefined) skor.pct = Math.min(skor.pct, ev.ending.batasPersen);
  Object.entries(jawaban.moral || {}).forEach(([k, v]) => { d.flags[k] = v; });
  d.flags.tuduhanTerbuka = false;
  d.status = 'ending';
  d.reason = menang ? 'menang' : 'salah';
  d.hasil = { ending: ev.ending.id, rincian: ev.rincian, skor, jawaban, menang };
  bunyi(d, menang ? 'win' : 'lose');
  return lepas(d);
}

export function selesaiEnding(s) {
  if (s.status !== 'ending') return tetap(s);
  return tetap({ ...s, status: s.hasil?.menang ? 'won' : 'lost' });
}
