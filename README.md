# The Hartwell Affair

Game detektif noir berbahasa Indonesia (Ravenport, 1947). Periksa TKP, kumpulkan bukti, interogasi
empat tersangka, lalu hubungkan petunjuk di Papan Deduksi sebelum waktu habis.
Dibuat dengan React 18 + Vite 5 + Zustand; CSS tunggal (`src/styles.css`), tanpa library UI.

## Perintah

```bash
npm install        # pasang dependensi (atau: npm ci, sesuai package-lock.json)
npm run dev        # server pengembangan
npm run build      # build produksi ke dist/
npm run preview    # coba hasil build secara lokal
npm run test:sim   # simulasi alur game (logika store, tanpa browser)
```

## Deploy (hosting statis)

Build memakai jalur relatif (`base: './'`), jadi `dist/` bisa diunggah ke root maupun subfolder.

- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** jalankan `npm run build`, lalu publikasikan isi `dist/` (mis. cabang `gh-pages`).

## Struktur

- `src/store.js` : logika game (Zustand). `src/audio.js` : suara. `src/components/` : tampilan.
- `src/data/` : isi kasus (`case.json`, `dialog.json`, `documents.json`, `story.json`).
  Mengubah teks/ID di sini memengaruhi alur dan skor; jalankan `npm run test:sim` setelahnya.
- `public/assets/` : peta, ikon bukti, dan potret (SVG).
- `tools/gen_maps.py` : membuat ulang 3 SVG peta saja.

## Peringatan

`tools/gen_assets.py` MENIMPA semua aset dan `src/data/case.json`. Skrip ini menolak berjalan tanpa
argumen `--force`; jangan dipakai kecuali memang ingin mengulang dari aset placeholder.
