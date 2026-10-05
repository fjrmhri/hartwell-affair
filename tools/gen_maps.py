"""Membuat ulang 3 SVG denah/peta v2. Jalankan: python3 tools/gen_maps.py
Hanya menulis public/assets/maps/*.svg. TIDAK menyentuh ikon bukti/potret dan TIDAK menulis kasus.json
(kasus.json hanya DIBACA untuk memastikan koordinat ruangan identik dengan persentase `ruang` di sana).
Font memakai variabel CSS (--ff-heading Playfair Display / --ff-label Oswald) dengan fallback;
MapView meng-inline SVG sehingga font web berlaku."""
import os, json, math, html, sys
OUT, CASE = 'public/assets/maps', 'src/kasus/hartwell/kasus.json'
os.makedirs(OUT, exist_ok=True)

W, H = 800, 520
BONE, WHITE, FLOOR, BG, RED = '#e8e4d8', '#f2f0e8', '#14171b', '#0b0d10', '#c1121f'
DIM, LBL = '#a9a596', '#d6d2c4'
FH = "font-family:var(--ff-heading,'Playfair Display',Georgia,serif);font-weight:700;"
FL = "font-family:var(--ff-label,'Oswald','Arial Narrow',sans-serif);font-weight:500;"

# ---------- STRUKTUR MAPS v2 (koordinat ruangan IDENTIK dengan persentase `ruang` di src/kasus/hartwell/kasus.json) ----------
MAPS = {
 'denah_lantai1': ('Mansion Hartwell: Lantai 1', {
    'kamar_graves': (40, 40, 160, 200, 'Kamar Graves'), 'pantry': (250, 40, 170, 200, 'Pantry'),
    'lobi': (480, 40, 280, 200, 'Lobi'), 'ruang_tamu': (40, 260, 560, 220, 'Ruang Tamu dan Aula'),
    'taman_samping': (620, 260, 140, 220, 'Taman'),
    None: [(200, 40, 50, 200, ''), (420, 40, 60, 200, '')]}),
 'denah_lantai2': ('Mansion Hartwell: Lantai 2', {
    'kamar_tamu_barat': (40, 40, 170, 200, 'Tamu Barat'), 'kamar_vivian': (210, 40, 210, 200, 'Kamar Vivian'),
    'kamar_tamu_timur': (480, 40, 280, 200, 'Tamu Timur'), 'ruang_kerja': (40, 290, 400, 190, 'Ruang Kerja Edmund'),
    None: [(420, 40, 60, 200, ''), (40, 240, 720, 50, 'Galeri Potret'), (440, 290, 320, 190, 'Kamar Edmund')]}),
 'peta_kota': ('Peta Ravenport', {
    'kantor_polisi': (40, 60, 220, 110, 'Kantor Polisi'), 'kamar_mayat': (40, 190, 220, 110, 'Kamar Mayat'),
    'klinik_lowell': (290, 60, 220, 80, 'Klinik Lowell'), 'arsip_herald': (290, 150, 220, 80, 'Arsip Herald'),
    'apotek_st_brigid': (290, 240, 220, 80, 'Apotek St. Brigid'), 'blue_note_club': (540, 60, 220, 160, 'Blue Note Club'),
    'reruntuhan_pengecoran': (290, 360, 220, 120, 'Pengecoran No. 2'),
    None: [(540, 360, 220, 120, 'Mansion Hartwell')]}),
}

def check_rooms():
    """Baca-saja: pastikan persentase room di case.json masih cocok dengan koordinat MAPS."""
    case = json.load(open(CASE, encoding='utf-8'))
    for fn, (_, rooms) in MAPS.items():
        for k, r in rooms.items():
            if not k: continue
            want = {'x': round(r[0]/8, 2), 'y': round(r[1]/5.2, 2), 'w': round(r[2]/8, 2), 'h': round(r[3]/5.2, 2)}
            got = case['lokasi'][k]['ruang']
            if any(abs(want[a] - got[a]) > 0.005 for a in want) or case['lokasi'][k]['peta'] != f'assets/maps/{fn}.svg':
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
    for r in rooms.get(None, []): out += room(*r[:4], r[4], p, hatch=(not r[4]), label_fill=LBL)
    return out

def tangga(x, y, w, h):
    return ''.join(f'<path d="M{x+6} {yy}H{x+w-6}" stroke="{DIM}" stroke-width="1.3"/>' for yy in range(y + 30, y + h - 10, 10)) + T(x + w / 2, y + 22, 'tangga', 14, FL, LBL, 'middle', 0.3, True)

def lantai1():
    p = 'hw1'; b = rooms_svg('denah_lantai1', p)
    b += ''.join(window(*w) for w in [(70, 40, 140, 40), (290, 40, 370, 40), (560, 40, 680, 40), (40, 320, 40, 420), (180, 480, 300, 480)])
    b += door(200, 140, 200, 170, 1, 0)                                         # kamar graves -> lorong servis
    b += door(250, 120, 250, 150, -1, 0)                                        # pantry -> lorong
    b += door(420, 120, 420, 150, 1, 0)                                         # pantry -> tangga servis
    b += door(480, 180, 480, 210, -1, 0)                                        # lobi -> tangga servis
    b += door(560, 240, 600, 240, 0, 1)                                         # lobi -> aula
    b += door(600, 360, 600, 395, 1, 0)                                         # aula -> taman (pintu samping)
    b += f'<path d="M225 60V230" stroke="{BONE}" stroke-opacity=".35" stroke-dasharray="3 5"/>' + T(225, 236, 'lorong servis', 14, FL, LBL, 'middle', 0.3, True)
    b += tangga(420, 40, 60, 200)
    b += furn(58, 70, 70, 50, 'lemari', 'wardrobe') + furn(110, 150, 76, 70, 'ranjang', 'bed', ly=205)
    b += furn(270, 64, 110, 30, 'papan catatan', 'board') + furn(268, 150, 130, 40, 'konter nampan')
    b += furn(640, 90, 100, 60, 'papan sentral', 'cabinet') + furn(500, 150, 100, 36, 'meja tamu')
    b += ''.join(rtable(x, 400) for x in (330, 400, 470, 540)) + furn(70, 300, 130, 44, 'meja Lowell', 'desk') + furn(220, 420, 90, 40, 'panggung', 'stage')
    b += ''.join(tree(x, y, r) for x, y, r in ((660, 300, 14), (720, 340, 13), (650, 450, 15))) + furn(668, 380, 52, 40, 'pot')
    b += compass(735, 470, 14) + legend() + title('Mansion Hartwell: Lantai 1')
    return svg(b, p).replace('PID', p)

def lantai2():
    p = 'hw2'; b = rooms_svg('denah_lantai2', p)
    b += ''.join(window(*w) for w in [(80, 40, 150, 40), (260, 40, 360, 40), (540, 40, 700, 40), (40, 340, 40, 430), (120, 480, 260, 480), (760, 330, 760, 430)])
    b += door(100, 240, 136, 240, 0, -1) + door(300, 240, 336, 240, 0, -1) + door(600, 240, 636, 240, 0, -1)
    b += door(480, 120, 480, 150, -1, 0)                                        # kamar timur -> tangga servis
    b += door(200, 290, 236, 290, 0, 1)                                         # galeri -> ruang kerja (dikunci dari dalam)
    b += f'<rect x="196" y="286" width="44" height="8" fill="{RED}" fill-opacity=".85"/>' + T(180, 345, 'pintu terkunci', 14, FL, LBL, ls=0.3, halo=True)
    b += tangga(420, 40, 60, 200)
    b += furn(60, 70, 76, 70, 'ranjang', 'bed', ly=125) + furn(140, 170, 56, 50, 'lemari', 'wardrobe')
    b += furn(240, 80, 90, 80, 'ranjang', 'bed', ly=145) + furn(340, 170, 70, 46, 'meja rias')
    b += furn(520, 80, 90, 80, 'ranjang', 'bed', ly=145) + furn(640, 80, 80, 40, 'koper') + furn(650, 170, 90, 44, 'keranjang')
    b += furn(150, 360, 160, 58, 'meja kerja', 'desk') + furn(360, 320, 56, 42, 'brankas', 'safe') + furn(70, 420, 74, 34, 'laci', 'cabinet')
    b += (f'<g fill="none" stroke="{WHITE}" stroke-opacity=".8" stroke-width="1.4" stroke-dasharray="4 3"><circle cx="230" cy="432" r="6"/>'
          f'<ellipse cx="230" cy="444" rx="15" ry="7"/></g>') + T(254, 448, 'jasad', 14, FL, LBL, ls=0.3, halo=True)
    b += furn(520, 330, 120, 90, 'ranjang', 'bed', ly=400) + compass(735, 470, 14) + legend() + title('Mansion Hartwell: Lantai 2')
    return svg(b, p).replace('PID', p)

def kota():
    p = 'hw3'; _, rooms = MAPS['peta_kota']
    b = ''
    for x, y, w, h, nama, merah in ((26, 34, 248, 280, 'BALAI KOTA', False), (276, 34, 248, 300, 'PUSAT KOTA', False),
                                    (526, 34, 248, 200, 'DERMAGA', False), (276, 340, 248, 150, 'DISTRIK SELATAN', True), (526, 340, 248, 150, 'BUKIT UTARA', False)):
        st = RED if merah else BONE
        b += (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#101317" stroke="{st}" stroke-opacity="{.9 if merah else .4}" stroke-width="{2.5 if merah else 1.5}"/>'
              + T(x + 10, y + 18, nama, 12, FL, RED if merah else LBL, 'start', 2, True, 'fill-opacity=".85"'))
    b += f'<path d="M650 360V250H400V340M650 250H150V320M650 250V234" stroke="{BONE}" stroke-opacity=".45" stroke-width="2" stroke-dasharray="12 9" fill="none"/>'
    for k, r in rooms.items():
        if k: b += room(*r[:4], r[4], p, hatch=(k == 'reruntuhan_pengecoran'))
    for r in rooms[None]: b += room(*r[:4], r[4], p, hatch=True, label_fill=LBL)
    b += furn(150, 110, 90, 40, 'meja Doyle', 'desk') + furn(150, 236, 90, 44, 'meja otopsi')
    b += furn(400, 92, 96, 34, 'lemari resep', 'cabinet') + furn(400, 182, 96, 34, 'mikrofilm', 'cabinet') + furn(400, 272, 96, 34, 'register', 'desk')
    b += furn(560, 110, 80, 36, 'meja parkir', 'desk') + furn(650, 150, 96, 50, 'ruang ganti') + rtable(590, 190, 12)
    b += furn(310, 400, 70, 34, 'plakat') + furn(400, 430, 96, 34, 'loker regu', 'cabinet')
    b += compass(505, 496, 12) + legend() + title('Peta Ravenport')
    return svg(b, p).replace('PID', p)

if __name__ == '__main__':
    check_rooms()
    for fn, gen in (('denah_lantai1', lantai1), ('denah_lantai2', lantai2), ('peta_kota', kota)):
        open(f'{OUT}/{fn}.svg', 'w', encoding='utf-8').write(gen())
        print('ok', fn)
