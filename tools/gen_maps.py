"""Membuat ulang 3 SVG denah/peta (Bagian 4B). Jalankan: python3 tools/gen_maps.py
Hanya menulis public/assets/maps/*.svg. TIDAK menyentuh ikon bukti/potret dan TIDAK menulis case.json
(case.json hanya DIBACA untuk memastikan koordinat ruangan masih identik dengan persentase room di sana).
Font memakai variabel CSS (--ff-heading Playfair Display / --ff-label Oswald) dengan fallback;
MapView meng-inline SVG sehingga font web berlaku."""
import os, json, math, html, sys
OUT, CASE = 'public/assets/maps', 'src/data/case.json'
os.makedirs(OUT, exist_ok=True)

W, H = 800, 520
BONE, WHITE, FLOOR, BG, RED = '#e8e4d8', '#f2f0e8', '#14171b', '#0b0d10', '#c1121f'
DIM, LBL = '#a9a596', '#d6d2c4'
FH = "font-family:var(--ff-heading,'Playfair Display',Georgia,serif);font-weight:700;"
FL = "font-family:var(--ff-label,'Oswald','Arial Narrow',sans-serif);font-weight:500;"

# ---------- STRUKTUR MAPS (koordinat ruangan IDENTIK dengan gen_assets.py) ----------
MAPS = {
 'denah_lantai1': ('Mansion Hartwell: Lantai 1', {
    'ruang_tamu': (40, 40, 300, 220, 'Ruang Tamu'), 'pantry': (360, 40, 160, 120, 'Pantry'),
    'kamar_graves': (540, 40, 220, 120, 'Kamar Graves'), 'taman_samping': (40, 300, 720, 190, 'Taman Samping'),
    None: [(360, 180, 400, 100, 'Aula Pesta')]}),
 'denah_lantai2': ('Mansion Hartwell: Lantai 2', {
    'ruang_kerja': (40, 40, 340, 240, 'Ruang Kerja Edmund'), 'kamar_vivian': (420, 40, 340, 240, 'Kamar Vivian'),
    None: [(40, 300, 720, 60, 'Koridor Timur'), (40, 380, 340, 110, 'Kamar Tamu'), (420, 380, 340, 110, 'Tangga dan Aula')]}),
 'peta_kota': ('Peta Ravenport', {
    'klinik_lowell': (60, 60, 220, 160, 'Klinik Dr. Lowell'), 'kamar_mayat': (520, 60, 220, 160, 'Kamar Mayat Kota'),
    'blue_note_club': (520, 300, 220, 160, 'Blue Note Club'), None: [(60, 300, 220, 160, 'Mansion Hartwell')]}),
}

def check_rooms():
    """Baca-saja: pastikan persentase room di case.json masih cocok dengan koordinat MAPS."""
    case = json.load(open(CASE, encoding='utf-8'))
    for fn, (_, rooms) in MAPS.items():
        for k, r in rooms.items():
            if not k: continue
            want = {'x': round(r[0]/8, 2), 'y': round(r[1]/5.2, 2), 'w': round(r[2]/8, 2), 'h': round(r[3]/5.2, 2)}
            got = case['locations'][k]['room']
            if any(abs(want[a] - got[a]) > 0.005 for a in want) or case['locations'][k]['map'] != f'assets/maps/{fn}.svg':
                sys.exit(f'Koordinat/peta {k} tidak cocok dengan case.json: {want} vs {got}')

# ---------- Primitif ----------
def esc(s): return html.escape(s, quote=False)
def f(v): return f'{v:.2f}'.rstrip('0').rstrip('.')

def T(x, y, s, size, font, fill, anchor='start', ls=0, halo=False, extra=''):
    st = f'{font}font-size:{size}px;letter-spacing:{ls}px;'
    a = f'x="{f(x)}" y="{f(y)}" text-anchor="{anchor}" {extra}'
    txt = f'<text {a} fill="{fill}" style="{st}">{esc(s)}</text>'
    if not halo: return txt
    # Halo = salinan bergaris di bawah teks (tidak bergantung pada paint-order)
    return (f'<text {a} fill="{FLOOR}" stroke="{FLOOR}" stroke-width="4" stroke-linejoin="round" style="{st}">{esc(s)}</text>' + txt)

def defs(p):
    return (f'<defs>'
            f'<pattern id="{p}-g1" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="{BONE}" stroke-opacity=".055"/></pattern>'
            f'<pattern id="{p}-g2" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="{BONE}" stroke-opacity=".11"/></pattern>'
            f'<pattern id="{p}-h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="{BONE}" stroke-opacity=".11" stroke-width="1.5"/></pattern>'
            f'</defs>')

def svg(body, p):
    marks = ''.join(f'<path d="M{x+dx*12} {y}H{x}V{y+dy*12}" fill="none" stroke="{BONE}" stroke-opacity=".4" stroke-width="1.5"/>'
                    for x, y, dx, dy in ((8, 8, 1, 1), (792, 8, -1, 1), (8, 512, 1, -1), (792, 512, -1, -1)))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Georgia, serif">{defs(p)}'
            f'<rect width="{W}" height="{H}" fill="{BG}"/><rect width="{W}" height="{H}" fill="url(#{p}-g1)"/>'
            f'<rect width="{W}" height="{H}" fill="url(#{p}-g2)"/>{marks}{body}</svg>')

def room(x, y, w, h, label, p, hatch=False, label_fill=WHITE):
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{FLOOR}" stroke="{BONE}" stroke-width="6" stroke-linejoin="miter"/>')
    if hatch: s += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{p}-h)"/>'
    return s + T(x + 14, y + 27, label, 20, FH, label_fill, ls=0.2)

def door(x1, y1, x2, y2, nx, ny):
    """Pintu: celah di dinding + daun pintu + busur ayun ke dalam ruangan (arah normal nx,ny)."""
    L = math.hypot(x2 - x1, y2 - y1)
    if y1 == y2: patch = f'<rect x="{min(x1, x2)}" y="{y1-4}" width="{f(L)}" height="8" fill="{FLOOR}"/>'; jam = lambda x, y: f'M{x} {y-5}V{y+5}'
    else: patch = f'<rect x="{x1-4}" y="{min(y1, y2)}" width="8" height="{f(L)}" fill="{FLOOR}"/>'; jam = lambda x, y: f'M{x-5} {y}H{x+5}'
    lx, ly = x1 + nx * L, y1 + ny * L
    cross = (nx * L) * (y2 - y1) - (ny * L) * (x2 - x1)
    sweep = 1 if cross > 0 else 0
    return (patch + f'<path d="M{lx:g} {ly:g}A{f(L)} {f(L)} 0 0 {sweep} {x2} {y2}" fill="none" stroke="{BONE}" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="3 2.5"/>'
            f'<path d="M{x1} {y1}L{lx:g} {ly:g}" stroke="{BONE}" stroke-width="2.2" stroke-linecap="round"/>'
            f'<path d="{jam(x1, y1)}{jam(x2, y2)}" stroke="{BONE}" stroke-width="2.5"/>')

def window(x1, y1, x2, y2):
    """Jendela: celah di dinding dengan tiga garis kaca."""
    L = math.hypot(x2 - x1, y2 - y1)
    if y1 == y2:
        s = f'<rect x="{min(x1, x2)}" y="{y1-4}" width="{f(L)}" height="8" fill="{FLOOR}"/>'
        s += ''.join(f'<path d="M{min(x1, x2)} {y1+o}H{max(x1, x2)}" stroke="{BONE}" stroke-width="{w}" stroke-opacity="{a}"/>' for o, w, a in ((-3, 1.4, .9), (0, 1, .55), (3, 1.4, .9)))
        s += f'<path d="M{x1} {y1-5}V{y1+5}M{x2} {y2-5}V{y2+5}" stroke="{BONE}" stroke-width="2.5"/>'
    else:
        s = f'<rect x="{x1-4}" y="{min(y1, y2)}" width="8" height="{f(L)}" fill="{FLOOR}"/>'
        s += ''.join(f'<path d="M{x1+o} {min(y1, y2)}V{max(y1, y2)}" stroke="{BONE}" stroke-width="{w}" stroke-opacity="{a}"/>' for o, w, a in ((-3, 1.4, .9), (0, 1, .55), (3, 1.4, .9)))
        s += f'<path d="M{x1-5} {y1}H{x1+5}M{x2-5} {y2}H{x2+5}" stroke="{BONE}" stroke-width="2.5"/>'
    return s

def furn(x, y, w, h, label='', kind='box', ly=None, lx=None):
    """Furnitur bergaya denah (label >= 14px)."""
    st = f'stroke="{DIM}" stroke-width="1.6"'
    thin = f'stroke="{DIM}" stroke-width="1" stroke-opacity=".8" fill="none"'
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="{BONE}" fill-opacity=".07" {st}/>'
    if kind == 'desk':
        s += f'<rect x="{x+w-28}" y="{y+5}" width="23" height="{h-10}" {thin}/><path d="M{x+w-28} {y+h/2}H{x+w-5}" {thin}/>'
    elif kind == 'sofa':
        s += f'<rect x="{x}" y="{y}" width="{w}" height="9" fill="{BONE}" fill-opacity=".14" {st}/>'
        s += ''.join(f'<path d="M{x+w*i/3:g} {y+9}V{y+h}" {thin}/>' for i in (1, 2))
    elif kind == 'bed':
        pw = (w - 24) / 2
        s += f'<rect x="{x+8}" y="{y+6}" width="{pw:g}" height="13" rx="3" {thin}/><rect x="{x+16+pw:g}" y="{y+6}" width="{pw:g}" height="13" rx="3" {thin}/>'
        s += f'<path d="M{x} {y+h*0.42:g}H{x+w}" {thin}/>'
    elif kind == 'safe':
        s += f'<rect x="{x+4}" y="{y+4}" width="{w-8}" height="{h-8}" {thin}/>'
    elif kind == 'wardrobe':
        s += f'<path d="M{x+w/2:g} {y}V{y+h}" {thin}/><circle cx="{x+w/2-5:g}" cy="{y+h/2:g}" r="1.6" fill="{DIM}"/><circle cx="{x+w/2+5:g}" cy="{y+h/2:g}" r="1.6" fill="{DIM}"/>'
    elif kind == 'cabinet':
        s += ''.join(f'<path d="M{x} {y+h*i/3:g}H{x+w}" {thin}/>' for i in (1, 2))
    elif kind == 'board':
        s += ''.join(f'<circle cx="{x+w*i/5:g}" cy="{y+5}" r="1.6" fill="{DIM}"/>' for i in (1, 2, 3, 4))
    elif kind == 'stage':
        s += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#PID-h)"/>'
    if kind == 'desk' and lx is None: lx = x + (w - 30) / 2   # label di sisi kiri laci meja
    if label:
        s += T(x + w / 2 if lx is None else lx, (y + h / 2 + 5) if ly is None else ly, label, 14, FL, LBL, 'middle', 0.3, True)
    return s

def rtable(cx, cy, r=13):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{BONE}" fill-opacity=".07" stroke="{DIM}" stroke-width="1.5"/>'
            + ''.join(f'<circle cx="{cx+math.cos(a)*(r+6):.1f}" cy="{cy+math.sin(a)*(r+6):.1f}" r="3" fill="none" stroke="{DIM}" stroke-width="1"/>' for a in [i * math.pi / 2 + math.pi / 4 for i in range(4)]))

def tree(cx, cy, r=15):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{BONE}" fill-opacity=".06" stroke="{DIM}" stroke-width="1.4"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.55:g}" fill="none" stroke="{DIM}" stroke-width="1" stroke-dasharray="2 2.5"/>'
            f'<path d="M{cx-3} {cy}H{cx+3}M{cx} {cy-3}V{cy+3}" stroke="{DIM}" stroke-width="1"/>')

def compass(cx, cy, r=16):
    """Kompas: 'U' = Utara (jarum merah menunjuk ke atas)."""
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{FLOOR}" fill-opacity=".85" stroke="{BONE}" stroke-width="1.5"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r-4}" fill="none" stroke="{BONE}" stroke-opacity=".35"/>'
            f'<path d="M{cx} {cy-r+3}L{cx+4.5} {cy}L{cx-4.5} {cy}Z" fill="{RED}"/>'
            f'<path d="M{cx} {cy+r-3}L{cx+4.5} {cy}L{cx-4.5} {cy}Z" fill="{BONE}" fill-opacity=".85"/>'
            f'<path d="M{cx-r+3} {cy}H{cx+r-3}" stroke="{BONE}" stroke-opacity=".4"/>'
            + T(cx, cy - r - 5, 'U', 14, FL, WHITE, 'middle', 1, True))

def legend(y=512):
    x = 44
    s = (f'<g fill="none" stroke="{BONE}" stroke-width="1.8" stroke-linecap="round"><circle cx="{x+6}" cy="{y-8}" r="5"/><path d="M{x+10} {y-4}L{x+15} {y+1}"/></g>'
         + T(x + 22, y, '= titik periksa', 14, FL, LBL, ls=0.6))
    x2 = 200
    s += (f'<path d="M{x2} {y+1}V{y-11}" stroke="{BONE}" stroke-width="2" stroke-linecap="round"/><path d="M{x2} {y-11}A12 12 0 0 1 {x2+12} {y+1}" fill="none" stroke="{BONE}" stroke-opacity=".6" stroke-dasharray="3 2.5"/>'
          + T(x2 + 20, y, 'pintu', 14, FL, LBL, ls=0.6))
    x3 = 296
    s += (''.join(f'<path d="M{x3} {y-9+i*4}H{x3+22}" stroke="{BONE}" stroke-width="1.3" stroke-opacity="{a}"/>' for i, a in ((0, .9), (1, .6), (2, .9)))
          + T(x3 + 30, y, 'jendela', 14, FL, LBL, ls=0.6))
    return s

def title(t, y=512): return T(760, y, t, 16, FH, LBL, 'end', 0.3)

# ---------- Denah lantai ----------
def rooms_svg(fn, p):
    _, rooms = MAPS[fn]
    out = ''
    for k, r in rooms.items():
        if k: out += room(*r[:4], r[4], p, hatch=(k == 'taman_samping'))
    for r in rooms.get(None, []): out += room(*r[:4], r[4], p, label_fill=LBL)
    return out

def lantai1():
    p = 'hw1'; b = rooms_svg('denah_lantai1', p)
    b += ''.join(window(*w) for w in [(80, 40, 150, 40), (230, 40, 300, 40), (40, 120, 40, 170), (760, 64, 760, 116), (640, 40, 720, 40)])
    b += door(340, 228, 340, 254, -1, 0) + door(360, 228, 360, 254, 1, 0)      # ruang tamu <-> aula
    b += door(300, 260, 270, 260, 0, -1) + door(300, 300, 270, 300, 0, 1)      # ruang tamu <-> taman
    b += door(516, 160, 488, 160, 0, -1) + door(516, 180, 488, 180, 0, 1)      # pantry <-> aula
    b += door(598, 160, 570, 160, 0, -1) + door(598, 180, 570, 180, 0, 1)      # kamar graves <-> aula
    # Ruang Tamu
    b += furn(75, 105, 110, 44, 'meja tulis', 'desk') + furn(150, 175, 100, 55, 'sofa', 'sofa')
    b += f'<rect x="60" y="205" width="70" height="40" rx="2" fill="none" stroke="{DIM}" stroke-opacity=".45" stroke-dasharray="4 3"/>'
    # Pantry
    b += furn(418, 76, 98, 32, 'papan catatan', 'board') + furn(372, 118, 100, 30, 'konter')
    # Kamar Graves
    b += furn(558, 72, 76, 52, 'lemari', 'wardrobe') + furn(650, 86, 84, 60, 'ranjang', 'bed', ly=None)
    # Aula pesta
    b += ''.join(rtable(x, 244) for x in (450, 520, 590, 660)) + compass(728, 240)
    # Taman samping
    b += f'<path d="M285 335C270 370 235 395 205 424" fill="none" stroke="{BONE}" stroke-opacity=".28" stroke-width="9" stroke-dasharray="7 9"/>'
    b += ''.join(tree(x, y, r) for x, y, r in ((340, 385, 17), (455, 350, 14), (560, 425, 18), (690, 345, 15), (650, 450, 13), (410, 455, 12)))
    b += furn(129, 426, 110, 32, 'pintu samping', 'box')
    b += legend() + title('Mansion Hartwell: Lantai 1')
    return svg(b, p).replace('PID', p)

def lantai2():
    p = 'hw2'; b = rooms_svg('denah_lantai2', p)
    b += ''.join(window(*w) for w in [(290, 40, 360, 40), (40, 120, 40, 170), (470, 40, 540, 40), (620, 40, 690, 40), (760, 110, 760, 180),
                                       (40, 420, 40, 470), (760, 420, 760, 470), (100, 490, 170, 490), (500, 490, 570, 490)])
    b += door(336, 280, 300, 280, 0, -1) + door(336, 300, 300, 300, 0, 1)      # ruang kerja <-> koridor
    b += door(656, 280, 620, 280, 0, -1) + door(656, 300, 620, 300, 0, 1)      # kamar vivian <-> koridor
    b += door(280, 360, 250, 360, 0, -1) + door(280, 380, 250, 380, 0, 1)      # koridor <-> kamar tamu
    b += door(736, 360, 700, 360, 0, -1) + door(736, 380, 700, 380, 0, 1)      # koridor <-> tangga
    # Ruang Kerja Edmund: meja, kursi, jasad (garis kapur), laci, brankas
    b += furn(140, 118, 150, 58, 'meja kerja', 'desk')
    b += f'<rect x="181" y="178" width="26" height="24" rx="5" fill="{BONE}" fill-opacity=".07" stroke="{DIM}" stroke-width="1.4"/>'
    b += (f'<g fill="none" stroke="{WHITE}" stroke-opacity=".8" stroke-width="1.4" stroke-dasharray="4 3"><circle cx="194" cy="182" r="6"/>'
          f'<ellipse cx="194" cy="194" rx="15" ry="7"/><path d="M180 192L172 178M208 192L216 178"/></g>')
    b += T(224, 199, 'jasad', 14, FL, LBL, ls=0.3, halo=True)
    b += furn(132, 203, 74, 30, 'laci meja', 'cabinet') + furn(300, 92, 56, 42, 'brankas', 'safe')
    # Kamar Vivian
    b += furn(440, 190, 130, 80, 'ranjang', 'bed', ly=252)
    b += furn(585, 148, 120, 50, '', 'box') + f'<rect x="610" y="158" width="28" height="20" rx="2" fill="none" stroke="{DIM}" stroke-width="1.2"/>' + T(670, 178, 'meja rias', 14, FL, LBL, 'middle', 0.3, True)
    # Koridor, kamar tamu, tangga
    b += compass(520, 337, 15)
    b += furn(292, 404, 78, 76, 'ranjang', 'bed', ly=464)
    b += ''.join(f'<path d="M630 {y}H710" stroke="{DIM}" stroke-width="1.3"/>' for y in range(430, 482, 8)) + f'<rect x="630" y="424" width="80" height="58" fill="none" stroke="{DIM}" stroke-width="1.6"/>'
    b += legend() + title('Mansion Hartwell: Lantai 2')
    return svg(b, p).replace('PID', p)

# ---------- Peta kota ----------
def zebra_h(x): return ''.join(f'<rect x="{x}" y="{y}" width="12" height="3.5" fill="{BONE}" fill-opacity=".45"/>' for y in range(248, 274, 6))
def zebra_v(y): return ''.join(f'<rect x="{x}" y="{y}" width="3.5" height="12" fill="{BONE}" fill-opacity=".45"/>' for x in range(391, 411, 6))

def kota():
    p = 'hw3'; _, rooms = MAPS['peta_kota']
    b = ''
    for x, y, w, h in ((14, 14, 364, 221), (422, 14, 328, 221), (14, 285, 364, 205), (422, 285, 328, 205)):
        b += (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#101317" stroke="{BONE}" stroke-opacity=".4" stroke-width="1.5"/>'
              f'<rect x="{x+6}" y="{y+6}" width="{w-12}" height="{h-12}" fill="none" stroke="{BONE}" stroke-opacity=".15" stroke-dasharray="2 4"/>')
    b += f'<path d="M0 260H388M412 260H800M400 0V245M400 275V520" stroke="{BONE}" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="14 12"/>'
    b += zebra_h(362) + zebra_h(426) + zebra_v(222) + zebra_v(290)
    b += T(200, 265, 'JL. UTAMA', 14, FL, LBL, 'middle', 3, True, 'fill-opacity=".8"') + T(600, 265, 'JL. UTAMA', 14, FL, LBL, 'middle', 3, True, 'fill-opacity=".8"')
    b += T(0, 0, 'JL. DERMAGA', 14, FL, LBL, 'middle', 3, True, 'transform="translate(405 140) rotate(-90)" fill-opacity=".8"')
    b += T(0, 0, 'JL. DERMAGA', 14, FL, LBL, 'middle', 3, True, 'transform="translate(405 400) rotate(-90)" fill-opacity=".8"')
    for x, y, w, h in ((300, 60, 68, 70), (300, 150, 68, 70), (432, 60, 68, 70), (432, 150, 68, 70), (300, 300, 68, 70), (300, 390, 68, 70), (432, 300, 68, 70), (432, 390, 68, 70)):
        b += (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{FLOOR}" stroke="{BONE}" stroke-opacity=".5" stroke-width="3"/>'
              f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{p}-h)"/>')
    for k, r in rooms.items():
        if k: b += room(*r[:4], r[4], p)
    for r in rooms[None]: b += room(*r[:4], r[4], p, hatch=True, label_fill=LBL)
    b += ''.join(window(*w) for w in [(200, 60, 260, 60), (60, 110, 60, 170), (740, 90, 740, 150), (740, 340, 740, 400), (520, 340, 520, 400), (60, 340, 60, 420), (280, 340, 280, 420)])
    b += door(246, 220, 210, 220, 0, -1) + door(636, 220, 600, 220, 0, -1) + door(716, 460, 688, 460, 0, -1) + door(246, 460, 210, 460, 0, -1)
    b += furn(100, 112, 86, 40, 'arsip resep', 'cabinet') + furn(192, 92, 84, 34, 'laci kantor', 'desk')
    b += furn(585, 104, 90, 40, 'ruang arsip', 'cabinet') + f'<rect x="648" y="170" width="74" height="30" rx="3" fill="{BONE}" fill-opacity=".07" stroke="{DIM}" stroke-width="1.6"/>'
    b += furn(590, 362, 80, 36, 'meja kasir', 'desk') + furn(536, 420, 120, 32, 'panggung', 'stage') + rtable(700, 340, 12) + rtable(700, 404, 12)
    b += compass(774, 40, 14) + legend() + title('Peta Ravenport')
    return svg(b, p).replace('PID', p)

if __name__ == '__main__':
    check_rooms()
    for fn, gen in (('denah_lantai1', lantai1), ('denah_lantai2', lantai2), ('peta_kota', kota)):
        open(f'{OUT}/{fn}.svg', 'w', encoding='utf-8').write(gen())
        print('ok', fn)
