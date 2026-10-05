// Titik masuk bundel simulasi (dibundel esbuild ke .simcache/sim.mjs oleh `npm run test:sim`).
export { default as P } from '../src/kasus/hartwell/index.js';
export * as A from '../src/engine/aksi.js';
export { cekSyarat } from '../src/engine/kondisi.js';
export { validasiPaket } from '../src/engine/skema.js';
export { useGame, KUNCI_SAVE, migrasiSaveLama } from '../src/store.js';
