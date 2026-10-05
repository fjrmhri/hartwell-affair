// Penerap efek terpadu. Bekerja pada `d` (salinan state yang boleh dimutasi, lihat salin() di aksi.js).
// Kunci efek: catatan, beriBukti, beriKartu, setFlag, meter, konfirmasiDeduksi, bersihkan, hilangkanBukti,
// biayaEkstra, cutscene, pesan, suara.
import { nilaiMeter } from './kondisi.js';

export const KUNCI_EFEK = ['catatan', 'beriBukti', 'beriKartu', 'setFlag', 'meter', 'konfirmasiDeduksi', 'bersihkan',
  'hilangkanBukti', 'biayaEkstra', 'cutscene', 'pesan', 'suara'];

export const tambahCatatan = (d, t) => { if (!d.catatan.includes(t)) d.catatan.push(t); };
export const bunyi = (d, nama) => { d._suara.push(nama); };
export const pesan = (d, teks, jenis = 'info') => { d.msg = teks; d.msgJenis = jenis; };

export function ubahMeter(d, P, tokoh, jenis, delta) {
  const maks = P.kasus.config.meterMaks;
  const lama = nilaiMeter(d, P, tokoh, jenis);
  const baru = Math.max(0, Math.min(maks, lama + delta));
  d.meter[tokoh] = { ...(d.meter[tokoh] || {}), [jenis]: baru };
  return baru;
}

export function konfirmasiDeduksi(d, P, id) {
  if (d.deduksi.includes(id)) return false;
  const ded = P.deduksi.benar.find((x) => x.id === id);
  d.deduksi.push(id);
  if (ded) {
    tambahCatatan(d, `Deduksi ${id}: ${ded.judul}. ${ded.kesimpulan}`);
    if (ded.efek) terapkanEfek(ded.efek, d, P);
  }
  return true;
}

export function terapkanEfek(efek, d, P) {
  if (!efek) return;
  (efek.catatan || []).forEach((t) => tambahCatatan(d, t));
  (efek.beriBukti || []).forEach((id) => {
    if (!d.bukti.includes(id) && !d.hilang.includes(id)) {
      d.bukti.push(id);
      const b = P.kasus.bukti.find((x) => x.id === id);
      if (b) tambahCatatan(d, `Bukti ${id}: ${b.nama}. ${b.deskripsi}`);
    }
  });
  (efek.beriKartu || []).forEach((id) => {
    if (!d.kartu.includes(id)) {
      d.kartu.push(id);
      const k = P.kasus.kartu[id];
      if (k) tambahCatatan(d, `Keterangan ${id}: ${k.nama}. ${k.teks}`);
    }
  });
  Object.entries(efek.setFlag || {}).forEach(([k, v]) => { d.flags[k] = v; });
  Object.entries(efek.meter || {}).forEach(([tokoh, m]) => {
    Object.entries(m).forEach(([jenis, delta]) => ubahMeter(d, P, tokoh, jenis, delta));
  });
  (efek.konfirmasiDeduksi || []).forEach((id) => konfirmasiDeduksi(d, P, id));
  (efek.bersihkan || []).forEach((t) => { if (!d.cleared.includes(t)) d.cleared.push(t); });
  (efek.hilangkanBukti || []).forEach((id) => { if (!d.bukti.includes(id) && !d.hilang.includes(id)) d.hilang.push(id); });
  Object.entries(efek.biayaEkstra || {}).forEach(([id, m]) => { d.biayaEkstra[id] = m; });
  if (efek.cutscene && !d.cutsceneDilihat.includes(efek.cutscene) && !d.antreanCutscene.includes(efek.cutscene)) {
    d.antreanCutscene.push(efek.cutscene);
  }
  if (efek.pesan) pesan(d, efek.pesan, 'info');
  if (efek.suara) bunyi(d, efek.suara);
}
