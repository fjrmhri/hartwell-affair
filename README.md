# The Hartwell Affair

Game detektif noir berbahasa Indonesia (Ravenport, 1947). Periksa TKP, interogasi tokoh dengan nada yang
berkonsekuensi, bantah kesaksian dengan bukti, pecahkan teka-teki, lalu susun surat tuduhan lengkap
sebelum jenazah dimakamkan pukul enam pagi. Tujuh plotwist, delapan ending, tiga pilihan moral.
Dibuat dengan React 18 + Vite 5 + Zustand; CSS tunggal (`src/styles.css`), tanpa library UI.

## Perintah

```bash
npm install        # pasang dependensi (atau: npm ci, sesuai package-lock.json)
npm run dev        # server pengembangan
npm run build      # build produksi ke dist/
npm run preview    # coba hasil build secara lokal
npm run test:sim   # validasi paket kasus + simulasi alur game (engine asli, tanpa browser)
```

CI (`.github/workflows/ci.yml`) menjalankan `test:sim` dan `build` di setiap push dan pull request.

## Deploy (hosting statis)

Build memakai jalur relatif (`base: './'`), jadi `dist/` bisa diunggah ke root maupun subfolder.

- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** jalankan `npm run build`, lalu publikasikan isi `dist/` (mis. cabang `gh-pages`).

## Struktur

- `src/engine/` : engine tanpa isi kasus.
  - `kondisi.js` evaluator syarat terpadu (`{semua, salahSatu, bukan, bukti, kartu, node, flag, meter, deduksi, ...}`).
  - `efek.js` penerap efek (`beriBukti`, `beriKartu`, `setFlag`, `meter`, `konfirmasiDeduksi`, `cutscene`, ...).
  - `aksi.js` aksi murni `(state, paket, ...) -> { state, suara }`: periksa, kunjungi, tanya, bantah, hubungkan,
    teka-teki, petunjuk, tuduhan, waktu dan kejadian.
  - `skema.js` validator paket kasus (ID unik dan semua rujukan antar-file).
- `src/kasus/hartwell/` : paket kasus (data saja). `kasus.json` (konfigurasi, tokoh, lokasi, bukti, kartu,
  petunjuk), `dialog.json`, `kesaksian.json`, `deduksi.json`, `tekateki.json`, `kejadian.json`, `tuduhan.json`,
  `cerita.json` (intro, cutscene, ending), `dokumen.json` (isi berkas bukti).
- `src/store.js` : membungkus aksi dengan Zustand, menyimpan progres (`hartwell-save-v2`), memutar suara.
- `src/components/` : tampilan (Peta, Dialog + Kesaksian, Bukti, Analisis, Catatan, Papan, Tuduhan, Cutscene).
- `public/assets/` : denah, ikon bukti, dan potret dengan varian ekspresi (SVG).

Mengubah teks atau ID di `src/kasus/` memengaruhi alur dan skor; jalankan `npm run test:sim` setelahnya.
Engine tidak boleh memuat ID bukti atau nama tokoh; `test:sim` memeriksanya.

## Generator aset

- `tools/gen_v2_assets.py` : potret tokoh baru, varian ekspresi, ikon bukti E17 sampai E32, dan E03.
  Potret dasar v1 tidak ditimpa.
- `tools/gen_maps.py` : tiga SVG denah/peta; memeriksa bahwa koordinat ruangan cocok dengan `kasus.json`.
- `tools/gen_assets.py` : generator v1 yang sudah usang; menolak berjalan.

## Catatan konten

Kadar racun memakai satuan fiksi "unit Ashby" dan alur medisnya hanya memakai fakta umum; permainan tidak
memuat takaran atau cara memperoleh racun.
