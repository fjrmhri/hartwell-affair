"""Aset v2: potret tokoh baru + varian ekspresi, 16 ikon bukti baru (E17-E32), dan E03 versi v2.
Jalankan: python3 tools/gen_v2_assets.py
- TIDAK menyentuh src/kasus/ atau peta (peta: tools/gen_maps.py).
- Potret dasar v1 (vivian, lowell, charles, graves) TIDAK ditimpa; varian dibuat dengan menumpuk lapisan di atasnya.
- Gaya mengikuti tools/gen_assets.py: latar #111, tinta #dcdcdc, noise 13%, arsiran 45 derajat."""
import os, re

POR, EVI = 'public/assets/portraits', 'public/assets/evidence'
INK, RED, AMBER = '#dcdcdc', '#a3262a', '#b8863b'
DEFS = ('<defs><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>'
        '<feColorMatrix type="saturate" values="0"/></filter>'
        '<pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        '<line x1="0" y1="0" x2="0" y2="8" stroke="#222" stroke-width="2"/></pattern></defs>')
NOISE = lambda w, h: f'<rect width="{w}" height="{h}" filter="url(#g)" opacity=".13"/>'

def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" font-family="Georgia,serif">{DEFS}'
            f'<rect width="{w}" height="{h}" fill="#111"/>{body}{NOISE(w, h)}</svg>')

def save(path, s):
    open(path, 'w', encoding='utf-8').write(s)

# ---------- Potret ----------
def wajah_dasar(nama, rambut, badan_fill='#2a2a2a', kulit='#bdbdbd', ekstra=''):
    """Kerangka potret 160x200 yang sama dengan potret v1: badan, rambut, wajah, label nama."""
    return (f'<path d="M14 200 Q14 138 80 132 Q146 138 146 200Z" fill="{badan_fill}" stroke="{INK}" stroke-width="3"/>'
            f'{rambut}<ellipse cx="80" cy="88" rx="30" ry="36" fill="{kulit}" stroke="{INK}" stroke-width="2"/>{ekstra}'
            f'<text x="80" y="192" fill="#ddd" font-size="12" text-anchor="middle">{nama}</text>')

MULUT = {
    'tenang': '<path d="M70 108 Q80 112 90 108" stroke="#222" stroke-width="3" fill="none"/>',
    'tertekan': '<path d="M70 111 Q80 105 90 111" stroke="#222" stroke-width="3" fill="none"/>',
    'datar': '<path d="M70 109 H90" stroke="#222" stroke-width="3"/>',
}
MATA = '<ellipse cx="68" cy="84" rx="4" ry="2.6" fill="#222"/><ellipse cx="92" cy="84" rx="4" ry="2.6" fill="#222"/>'

BARU = {
    'eleanor': dict(nama='ELEANOR', rambut='<path d="M48 80 Q44 46 80 44 Q116 46 112 80 Q102 58 80 58 Q58 58 48 80Z" fill="#8a8a8a"/><circle cx="80" cy="44" r="12" fill="#8a8a8a" stroke="#ddd"/>',
                    badan='#1c1c1c', ekstra='<path d="M60 150 L80 168 L100 150" fill="none" stroke="#444" stroke-width="3"/><g transform="translate(112 156)"><circle r="7" fill="#eee"/><path d="M-4 0H4M0 -4V4" stroke="' + RED + '" stroke-width="2.4"/></g>'),
    'doyle': dict(nama='DOYLE', rambut='<path d="M40 66 L120 66 L112 56 Q80 34 48 56Z" fill="#050505" stroke="#ddd"/><rect x="30" y="64" width="100" height="7" rx="3" fill="#050505" stroke="#ddd"/>',
                  badan='#262626', ekstra='<path d="M58 150 L80 140 L102 150 L96 200 H64Z" fill="#1a1a1a" stroke="#555"/><line x1="96" y1="114" x2="120" y2="110" stroke="#eee" stroke-width="3"/><circle cx="121" cy="110" r="2" fill="' + RED + '"/>'),
    'pruitt': dict(nama='PRUITT', rambut='<path d="M50 70 Q52 52 80 50 Q108 52 110 70 Q96 60 80 62 Q64 60 50 70Z" fill="#9a9a9a"/>',
                   badan='#202020', ekstra='<path d="M60 92 H76 M84 92 H100" stroke="#111" stroke-width="2"/><rect x="58" y="88" width="18" height="9" fill="none" stroke="#111" stroke-width="1.6"/><rect x="84" y="88" width="18" height="9" fill="none" stroke="#111" stroke-width="1.6"/><rect x="104" y="160" width="34" height="26" rx="3" fill="#3a2f22" stroke="#999"/>'),
    'sammy': dict(nama='SAMMY', rambut='<path d="M46 80 Q40 42 80 42 Q120 42 114 80 Q104 54 80 56 Q56 54 46 80Z" fill="#050505" stroke="#ddd"/>',
                  badan='#e6e6e6', ekstra='<path d="M66 140 L80 152 L94 140" fill="none" stroke="#333" stroke-width="2"/><g fill="#eee" stroke="#111">' + ''.join(f'<rect x="{18+i*12}" y="160" width="12" height="14"/>' for i in range(11)) + '</g>'),
}

# Lapisan ekspresi yang ditumpuk di atas potret (tidak menutupi wajah dasar)
def lapisan(tokoh, ekspresi):
    keringat = '<path d="M112 70 q4 8 0 12 q-4 -4 0 -12Z" fill="#9fc3d6" opacity=".85"/><path d="M48 78 q3 6 0 9 q-3 -3 0 -9Z" fill="#9fc3d6" opacity=".7"/>'
    alis_tegang = '<path d="M60 74 L74 78 M100 74 L86 78" stroke="#111" stroke-width="3" stroke-linecap="round"/>'
    air_mata = '<path d="M68 90 q-2 10 0 14" stroke="#9fc3d6" stroke-width="2.4" fill="none"/>'
    retak = f'<path d="M80 24 L74 48 L86 60 L78 80" stroke="{RED}" stroke-width="2.2" fill="none" opacity=".8"/>'
    tell = {
        'eleanor': '<path d="M66 106 Q80 118 94 106" stroke="#222" stroke-width="3.4" fill="none"/>',
        'vivian': '<circle cx="80" cy="150" r="8" fill="#ccc" stroke="#111"/><path d="M72 150 q8 -18 16 0" fill="none" stroke="#999"/><path d="M60 170 q12 -16 22 -14" stroke="#bdbdbd" stroke-width="8" stroke-linecap="round" fill="none"/>',
        'lowell': '<g transform="translate(116 162) rotate(-20)"><circle cx="-8" r="7" fill="none" stroke="#eee" stroke-width="2"/><circle cx="8" r="7" fill="none" stroke="#eee" stroke-width="2"/><path d="M-1 0H1" stroke="#eee" stroke-width="2"/></g><path d="M100 176 q12 -8 16 -14" stroke="#bdbdbd" stroke-width="8" stroke-linecap="round" fill="none"/>',
        'charles': '<path d="M62 84 Q68 80 74 84" stroke="#222" stroke-width="3" fill="none"/><path d="M66 108 Q82 116 94 104" stroke="#222" stroke-width="3" fill="none"/>',
        'graves': '<circle cx="112" cy="168" r="11" fill="#d9c27a" stroke="#111" stroke-width="2"/><path d="M112 168 V161 M112 168 L117 171" stroke="#111" stroke-width="1.6"/><path d="M112 157 V150" stroke="#d9c27a" stroke-width="2"/>',
    }
    if ekspresi == 'tertekan':
        return keringat + alis_tegang + MULUT['tertekan']
    if ekspresi == 'bohong':
        return tell.get(tokoh, '')
    if ekspresi == 'retak':
        extra = '<rect x="24" y="150" width="30" height="22" fill="#cfcfcf" stroke="#111" transform="rotate(-8 39 161)"/>' if tokoh == 'graves' else ''
        return air_mata + MULUT['datar'] + retak + extra
    return ''

def isi_svg(teks):
    """Ambil isi <svg> tanpa metadata, latar, dan lapisan noise terakhir."""
    t = re.sub(r'<metadata>.*?</metadata>', '', teks, flags=re.S)
    t = re.sub(r'^.*?</defs>', '', t, count=1, flags=re.S)
    t = re.sub(r'<rect width="160" height="200" fill="#111"/>', '', t, count=1)
    t = re.sub(r'<rect width="160" height="200" filter="url\(#g\)" opacity="\.13"/></svg>\s*$', '', t)
    return t

def potret():
    for tokoh in ['vivian', 'lowell', 'charles', 'graves']:
        dasar = isi_svg(open(f'{POR}/{tokoh}.svg', encoding='utf-8').read())
        for eks in ['tertekan', 'bohong', 'retak']:
            save(f'{POR}/{tokoh}_{eks}.svg', svg(160, 200, dasar + lapisan(tokoh, eks)))
    for tokoh, d in BARU.items():
        dasar = wajah_dasar(d['nama'], d['rambut'], d['badan'], ekstra=MATA + d['ekstra'])
        save(f'{POR}/{tokoh}.svg', svg(160, 200, dasar + MULUT['tenang']))
        daftar = ['tertekan', 'bohong', 'retak'] if tokoh == 'eleanor' else ['tertekan']
        for eks in daftar:
            mulut = '' if eks in ('tertekan', 'retak') or tokoh == 'eleanor' and eks == 'bohong' else MULUT['tenang']
            save(f'{POR}/{tokoh}_{eks}.svg', svg(160, 200, dasar + mulut + lapisan(tokoh, eks)))

# ---------- Bukti ----------
def bingkai(id_, isi):
    return svg(200, 200, f'<rect x="8" y="8" width="184" height="184" fill="none" stroke="#444" stroke-width="2"/>{isi}'
                         f'<text x="18" y="186" fill="#888" font-size="13">{id_}</text>')

def kertas(x, y, w, h, rot=0, warna='#d8d4c8', baris=6, mulai=None):
    mulai = mulai or y + 18
    garis = ''.join(f'<path d="M{x+12} {mulai+i*12}H{x+w-12 - (i % 3) * 14}" stroke="#555" stroke-width="2"/>' for i in range(baris))
    return f'<g transform="rotate({rot} {x+w/2} {y+h/2})"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{warna}" stroke="#111"/>{garis}</g>'

def teks(x, y, s, size=11, fill='#111', anchor='start', italic=False):
    gaya = ' font-style="italic"' if italic else ''
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}"{gaya}>{s}</text>'

BUKTI = {
    'e03_kotak_pil': ('E03', '<rect x="26" y="54" width="148" height="96" rx="8" fill="#2e2e2e" stroke="#dcdcdc" stroke-width="4"/>'
        + ''.join((f'<rect x="{34+c*20}" y="{62+r*22}" width="16" height="18" rx="3" fill="#1a1a1a" stroke="#555"/>'
                   + ('' if (r * 7 + c) in range(4, 13) else
                      (f'<ellipse cx="{42+c*20}" cy="{71+r*22}" rx="5" ry="7.5" fill="#f0f0f0"/>' if (r * 7 + c) < 4 else
                       f'<circle cx="{42+c*20}" cy="{71+r*22}" r="6" fill="#d9c79a"/>')))
                  for r in range(4) for c in range(7))
        + teks(100, 44, 'E.J.H.', 13, INK, 'middle', True)
        + teks(100, 168, '9 slot krem kosong', 11, '#aaa', 'middle')),
    'e17_botol_tetes': ('E17', '<ellipse cx="100" cy="150" rx="70" ry="18" fill="#2a1f14"/>'
        '<rect x="82" y="70" width="36" height="76" rx="8" fill="#5a3a1c" stroke="#dcdcdc" stroke-width="2"/>'
        '<rect x="90" y="50" width="20" height="22" fill="#222" stroke="#dcdcdc" stroke-width="2"/><path d="M100 38 V50" stroke="#dcdcdc" stroke-width="5"/>'
        f'<rect x="86" y="96" width="28" height="26" fill="#cfc6b0"/>' + teks(100, 112, 'St. Br', 9, RED, 'middle')
        + '<path d="M88 102 l24 14 M90 118 l20 -12" stroke="#7a6a50" stroke-width="1.5"/>'),
    'e18_wasiat_lama': ('E18', kertas(40, 26, 120, 150, -3) + teks(100, 46, 'WASIAT 1940', 11, '#111', 'middle')
        + '<rect x="52" y="120" width="96" height="16" fill="none" stroke="' + RED + '" stroke-width="2"/>' + teks(100, 132, 'Eleanor Marsh', 10, '#111', 'middle')
        + '<circle cx="138" cy="160" r="12" fill="none" stroke="#7a1d1d" stroke-width="2"/>'),
    'e19_log_telepon': ('E19', kertas(30, 24, 140, 150, 0, '#d2d2c4', 0)
        + ''.join(f'<path d="M38 {48+i*16}H162" stroke="#888"/>' for i in range(8))
        + teks(40, 44, 'JAM  SAL  TUJUAN', 9) + teks(40, 60, '21:50', 10) + teks(82, 60, '4', 12, RED) + teks(96, 60, 'Pruitt', 9)
        + teks(40, 76, '21:55', 10) + teks(82, 76, '2>5', 10) + teks(40, 92, '22:41', 10) + teks(82, 92, '6>2', 10)
        + teks(40, 108, '00:20', 10) + teks(82, 108, '1', 10) + teks(40, 124, '01:00', 10) + teks(82, 124, '4', 12, RED) + teks(96, 124, 'Detektif', 9)),
    'e20_daftar_kamar': ('E20', kertas(44, 40, 112, 120, 4, '#e0dccf', 0) + teks(100, 70, 'Timur: Ny. Marsh', 10, '#111', 'middle', True)
        + teks(100, 92, 'Barat: Tn. Charles', 10, '#111', 'middle', True) + teks(100, 122, 'saluran: 1 2 3 . . 6', 9, '#444', 'middle')),
    'e21_liontin': ('E21', '<path d="M100 20 Q60 60 70 96" stroke="#aaa" stroke-width="2" fill="none"/><path d="M100 20 Q140 60 130 96" stroke="#aaa" stroke-width="2" fill="none"/>'
        '<circle cx="74" cy="124" r="30" fill="#bdbdbd" stroke="#eee" stroke-width="3"/><circle cx="130" cy="124" r="30" fill="#bdbdbd" stroke="#eee" stroke-width="3"/>'
        '<circle cx="130" cy="124" r="22" fill="#d8d2c2"/><circle cx="130" cy="116" r="7" fill="#555"/><path d="M118 140 Q130 126 142 140" fill="#555"/><path d="M124 120 h12" stroke="#222" stroke-width="2"/>'
        + teks(74, 128, 'J.K. 1930', 9, '#333', 'middle', True)),
    'e22_kliping': ('E22', kertas(26, 22, 148, 156, 0, '#cfcabc', 0) + teks(100, 42, 'RAVENPORT HERALD', 10, '#111', 'middle')
        + teks(100, 58, 'EMPAT BELAS TEWAS', 12, '#111', 'middle')
        + ''.join(f'<path d="M36 {72+i*9}H{110}" stroke="#666" stroke-width="2"/>' for i in range(10))
        + f'<rect x="34" y="{72+8*9-6}" width="80" height="9" fill="none" stroke="{RED}" stroke-width="1.6"/>'
        + '<rect x="118" y="70" width="46" height="56" fill="#555"/>' + teks(141, 140, 'Gravesend', 8, '#111', 'middle')),
    'e23_foto_regu': ('E23', '<rect x="22" y="40" width="156" height="110" fill="#cfcfcf" stroke="#eee" stroke-width="4"/><rect x="30" y="48" width="140" height="94" fill="#3a3a3a"/>'
        + f'<rect x="30" y="48" width="140" height="94" fill="{AMBER}" opacity=".25"/>'
        + ''.join(f'<circle cx="{46+i*22}" cy="{86}" r="9" fill="#999"/><rect x="{38+i*22}" y="96" width="16" height="40" fill="#777"/>' for i in range(6))
        + '<rect x="150" y="70" width="18" height="70" fill="none" stroke="#ddd" stroke-dasharray="3 2"/>' + teks(100, 166, 'W. &amp; T. Gravesend', 10, INK, 'middle', True)),
    'e24_berkas': ('E24', '<rect x="34" y="40" width="132" height="120" rx="4" fill="#5a4a32" stroke="#dcdcdc" stroke-width="3"/>'
        '<rect x="34" y="40" width="132" height="22" fill="#4a3c28"/><path d="M34 100 H166" stroke="#c9b78f" stroke-width="3"/>'
        + teks(100, 86, 'W.G. 1931-1947', 13, '#e8dcc0', 'middle') + kertas(52, 112, 60, 40, -6, '#ddd', 2) + kertas(96, 116, 56, 36, 5, '#cfc6b0', 2)),
    'e25_wasiat_baru': ('E25', kertas(40, 22, 120, 156, 2, '#e6e2d4', 7) + teks(100, 40, '14 Nov 1947, 22:00', 9, '#111', 'middle', True)
        + f'<path d="M56 136 q14 -10 26 0 t28 -2" stroke="{RED}" stroke-width="2" fill="none"/>' + teks(62, 160, 'T. Graves', 9, '#111', 'start', True) + teks(116, 160, 'C. H.', 9, '#111', 'start', True)),
    'e26_bonggol_cek': ('E26', '<rect x="26" y="56" width="148" height="90" fill="#cfd8cf" stroke="#111"/><path d="M70 56 V146" stroke="#555" stroke-dasharray="4 3"/>'
        + teks(36, 80, 'No.0818', 9) + teks(36, 98, '14 Nov', 9) + teks(36, 116, 'C.H.', 11) + teks(120, 104, '$12.000', 15, '#111', 'middle') + teks(120, 128, 'E. J. Hartwell', 9, '#333', 'middle', True)),
    'e27_daftar_lagu': ('E27', kertas(46, 26, 108, 150, -4, '#ddd8c8', 0) + teks(100, 50, 'BLUE NOTE', 10, '#111', 'middle')
        + teks(60, 76, '21:30 set I', 10) + f'<ellipse cx="100" cy="100" rx="44" ry="12" fill="none" stroke="{RED}" stroke-width="2"/>' + teks(62, 104, 'jeda 22:30-23:15', 9) + teks(60, 132, '23:15 set II', 10)),
    'e28_sertifikat': ('E28', kertas(30, 34, 140, 110, 0, '#e8e2cf', 0) + teks(100, 58, 'PERAWAT TERDAFTAR', 10, '#111', 'middle')
        + teks(100, 82, 'Eleanor Hartwell', 12, '#111', 'middle', True) + teks(100, 104, 'Klinik Pengecoran 1931', 9, '#333', 'middle')
        + teks(100, 126, 'RN-3317', 11, RED, 'middle') + '<g transform="translate(150 158)"><circle r="12" fill="#eee" stroke="#111"/><path d="M-6 0H6M0 -6V6" stroke="' + RED + '" stroke-width="3.5"/></g>'),
    'e29_sarung_tangan': ('E29', '<path d="M50 160 V90 q0 -8 8 -8 q8 0 8 8 V70 q0 -8 8 -8 q8 0 8 8 V64 q0 -8 8 -8 q8 0 8 8 V72 q0 -8 8 -8 q8 0 8 8 V130 q0 30 -30 30Z" fill="#eeeeee" stroke="#888" stroke-width="2"/>'
        '<path d="M60 140 q16 6 30 -2" stroke="#6b5233" stroke-width="6" opacity=".7" fill="none"/><circle cx="74" cy="66" r="5" fill="#c9b04a" opacity=".85"/><circle cx="58" cy="86" r="4" fill="#c9b04a" opacity=".8"/>'),
    'e30_surat_pengakuan': ('E30', '<rect x="30" y="60" width="140" height="90" fill="#d9cfb4" stroke="#111"/><path d="M30 60 L100 112 L170 60" fill="none" stroke="#8a7d60" stroke-width="2"/>'
        + f'<circle cx="100" cy="112" r="14" fill="{RED}"/>' + teks(100, 116, 'EJH', 9, '#f0d0d0', 'middle') + teks(100, 52, 'Kepada Redaksi Herald', 10, INK, 'middle', True)),
    'e31_surat_kematian_1931': ('E31', ''.join(kertas(46 + i * 6, 30 + i * 6, 96, 120, -6 + i * 3, '#d6d0be', 5) for i in range(4))
        + teks(116, 160, 'A. Lowell x14', 10, '#111', 'middle', True)),
    'e32_register_racun': ('E32', '<rect x="20" y="40" width="160" height="120" fill="#cfc8b4" stroke="#111"/><path d="M100 40 V160" stroke="#555" stroke-width="3"/>'
        + ''.join(f'<path d="M28 {60+i*14}H92 M108 {60+i*14}H172" stroke="#888"/>' for i in range(7))
        + teks(108, 86, '2 Nov', 9) + teks(108, 100, 'Tinktur dig.', 9) + f'<rect x="106" y="104" width="68" height="14" fill="none" stroke="{RED}" stroke-width="1.6"/>' + teks(110, 115, 'E. Marsh RN-3317', 8)),
}

def bukti():
    for nama, (id_, isi) in BUKTI.items():
        save(f'{EVI}/{nama}.svg', bingkai(id_, isi))

if __name__ == '__main__':
    os.makedirs(POR, exist_ok=True); os.makedirs(EVI, exist_ok=True)
    potret(); bukti()
    print('potret dan bukti v2 selesai')
