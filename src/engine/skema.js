// Validator paket kasus: bentuk data, ID unik, dan semua rujukan antar-file. Mengembalikan daftar galat (kosong = valid).
import { ATOM, ATOM_TUDUHAN } from './kondisi.js';
import { KUNCI_EFEK } from './efek.js';

export function validasiPaket(P) {
  const galat = [];
  const g = (m) => galat.push(m);
  const K = P.kasus;
  const idBukti = new Set(K.bukti.map((b) => b.id));
  const idKartu = new Set(Object.keys(K.kartu));
  const idNode = new Set(P.dialog.nodes.map((n) => n.id));
  const idDed = new Set(P.deduksi.benar.map((d) => d.id));
  const idKs = new Set(P.kesaksian.map((k) => k.id));
  const idTt = new Set(P.tekaTeki.map((t) => t.id));
  const idTokoh = new Set(Object.keys(K.tokoh));
  const idLok = new Set(Object.keys(K.lokasi));
  const idCut = new Set(Object.keys(P.cerita.cutscene));
  const flagDitulis = new Set(['tuduhanTerbuka', '__main_ulang']);
  const flagDibaca = [];

  const unik = (arr, nama) => { const s = new Set(); arr.forEach((x) => { if (s.has(x)) g(`${nama}: ID ganda ${x}`); s.add(x); }); };
  unik(K.bukti.map((b) => b.id), 'bukti'); unik(P.dialog.nodes.map((n) => n.id), 'dialog');
  unik(P.deduksi.benar.map((d) => d.id).concat(P.deduksi.pengecoh.map((d) => d.id)), 'deduksi');
  unik(P.kesaksian.map((k) => k.id), 'kesaksian'); unik(K.petunjuk.map((h) => h.id), 'petunjuk');

  const adaKartuAtauBukti = (id) => idBukti.has(id) || idKartu.has(id);

  function cekSyarat(s, di, tuduhan = false) {
    if (!s || typeof s !== 'object') { g(`${di}: syarat bukan objek`); return; }
    const kunci = Object.keys(s);
    if (!kunci.length) return;
    if (kunci.length > 1) g(`${di}: syarat berisi lebih dari satu kunci (${kunci.join(', ')})`);
    const [k] = kunci, v = s[k];
    if (!ATOM.includes(k) && !(tuduhan && ATOM_TUDUHAN.includes(k))) { g(`${di}: atom tidak dikenal "${k}"`); return; }
    if (k === 'semua' || k === 'salahSatu') v.forEach((x, i) => cekSyarat(x, `${di}.${k}[${i}]`, tuduhan));
    else if (k === 'bukan') cekSyarat(v, `${di}.bukan`, tuduhan);
    else if (k === 'bukti' && !idBukti.has(v)) g(`${di}: bukti ${v} tidak ada`);
    else if (k === 'kartu' && !idKartu.has(v)) g(`${di}: kartu ${v} tidak ada`);
    else if (k === 'node' && !idNode.has(v)) g(`${di}: node ${v} tidak ada`);
    else if (k === 'deduksi' && !idDed.has(v)) g(`${di}: deduksi ${v} tidak ada`);
    else if (k === 'kesaksian' && !idKs.has(v)) g(`${di}: kesaksian ${v} tidak ada`);
    else if (k === 'tekaTeki' && !idTt.has(v)) g(`${di}: teka-teki ${v} tidak ada`);
    else if (k === 'kesulitan' && !K.config.kesulitan[v]) g(`${di}: kesulitan ${v} tidak ada`);
    else if (k === 'meter' && (!idTokoh.has(v[0]) || !['tekanan', 'kepercayaan'].includes(v[1]))) g(`${di}: meter ${v} tidak valid`);
    else if (k === 'flag') flagDibaca.push([v, di]);
    else if (k === 'flagSama') flagDibaca.push([v[0], di]);
  }

  function cekEfek(e, di) {
    if (!e) return;
    Object.keys(e).forEach((k) => { if (!KUNCI_EFEK.includes(k)) g(`${di}: kunci efek tidak dikenal "${k}"`); });
    [...(e.beriBukti || []), ...(e.hilangkanBukti || []), ...Object.keys(e.biayaEkstra || {})].forEach((id) => { if (!idBukti.has(id)) g(`${di}: bukti ${id} tidak ada`); });
    (e.beriKartu || []).forEach((id) => { if (!idKartu.has(id)) g(`${di}: kartu ${id} tidak ada`); });
    (e.konfirmasiDeduksi || []).forEach((id) => { if (!idDed.has(id)) g(`${di}: deduksi ${id} tidak ada`); });
    (e.bersihkan || []).forEach((id) => { if (!idTokoh.has(id)) g(`${di}: tokoh ${id} tidak ada`); });
    Object.keys(e.meter || {}).forEach((id) => { if (!idTokoh.has(id)) g(`${di}: tokoh ${id} tidak ada`); });
    Object.keys(e.setFlag || {}).forEach((f) => flagDitulis.add(f));
    if (e.cutscene && !idCut.has(e.cutscene)) g(`${di}: cutscene ${e.cutscene} tidak ada`);
  }

  // Konfigurasi
  ['easy', 'normal', 'hard'].forEach((d) => { if (!K.config.kesulitan[d]) g(`config: kesulitan ${d} hilang`); });
  if (!K.config.kesulitan[K.config.kesulitanDefault]) g('config: kesulitanDefault tidak valid');
  K.config.penandaTelepon.forEach((t) => { if (!idLok.has(t.lokasi)) g(`penandaTelepon: lokasi ${t.lokasi} tidak ada`); });

  // Tokoh dan lokasi
  Object.entries(K.tokoh).forEach(([id, t]) => {
    if (!t.potret?.tenang) g(`tokoh ${id}: potret tenang hilang`);
    if (t.bisaMenutupDiri && !t.teksMenutupDiri) g(`tokoh ${id}: teksMenutupDiri hilang`);
    if (t.bisaMenutupDiri && !P.dialog.nodes.some((n) => n.tokoh === id && n.pemulihan)) g(`tokoh ${id}: bisa menutup diri tanpa node pemulihan`);
    if (!P.dialog.nodes.some((n) => n.tokoh === id && n.sapaan)) g(`tokoh ${id}: tidak punya node sapaan`);
    cekSyarat(t.syaratMuncul || {}, `tokoh ${id}.syaratMuncul`);
  });
  Object.entries(K.lokasi).forEach(([id, l]) => {
    if (!['lantai1', 'lantai2', 'kota'].includes(l.area)) g(`lokasi ${id}: area tidak valid`);
    const r = l.ruang;
    if (!r || r.x < 0 || r.y < 0 || r.x + r.w > 100.01 || r.y + r.h > 100.01) g(`lokasi ${id}: ruang di luar peta`);
    cekSyarat(l.syarat, `lokasi ${id}`);
    (l.info || []).forEach((inf) => { cekSyarat(inf.syarat, `info ${inf.id}`); cekEfek(inf.efek, `info ${inf.id}`); });
  });

  // Bukti dan kartu
  K.bukti.forEach((b) => {
    if (b.lokasi !== null && !idLok.has(b.lokasi)) g(`bukti ${b.id}: lokasi ${b.lokasi} tidak ada`);
    if (b.hotspot.x < 0 || b.hotspot.x > 100 || b.hotspot.y < 0 || b.hotspot.y > 100) g(`bukti ${b.id}: hotspot di luar ruangan`);
    if (!P.dokumen[b.id]) g(`bukti ${b.id}: tidak punya dokumen`);
    cekSyarat(b.syarat, `bukti ${b.id}`); cekEfek(b.efek, `bukti ${b.id}`);
  });
  Object.keys(P.dokumen).forEach((id) => { if (!idBukti.has(id)) g(`dokumen ${id}: bukti tidak ada`); });
  Object.entries(K.kartu).forEach(([id, k]) => { if (!idTokoh.has(k.tokoh)) g(`kartu ${id}: tokoh tidak ada`); });

  // Dialog
  P.dialog.nodes.forEach((n) => {
    if (!idTokoh.has(n.tokoh)) g(`node ${n.id}: tokoh ${n.tokoh} tidak ada`);
    if (n.sapaan) return;
    if (!['netral', 'simpati', 'desak'].includes(n.nada)) g(`node ${n.id}: nada tidak valid`);
    if (typeof n.menit !== 'number') g(`node ${n.id}: menit hilang`);
    cekSyarat(n.syarat, `node ${n.id}`); cekEfek(n.efek, `node ${n.id}`);
    (n.varian || []).forEach((v, i) => cekSyarat(v.syarat, `node ${n.id}.varian[${i}]`));
    (n.efekBersyarat || []).forEach((c, i) => { cekSyarat(c.syarat, `node ${n.id}.efekBersyarat[${i}]`); cekEfek(c.efek, `node ${n.id}.efekBersyarat[${i}]`); });
    if (n.retak) { cekSyarat(n.retak.syarat, `node ${n.id}.retak`); cekEfek(n.retak.efek, `node ${n.id}.retak`); }
  });

  // Kesaksian
  P.kesaksian.forEach((k) => {
    if (!idTokoh.has(k.tokoh)) g(`kesaksian ${k.id}: tokoh tidak ada`);
    cekSyarat(k.syarat, `kesaksian ${k.id}`);
    if (!k.pernyataan.some((p) => p.bantah?.length)) g(`kesaksian ${k.id}: tidak ada pernyataan yang bisa dibantah`);
    k.pernyataan.forEach((p) => (p.bantah || []).forEach((b) => {
      b.dengan.forEach((id) => { if (!adaKartuAtauBukti(id)) g(`kesaksian ${k.id}.${p.id}: pembantah ${id} tidak ada`); });
      cekEfek(b.efek, `kesaksian ${k.id}.${p.id}`);
    }));
    cekEfek(k.selesai?.efek, `kesaksian ${k.id}.selesai`);
  });

  // Deduksi
  P.deduksi.benar.forEach((d) => {
    [d.kartu, ...(d.kartuAlt || [])].forEach((set) => set.forEach((id) => { if (!adaKartuAtauBukti(id)) g(`deduksi ${d.id}: kartu ${id} tidak ada`); }));
    cekSyarat(d.syarat, `deduksi ${d.id}`); cekEfek(d.efek, `deduksi ${d.id}`);
  });
  P.deduksi.pengecoh.forEach((f) => {
    f.kartu.forEach((id) => { if (!adaKartuAtauBukti(id)) g(`pengecoh ${f.id}: kartu ${id} tidak ada`); });
    f.dibantahOleh.forEach((id) => { if (!idDed.has(id)) g(`pengecoh ${f.id}: pembantah ${id} tidak ada`); });
    if (P.deduksi.benar.some((d) => d.kartu.length === f.kartu.length && d.kartu.every((x) => f.kartu.includes(x)))) g(`pengecoh ${f.id}: kartunya sama dengan deduksi benar`);
  });

  // Kejadian, teka-teki, petunjuk
  P.kejadian.forEach((k) => { cekSyarat(k.syarat, `kejadian ${k.id}`); cekEfek(k.efek, `kejadian ${k.id}`); });
  P.tekaTeki.forEach((t) => {
    if (!['pilihan', 'sandi', 'grid', 'garisWaktu'].includes(t.jenis)) g(`teka-teki ${t.id}: jenis tidak valid`);
    cekSyarat(t.syarat, `teka-teki ${t.id}`); cekEfek(t.efek, `teka-teki ${t.id}`);
    if (t.jenis === 'pilihan' && !t.opsi.some((o) => o.id === t.benar)) g(`teka-teki ${t.id}: jawaban benar tidak ada di opsi`);
    if (t.jenis === 'grid') Object.values(t.solusi).forEach((v) => { if (!t.opsi.some((o) => o.id === v)) g(`teka-teki ${t.id}: solusi ${v} tidak ada di opsi`); });
    if (t.jenis === 'garisWaktu') Object.entries(t.kunci).forEach(([sel, v]) => {
      const [tok, slot] = sel.split('|');
      if (!t.tokoh.includes(tok) || !t.slot.includes(slot)) g(`teka-teki ${t.id}: sel kunci ${sel} tidak valid`);
      if (!t.opsi.some((o) => o.id === v)) g(`teka-teki ${t.id}: opsi ${v} tidak ada`);
    });
  });
  K.petunjuk.forEach((h) => { cekSyarat(h.syarat, `petunjuk ${h.id}`); if (![1, 2, 3].includes(h.tingkat)) g(`petunjuk ${h.id}: tingkat tidak valid`); });

  // Tuduhan dan cerita
  P.tuduhan.slot.forEach((s) => { if (s.benarBila) cekSyarat(s.benarBila, `slot ${s.id}`, true); if (s.bonus) cekSyarat(s.bonus.syarat, `slot ${s.id}.bonus`, true); });
  P.tuduhan.ending.forEach((e) => {
    cekSyarat(e.syarat, `ending ${e.id}`, true);
    if (!P.cerita.ending[e.id]) g(`ending ${e.id}: tidak punya cutscene`);
  });
  if (!P.cerita.ending.kasus_dingin) g('cerita: ending kasus_dingin hilang');
  if (!idCut.has(P.tuduhan.cutsceneSebelum)) g('tuduhan: cutsceneSebelum tidak ada');
  (P.tuduhan.moral || []).forEach((m) => { cekSyarat(m.syarat, `moral ${m.id}`); flagDitulis.add(m.id); });
  const semuaSlide = [...P.cerita.intro, ...Object.values(P.cerita.cutscene).flat(), ...Object.values(P.cerita.ending).flatMap((e) => e.slides)];
  semuaSlide.forEach((sl, i) => { if (sl.syarat) cekSyarat(sl.syarat, `slide ${i}`); if (!sl.lines?.length) g(`slide ${i}: tanpa teks`); });

  // Flag yang dibaca harus ditulis di suatu tempat (kecuali flag tutup diri, flag tekan, dan flag sistem)
  Object.keys(K.tokoh).forEach((id) => flagDitulis.add(`${id}_tertutup`));
  flagDibaca.forEach(([f, di]) => { if (!flagDitulis.has(f)) g(`${di}: flag "${f}" dibaca tetapi tidak pernah ditulis`); });

  return galat;
}
