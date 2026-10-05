// Evaluator kondisi terpadu. Satu objek syarat berisi tepat satu kunci; {} (atau kosong) selalu benar.
// Atom: bukti, kartu, node, flag, flagSama, meter, deduksi, tekaTeki, kesaksian, sisaWaktuPersen, kesulitan,
// semua, salahSatu, bukan. Atom khusus tuduhan (dipilih, dipilihMinimal, slotBenar, slotBenarMinimal) butuh `konteks`.

const BANDING = {
  '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b,
  '<': (a, b) => a < b, '==': (a, b) => a === b,
};

export const ATOM = ['bukti', 'kartu', 'node', 'flag', 'flagSama', 'meter', 'deduksi', 'tekaTeki', 'kesaksian',
  'sisaWaktuPersen', 'kesulitan', 'semua', 'salahSatu', 'bukan'];
export const ATOM_TUDUHAN = ['dipilih', 'dipilihMinimal', 'slotBenar', 'slotBenarMinimal'];

export function cekSyarat(syarat, s, P, konteks) {
  if (!syarat) return true;
  const kunci = Object.keys(syarat);
  if (!kunci.length) return true;
  const k = kunci[0], v = syarat[k];
  switch (k) {
    case 'semua': return v.every((x) => cekSyarat(x, s, P, konteks));
    case 'salahSatu': return v.some((x) => cekSyarat(x, s, P, konteks));
    case 'bukan': return !cekSyarat(v, s, P, konteks);
    case 'bukti': return s.bukti.includes(v);
    case 'kartu': return s.kartu.includes(v);
    case 'node': return s.tanya.includes(v);
    case 'flag': return !!s.flags[v];
    case 'flagSama': return s.flags[v[0]] === v[1];
    case 'deduksi': return s.deduksi.includes(v);
    case 'tekaTeki': return s.tekaTeki.includes(v);
    case 'kesaksian': return s.kesaksianSelesai.includes(v);
    case 'kesulitan': return s.diff === v;
    case 'meter': {
      const [tokoh, jenis, op, n] = v;
      return BANDING[op](nilaiMeter(s, P, tokoh, jenis), n);
    }
    case 'sisaWaktuPersen': {
      const total = P.kasus.config.kesulitan[s.diff].timerMenit * 60;
      return BANDING[v[0]]((s.timeLeft / total) * 100, v[1]);
    }
    case 'dipilih': return !!konteks && konteks.dipilih.includes(v);
    case 'dipilihMinimal': return !!konteks && v[0].filter((x) => konteks.dipilih.includes(x)).length >= v[1];
    case 'slotBenar': return !!konteks && !!konteks.benar[v];
    case 'slotBenarMinimal': return !!konteks && konteks.jumlahBuktiBenar >= v;
    default: throw new Error(`Atom kondisi tidak dikenal: ${k}`);
  }
}

export function nilaiMeter(s, P, tokoh, jenis) {
  const m = s.meter[tokoh];
  if (m && m[jenis] !== undefined) return m[jenis];
  return P.kasus.tokoh[tokoh]?.meterAwal?.[jenis] ?? 0;
}
