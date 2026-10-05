import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import sfx from './audio';
import P from './kasus/hartwell';
import * as A from './engine/aksi.js';

export { P };
export const KUNCI_SAVE = 'hartwell-save-v2';
const KUNCI_PERMANEN = 'hartwell-permanen-v2'; // petunjuk main ulang dan pencapaian (per peramban)

// localStorage bisa tidak tersedia (mode privat); semua akses dibungkus try/catch
export function bacaPermanen() {
  try { return JSON.parse(localStorage.getItem(KUNCI_PERMANEN)) || { endingDilihat: [], pencapaian: [] }; }
  catch { return { endingDilihat: [], pencapaian: [] }; }
}
function tulisPermanen(v) { try { localStorage.setItem(KUNCI_PERMANEN, JSON.stringify(v)); } catch { /* abaikan */ } }

function catatAkhir(s) {
  const p = bacaPermanen();
  const end = s.hasil?.ending;
  if (end && !p.endingDilihat.includes(end)) p.endingDilihat.push(end);
  const baru = [];
  if (s.hasil?.menang) {
    if (!s.petunjuk.length) baru.push('tanpa_petunjuk');
    if (!s.salahBantah && !s.salahHubung && !s.salahTekaTeki) baru.push('tanpa_salah');
    if (!s.flags.__pernahTertutup) baru.push('tanpa_tertutup');
  }
  if (end === 'kebenaran_dipesan') baru.push('kebenaran_dipesan');
  baru.forEach((b) => { if (!p.pencapaian.includes(b)) p.pencapaian.push(b); });
  tulisPermanen(p);
}

const SUARA = { collect: 'collect', ask: 'ask', sting: 'sting', link: 'link', wrong: 'wrong', hint: 'hint', win: 'win', lose: 'lose' };
const putar = (daftar) => daftar.forEach((n) => { const f = sfx[SUARA[n]]; if (f) f(); });

// Membungkus aksi murni: jalankan, putar suara, simpan state.
const jalankan = (set, get) => (fn) => (...args) => {
  const sebelum = get();
  const { state, suara } = fn(sebelum, P, ...args);
  if (state === sebelum) return;
  putar(suara);
  if (Object.keys(state.flags).some((k) => k.endsWith('_tertutup') && state.flags[k])) state.flags.__pernahTertutup = true;
  set(state);
  if (state.status === 'ending' && sebelum.status !== 'ending') catatAkhir(state);
  if (state.status === 'lost' && sebelum.status === 'playing') catatAkhir(state);
};

export const useGame = create(persist((set, get) => {
  const j = jalankan(set, get);
  return {
    ...A.stateAwal(),
    begin: (diff) => set({ ...A.stateAwal(), status: 'intro', diff }, false),
    finishIntro: () => {
      j(A.mulai)(get().diff);
      // Ending kalah khusus yang pernah dilihat memberi firasat (catatan awal) untuk permainan berikutnya
      const dilihat = bacaPermanen().endingDilihat;
      const firasat = Object.entries(P.cerita.firasatMainUlang || {}).filter(([e]) => dilihat.includes(e)).map(([, t]) => t);
      set((s) => ({ catatan: [...firasat, ...s.catatan], flags: { ...s.flags, __main_ulang: dilihat.includes('kebenaran_dipesan') } }));
    },
    start: (diff) => j(A.mulai)(diff),
    resume: () => set({ status: 'playing' }),
    openDoc: (id) => set({ doc: id }),
    // Penanda "Baru" di menu Bukti hilang setelah pemain membuka berkas itu sendiri (bukan saat terbuka otomatis ketika ditemukan)
    lihat: (id) => set((s) => (s.dilihat.includes(id) ? s : { dilihat: [...s.dilihat, id] })),
    lihatSemua: () => set((s) => ({ dilihat: [...new Set([...s.dilihat, ...s.bukti, ...s.kartu])] })),
    moveCard: (id, x, y) => set((s) => ({ boardPos: { ...s.boardPos, [id]: { x, y } } })),
    tick: j(A.detak),
    kunjungi: j(A.kunjungi),
    collect: j(A.periksa),
    periksaInfo: j(A.periksaInfo),
    ask: j(A.tanya),
    bantah: j(A.bantah),
    tekan: j(A.tekan),
    link: j(A.hubungkan),
    hint: j(A.petunjuk),
    jawabTekaTeki: j(A.jawabTekaTeki),
    bukaTuduhan: j(A.bukaTuduhan),
    tutupTuduhan: () => set((s) => ({ flags: { ...s.flags, tuduhanTerbuka: false } })),
    accuse: j(A.tuduh),
    selesaiCutscene: j(A.selesaiCutscene),
    finishEnding: j(A.selesaiEnding),
  };
}, {
  name: KUNCI_SAVE, version: 2,
  // Simpan progres hanya saat kasus berjalan; setelah reload game 'dijeda' agar timer tidak jalan sendiri.
  partialize: (s) => {
    if (s.status !== 'playing' && s.status !== 'paused') return { status: 'menu' };
    const { doc, msg, msgJenis, ...rest } = s;
    const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function'));
    return { ...data, status: 'paused', versiPaket: P.kasus.meta.versiPaket };
  },
  // Save dari paket lain (atau versi lain) ditolak dan pemain kembali ke menu
  merge: (simpan, sekarang) => {
    if (!simpan || simpan.status !== 'paused' || simpan.versiPaket !== P.kasus.meta.versiPaket) return { ...sekarang, status: 'menu' };
    // Save sebelum penanda "Baru" ada: anggap semua bukti/kartu lama sudah dilihat
    const dilihat = simpan.dilihat || [...(simpan.bukti || []), ...(simpan.kartu || [])];
    return { ...sekarang, ...simpan, dilihat };
  },
}));

// Save v1 ("hartwell-save-v1") memakai cerita lama dan tidak bisa dilanjutkan. Hapus dan beri tahu sekali.
export function migrasiSaveLama() {
  try {
    if (localStorage.getItem('hartwell-save-v1') === null) return false;
    localStorage.removeItem('hartwell-save-v1');
    return true;
  } catch { return false; }
}
