"""!!! PERINGATAN !!!  Skrip ini MENIMPA SEMUA aset di public/assets/{maps,evidence,portraits}
dan MENULIS ULANG src/data/case.json (path map + room). Aset final proyek (peta, ikon bukti, potret)
sudah disempurnakan dan akan HILANG bila skrip ini dijalankan. Hanya jalan bila diberi --force.
Untuk membuat ulang 3 SVG peta saja, pakai tools/gen_maps.py.

Membuat aset SVG noir placeholder. Jalankan: python3 tools/gen_assets.py --force
Menulis ke public/assets/{maps,evidence,portraits} dan memperbarui path map + room di src/data/case.json."""
import os, json, sys
if '--force' not in sys.argv[1:]:
    print('PERINGATAN: tools/gen_assets.py menimpa SEMUA aset dan src/data/case.json.\n'
          'Tidak ada yang diubah. Jalankan dengan --force bila memang yakin.\n'
          'Untuk peta saja, gunakan tools/gen_maps.py.')
    sys.exit(1)
OUT, CASE = 'public/assets', 'src/data/case.json'
for d in ('maps', 'evidence', 'portraits'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
INK, PAPER = '#dcdcdc', '#e6e6e6'
DEFS = ('<defs><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>'
        '<feColorMatrix type="saturate" values="0"/></filter>'
        '<pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        '<line x1="0" y1="0" x2="0" y2="8" stroke="#222" stroke-width="2"/></pattern></defs>')
def svg(w, h, body, bg='#0d0d0d'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" font-family="Georgia,serif">{DEFS}'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}<rect width="{w}" height="{h}" filter="url(#g)" opacity=".13"/></svg>')
def save(path, s): open(f'{OUT}/{path}', 'w', encoding='utf-8').write(s)

# ---------- DENAH ----------
def room(x, y, w, h, label, fill='url(#h)'):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#141414" stroke="{INK}" stroke-width="3"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" opacity=".6"/>'
            f'<text x="{x+10}" y="{y+22}" fill="#aaa" font-size="15" font-style="italic">{label}</text>')
def furn(x, y, w, h, label=''):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#777" stroke-dasharray="5 3"/>'
            f'<text x="{x+w/2}" y="{y+h/2+4}" fill="#777" font-size="11" text-anchor="middle">{label}</text>')
MAPS = {
 'denah_lantai1': ('Mansion Hartwell: Lantai 1', {
    'ruang_tamu': (40, 40, 300, 220, 'Ruang Tamu'), 'pantry': (360, 40, 160, 120, 'Pantry'),
    'kamar_graves': (540, 40, 220, 120, 'Kamar Graves'), 'taman_samping': (40, 300, 720, 190, 'Taman Samping'),
    None: [(360, 180, 400, 100, 'Aula Pesta')]},
   [furn(60, 70, 110, 40, 'meja tulis'), furn(200, 180, 100, 60, 'sofa'), furn(375, 60, 80, 30, 'papan catatan'),
    furn(560, 60, 60, 90, 'lemari'), furn(70, 420, 60, 40, 'pintu samping')]),
 'denah_lantai2': ('Mansion Hartwell: Lantai 2', {
    'ruang_kerja': (40, 40, 340, 240, 'Ruang Kerja Edmund'), 'kamar_vivian': (420, 40, 340, 240, 'Kamar Vivian'),
    None: [(40, 300, 720, 60, 'Koridor Timur'), (40, 380, 340, 110, 'Kamar Tamu'), (420, 380, 340, 110, 'Tangga dan Aula')]},
   [furn(150, 110, 130, 50, 'meja kerja'), furn(60, 80, 70, 40, 'brankas'), furn(60, 200, 90, 50, 'laci meja'),
    furn(440, 190, 140, 70, 'ranjang'), furn(620, 60, 110, 50, 'meja rias')]),
 'peta_kota': ('Peta Ravenport', {
    'klinik_lowell': (60, 60, 220, 160, 'Klinik Dr. Lowell'), 'kamar_mayat': (520, 60, 220, 160, 'Kamar Mayat Kota'),
    'blue_note_club': (520, 300, 220, 160, 'Blue Note Club'), None: [(60, 300, 220, 160, 'Mansion Hartwell')]},
   ['<line x1="0" y1="260" x2="800" y2="260" stroke="#555" stroke-width="30"/>'
    '<line x1="0" y1="260" x2="800" y2="260" stroke="#999" stroke-dasharray="14 12"/>'
    '<line x1="400" y1="0" x2="400" y2="520" stroke="#555" stroke-width="24"/>']),
}
case = json.load(open(CASE, encoding='utf-8'))
for fn, (title, rooms, extra) in MAPS.items():
    body = ''.join(room(*r[:4], r[4]) for k, r in rooms.items() if k) + ''.join(room(*r) for r in rooms.get(None, []))
    body = (extra[0] if fn == 'peta_kota' else '') + body + (''.join(extra) if fn != 'peta_kota' else '')
    body += f'<text x="790" y="510" fill="#888" font-size="14" text-anchor="end">{title}</text>'
    save(f'maps/{fn}.svg', svg(800, 520, body))
    for k, r in rooms.items():
        if k:
            case['locations'][k]['map'] = f'assets/maps/{fn}.svg'
            case['locations'][k]['room'] = {'x': round(r[0]/8, 2), 'y': round(r[1]/5.2, 2), 'w': round(r[2]/8, 2), 'h': round(r[3]/5.2, 2)}
json.dump(case, open(CASE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- IKON BUKTI ----------
def paper(inner, rot=-3): return f'<g transform="rotate({rot} 100 95)"><rect x="55" y="28" width="90" height="125" fill="{PAPER}"/>{inner}</g>'
def lines(n, y=48, gap=14, x=66, w=68): return ''.join(f'<rect x="{x}" y="{y+i*gap}" width="{w-(i%3)*10}" height="3" fill="#444"/>' for i in range(n))
def txt(s, x, y, size, fill='#222', anchor='middle', extra=''): return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" {extra}>{s}</text>'
S = f'stroke="{INK}" stroke-width="4"'
ICONS = {
 'E01': f'<rect x="28" y="38" width="144" height="116" fill="#1c1c1c" {S}/><rect x="42" y="52" width="116" height="88" fill="#2c2c2c"/><rect x="50" y="58" width="32" height="76" fill="#0d0d0d"/><circle cx="122" cy="88" r="11" fill="{INK}"/><path d="M104 138 Q122 100 140 138Z" fill="{INK}"/>',
 'E02': paper(lines(5) + f'<circle cx="122" cy="125" r="14" stroke="#333" stroke-width="3" fill="none"/>' + txt('†', 122, 132, 20)),
 'E03': f'<rect x="38" y="90" width="124" height="66" rx="6" fill="#2e2e2e" {S}/><rect x="52" y="40" width="56" height="22" rx="11" fill="{INK}" transform="rotate(-12 80 50)"/><rect x="100" y="52" width="56" height="22" rx="11" fill="#777" transform="rotate(10 128 62)"/>',
 'E04': f'<path d="M62 44 L138 44 L122 154 L78 154Z" fill="none" {S}/><path d="M68 90 L132 90 L122 154 L78 154Z" fill="#555"/><ellipse cx="72" cy="44" rx="10" ry="5" fill="#aaa"/>',
 'E05': f'<circle cx="68" cy="95" r="26" fill="none" {S}/><circle cx="68" cy="95" r="8" fill="{INK}"/><rect x="94" y="90" width="76" height="10" fill="{INK}"/><rect x="146" y="100" width="8" height="18" fill="{INK}"/><rect x="160" y="100" width="8" height="12" fill="{INK}"/>',
 'E06': paper(txt('22:25', 100, 60, 16) + txt('22:40', 100, 90, 16) + lines(3, 110)),
 'E07': f'<rect x="48" y="30" width="104" height="134" fill="#2b2b2b" {S}/><line x1="66" y1="30" x2="66" y2="164" stroke="{INK}" stroke-width="3"/><rect x="80" y="52" width="58" height="28" fill="none" stroke="{INK}" stroke-width="2"/>' + txt('DIARY', 109, 71, 13, INK),
 'E08': f'<rect x="24" y="68" width="152" height="64" fill="{PAPER}"/>' + txt('TELEGRAM', 100, 92, 18) + '<path d="M36 108 H164" stroke="#444" stroke-dasharray="6 4" stroke-width="3"/>' + txt('STOP  STOP', 100, 124, 11),
 'E09': paper(lines(4) + '<line x1="66" y1="62" x2="134" y2="62" stroke="#000" stroke-width="3"/><circle cx="120" cy="128" r="14" fill="#666"/>'),
 'E10': paper(txt('$', 100, 88, 42) + '<path d="M66 128 q10 -16 16 0 t16 -4 t18 2" stroke="#222" stroke-width="2" fill="none"/>' + lines(2, 40, 10)),
 'E11': f'<rect x="52" y="66" width="96" height="72" fill="#2c2c2c" {S}/><rect x="52" y="112" width="96" height="10" fill="#777"/>' + txt('BLUE NOTE', 100, 96, 12, INK) + f'<rect x="120" y="42" width="6" height="30" fill="{INK}"/><circle cx="123" cy="40" r="6" fill="#888"/>',
 'E12': f'<rect x="32" y="70" width="136" height="60" fill="{PAPER}"/><circle cx="32" cy="100" r="9" fill="#111"/><circle cx="168" cy="100" r="9" fill="#111"/>' + txt('PARKIR', 100, 92, 13) + txt('22:58', 100, 120, 20),
 'E13': paper(txt('Rx', 84, 78, 34) + lines(3, 96)),
 'E14': f'<rect x="38" y="34" width="124" height="130" fill="#e0e0e0"/>' + ''.join(f'<line x1="38" y1="{58+i*20}" x2="162" y2="{58+i*20}" stroke="#666"/>' for i in range(6)) + '<line x1="100" y1="34" x2="100" y2="164" stroke="#b00" stroke-width="0"/><line x1="100" y1="34" x2="100" y2="164" stroke="#444" stroke-width="2"/>' + txt('8.400', 132, 118, 12) + txt('LEDGER', 100, 50, 11),
 'E15': f'<rect x="30" y="62" width="140" height="92" fill="{PAPER}"/><path d="M30 62 L100 114 L170 62" stroke="#333" stroke-width="3" fill="none"/><path d="M100 148 C70 126 78 104 100 120 C122 104 130 126 100 148Z" fill="#555"/>' + txt('L', 100, 84, 0),
 'E16': f'<rect x="48" y="30" width="104" height="140" fill="#2b2b2b" {S}/><rect x="78" y="22" width="44" height="16" fill="{INK}"/><rect x="60" y="48" width="80" height="112" fill="{PAPER}"/><circle cx="100" cy="76" r="10" stroke="#333" stroke-width="3" fill="none"/><path d="M100 86 V126 M80 98 H120 M100 126 L86 150 M100 126 L114 150" stroke="#333" stroke-width="3" fill="none"/>',
}
for e in case['evidence']:
    body = (f'<rect x="8" y="8" width="184" height="184" fill="none" stroke="#444" stroke-width="2"/>{ICONS[e["id"]]}'
            f'<text x="18" y="186" fill="#888" font-size="13">{e["id"]}</text>')
    save(f'evidence/{os.path.basename(e["image"])}', svg(200, 200, body, '#111'))
    e['image'] = f'assets/evidence/{os.path.basename(e["image"])}'
json.dump(case, open(CASE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- POTRET ----------
def portrait(hair, extra, name):
    body = (f'<path d="M14 200 Q14 138 80 132 Q146 138 146 200Z" fill="#2a2a2a" stroke="{INK}" stroke-width="3"/>'
            f'{hair[0]}<ellipse cx="80" cy="88" rx="30" ry="36" fill="#bdbdbd" stroke="{INK}" stroke-width="2"/>{hair[1]}{extra}'
            f'<text x="80" y="192" fill="#ddd" font-size="12" text-anchor="middle">{name}</text>')
    return svg(160, 200, body, '#111')
G = '<circle cx="66" cy="86" r="9" fill="none" stroke="#111" stroke-width="2"/><circle cx="94" cy="86" r="9" fill="none" stroke="#111" stroke-width="2"/><line x1="75" y1="86" x2="85" y2="86" stroke="#111" stroke-width="2"/>'
save('portraits/vivian.svg', portrait(('<path d="M44 96 Q36 40 80 40 Q124 40 116 96 L112 128 L48 128Z" fill="#050505" stroke="#ddd"/>', '<path d="M46 66 Q80 44 114 66 Q80 56 46 66Z" fill="#050505"/><path d="M70 108 Q80 114 90 108" stroke="#222" stroke-width="3" fill="none"/>'), '', 'VIVIAN'))
save('portraits/lowell.svg', portrait(('', '<path d="M50 78 Q80 44 110 78 Q80 62 50 78Z" fill="#555"/><path d="M68 108 Q80 104 92 108" stroke="#222" stroke-width="4" fill="none"/>'), G + '<rect x="108" y="150" width="34" height="28" fill="#111" stroke="#ddd"/>', 'DR. LOWELL'))
save('portraits/charles.svg', portrait(('', '<path d="M48 80 Q52 46 80 50 Q108 46 112 80 Q96 62 80 66 Q62 62 48 80Z" fill="#111"/><path d="M70 108 H90" stroke="#222" stroke-width="3"/>'), '<path d="M74 134 L86 134 L92 190 L80 178 L68 190Z" fill="#888"/>', 'CHARLES'))
save('portraits/graves.svg', portrait(('', '<path d="M46 80 Q44 66 52 64 M114 80 Q116 66 108 64" stroke="#ddd" stroke-width="4" fill="none"/><path d="M70 108 H90" stroke="#222" stroke-width="3"/>'), '<path d="M80 138 L62 128 L62 148Z M80 138 L98 128 L98 148Z" fill="#eee"/>', 'MR. GRAVES'))
print('aset dibuat:', len(os.listdir(f'{OUT}/maps')), 'denah,', len(os.listdir(f'{OUT}/evidence')), 'ikon,', len(os.listdir(f'{OUT}/portraits')), 'potret')
