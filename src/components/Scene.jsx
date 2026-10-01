// Latar sinematik SVG hitam-putih untuk cutscene (dibuat kode, tanpa file gambar).
// Efek gerak memakai kelas .sc-* (lihat styles.css, bagian "Efek di dalam scene"); semuanya mati saat reduced-motion.
const rnd = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

const B = [[0, 70, 190], [70, 60, 260], [130, 80, 150], [210, 55, 300], [265, 90, 210], [355, 60, 330], [415, 75, 180], [490, 65, 270], [555, 85, 220], [640, 60, 310], [700, 100, 170], [790, 90, 230]];
const FAR = [[-50, 80, 150], [30, 70, 210], [100, 90, 170], [190, 60, 240], [250, 100, 190], [350, 70, 260], [420, 90, 200], [510, 60, 230], [570, 110, 175], [680, 70, 250], [750, 90, 190]];

function Fog({ y, w = 620, h = 80, dur = 32, d = 0, dir = 1, op = 0.8 }) {
  return <ellipse className="sc-fog" cx="400" cy={y} rx={w / 2} ry={h / 2} fill="url(#g-fog)" opacity={op}
    style={{ '--fx': `${dir * 80}px`, animationDuration: `${dur}s`, animationDelay: `-${d}s` }} />;
}
function Smoke({ x, y, n = 6, dur = 9 }) {
  return (<g transform={`translate(${x} ${y})`} fill="#c8c8c8">
    {Array.from({ length: n }, (_, i) => {
      const dx = (i % 2 ? 1 : -1) * (6 + rnd(i, 1) * 16);
      return <circle key={i} className="sc-smoke" r="5" opacity=".14"
        transform={`translate(${(dx * 0.6).toFixed(1)} ${-Math.round((i + 1) * (130 / n) * 0.8)}) scale(${(1 + i * 0.35).toFixed(2)})`}
        style={{ '--dx': `${dx.toFixed(1)}px`, animationDuration: `${dur}s`, animationDelay: `-${((i * dur) / n).toFixed(2)}s` }} />;
    })}
  </g>);
}
function Ember({ x, y }) {
  return (<>
    <circle className="sc-emberglow" cx={x} cy={y} r="9" fill="#c1121f" opacity=".28" />
    <circle className="sc-ember" cx={x} cy={y} r="3" fill="#e33" opacity=".9" />
  </>);
}
function Lamp({ bx, by }) {           // lampu meja + kerucut cahaya; kaki di (bx,by), permukaan meja y=by
  const sx = bx + 48, top = by - 166, bot = by - 132;
  return (<>
    <g className="lit"><polygon points={`${sx - 46},${bot} ${sx + 46},${bot} ${sx + 200},${by + 8} ${sx - 200},${by + 8}`} fill="url(#g-cone)" /></g>
    <ellipse cx={sx} cy={by + 4} rx="180" ry="11" fill="#fff" opacity=".1" />
    <ellipse cx={bx} cy={by} rx="34" ry="7" fill="#050505" stroke="#2a2a2a" />
    <path d={`M${bx} ${by - 4} L${bx + 4} ${by - 70} L${sx} ${top + 4}`} fill="none" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
    <polygon points={`${sx - 22},${top} ${sx + 22},${top} ${sx + 46},${bot} ${sx - 46},${bot}`} fill="#050505" stroke="#3a3a3a" />
    <ellipse cx={sx} cy={bot} rx="40" ry="4.5" fill="#fff" opacity=".85" />
  </>);
}
function Paper({ x, y, w, h, rot, lines = 4, tone = '#d4d4d4', stamp, seal }) {
  return (<g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
    <rect x={x} y={y} width={w} height={h} fill={tone} opacity=".92" />
    {Array.from({ length: lines }, (_, i) => <line key={i} x1={x + 8} y1={y + 12 + i * 11} x2={x + w - 8 - (i % 2) * 14} y2={y + 12 + i * 11} stroke="#555" strokeWidth="2" />)}
    {stamp && <rect x={x + w - 34} y={y + h - 26} width="26" height="16" fill="none" stroke="#c1121f" strokeWidth="2.5" opacity=".9" />}
    {seal && <circle cx={x + w / 2} cy={y + h - 10} r="8" fill="#c1121f" />}
  </g>);
}

function City({ dawn }) {
  return (<>
    <rect width="800" height="450" fill={`url(#${dawn ? 'sd' : 'sn'})`} />
    {dawn && <circle cx="600" cy="290" r="70" fill="#eee" opacity=".22" />}
    <g className="sc-par" style={{ '--px': '-10px' }}>
      {FAR.map(([x, w, h], i) => <rect key={i} x={x} y={450 - h - 40} width={w} height={h + 40} fill={dawn ? '#4a4a4a' : '#0e0e0e'} opacity={dawn ? 0.85 : 1} />)}
      {FAR.map(([x, w, h], i) => (i % 2 === 0) && <rect key={`w${i}`} x={x + w / 2 - 3} y={450 - h - 20} width="6" height="8" fill={dawn ? '#888' : '#9a9a9a'} opacity=".5" />)}
    </g>
    <Fog y={392} h={70} dur={38} d={6} dir={-1} op={dawn ? 0.9 : 0.55} />
    <g className="sc-par" style={{ '--px': '-24px' }}>
      {B.map(([x, w, h], i) => {
        const cols = Math.floor(w / 22), rows = Math.floor(h / 28);
        return (<g key={i}>
          <rect x={x} y={450 - h} width={w} height={h} fill="#080808" stroke="#222" />
          {Array.from({ length: cols * rows }, (_, k) => ((i * 7 + k * 13) % 5 < (dawn ? 1 : 2)) &&
            <rect key={k} className={(i * 3 + k) % 11 === 0 ? 'sc-win' : undefined} x={x + 8 + (k % cols) * 22} y={450 - h + 10 + Math.floor(k / cols) * 28} width="10" height="14" fill={dawn ? '#777' : '#ddd'} opacity=".85"
              style={(i * 3 + k) % 11 === 0 ? { animationDelay: `-${(k * 0.7).toFixed(1)}s` } : undefined} />)}
        </g>);
      })}
    </g>
    <Fog y={430} h={60} dur={26} d={3} dir={1} op={dawn ? 0.95 : 0.7} />
  </>);
}
function Mansion() {
  return (<>
    <rect width="800" height="450" fill="url(#sn)" /><circle cx="150" cy="90" r="34" fill="#ddd" opacity=".85" />
    <path d="M0 450 L0 350 Q400 300 800 350 L800 450Z" fill="#050505" />
    <rect x="230" y="200" width="340" height="170" fill="#080808" stroke="#2a2a2a" />
    <polygon points="210,200 400,110 590,200" fill="#050505" stroke="#2a2a2a" /><rect x="330" y="140" width="24" height="46" fill="#080808" />
    {[0, 1, 2, 3, 4].map((i) => [0, 1].map((j) => (
      <rect key={`${i}${j}`} x={252 + i * 62} y={222 + j * 68} width="26" height="40" fill={i === 2 && j === 0 ? '#eee' : '#141414'} className={i === 2 && j === 0 ? 'lit' : ''} />)))}
    {Array.from({ length: 30 }, (_, i) => <line key={i} x1={i * 28} y1="380" x2={i * 28} y2="430" stroke="#1c1c1c" strokeWidth="3" />)}
    <Fog y={372} w={760} h={64} dur={34} d={5} dir={1} op={0.55} />
    <Fog y={408} w={700} h={70} dur={28} d={11} dir={-1} op={0.75} />
    <Fog y={440} w={820} h={60} dur={40} d={2} dir={1} op={0.8} />
  </>);
}
function Blinds() {
  return (<>
    <rect width="800" height="450" fill="#040404" />
    {Array.from({ length: 9 }, (_, i) => <polygon key={i} points={`${-40 + i * 100},0 ${20 + i * 100},0 ${180 + i * 100},450 ${120 + i * 100},450`} fill="#ddd" opacity=".16" />)}
    <path d="M470 450 Q470 340 580 330 Q690 340 690 450Z" fill="#000" /><circle cx="580" cy="270" r="34" fill="#000" />
    <ellipse cx="580" cy="250" rx="70" ry="10" fill="#000" /><rect x="545" y="205" width="70" height="46" fill="#000" />
    <line x1="606" y1="291" x2="628" y2="290" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" />
    <Ember x={628} y={290} />
    <rect x="0" y="400" width="800" height="50" fill="#0b0b0b" />
    <Smoke x={628} y={286} n={6} dur={9} />
    {Array.from({ length: 11 }, (_, i) => {           // tetes air mengalir di kaca
      const x = 30 + i * 72 + rnd(i, 2) * 40, y = 10 + rnd(i, 3) * 170, len = 16 + rnd(i, 4) * 22;
      return (<g key={i} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)})`}>
        <g className="sc-drip-in" style={{ '--dy': `${Math.round(200 + rnd(i, 5) * 120)}px`, animationDuration: `${(6 + rnd(i, 6) * 5).toFixed(1)}s`, animationDelay: `-${(rnd(i, 7) * 9).toFixed(1)}s` }}>
          <line x1="0" y1={-len} x2="0" y2="0" stroke="#ddd" strokeWidth="1.2" opacity=".35" />
          <circle cx="0" cy="0" r="2.6" fill="#eee" opacity=".8" />
        </g>
      </g>);
    })}
  </>);
}
function Cuffs() {
  return (<>
    <rect width="800" height="450" fill="#040404" /><circle cx="400" cy="230" r="230" fill="url(#beam)" />
    {[330, 470].map((x) => <circle key={x} cx={x} cy="230" r="46" fill="none" stroke="#ddd" strokeWidth="9" />)}
    {[365, 400, 435].map((x) => <ellipse key={x} cx={x} cy="230" rx="15" ry="8" fill="none" stroke="#bbb" strokeWidth="4" />)}
    <rect x="308" y="180" width="44" height="18" fill="#bbb" /><rect x="448" y="180" width="44" height="18" fill="#bbb" />
    {Array.from({ length: 18 }, (_, i) => {           // debu di sinar
      const a = rnd(i, 8) * 6.283, r = 30 + rnd(i, 9) * 170;
      return <circle key={i} className="sc-dust" cx={(400 + Math.cos(a) * r).toFixed(0)} cy={(230 + Math.sin(a) * r * 0.85).toFixed(0)} r={(0.8 + rnd(i, 10) * 1.6).toFixed(1)} fill="#fff" opacity=".45"
        style={{ '--dx': `${Math.round((rnd(i, 11) - 0.4) * 50)}px`, '--dy': `${-Math.round(30 + rnd(i, 12) * 70)}px`, animationDuration: `${(9 + rnd(i, 13) * 8).toFixed(1)}s`, animationDelay: `-${(rnd(i, 14) * 14).toFixed(1)}s` }} />;
    })}
  </>);
}
function Phone() {
  const holes = Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 180) * (50 + i * 27); return [470 + Math.cos(a) * 17, 322 + Math.sin(a) * 17]; });
  return (<>
    <rect width="800" height="450" fill="url(#sn)" />
    <g opacity=".9"><rect x="610" y="70" width="130" height="190" fill="#141414" stroke="#2a2a2a" strokeWidth="4" />
      <line x1="675" y1="70" x2="675" y2="260" stroke="#2a2a2a" strokeWidth="4" /><line x1="610" y1="165" x2="740" y2="165" stroke="#2a2a2a" strokeWidth="4" /></g>
    <rect x="0" y="340" width="800" height="110" fill="#0a0a0a" /><line x1="0" y1="340" x2="800" y2="340" stroke="#2c2c2c" strokeWidth="2" />
    <Lamp bx={300} by={342} />
    <path d="M548 336 C600 340 590 392 660 384 S760 410 810 396" fill="none" stroke="#2e2e2e" strokeWidth="4" />
    <path d="M390 342 Q392 296 470 292 Q548 296 550 342Z" fill="#050505" stroke="#444" />
    <circle cx="470" cy="322" r="24" fill="#0b0b0b" stroke="#ccc" strokeWidth="2" />
    {holes.map(([x, y], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill="none" stroke="#999" strokeWidth="1.2" />)}
    <circle cx="470" cy="322" r="5" fill="#c1121f" />
    <rect x="438" y="278" width="6" height="16" fill="#2a2a2a" /><rect x="496" y="278" width="6" height="16" fill="#2a2a2a" />
    {[0, 1, 2].map((k) => [['L', 388 - k * 13, -1], ['R', 552 + k * 13, 1]].map(([s, x, d]) => (
      <path key={s + k} className="sc-ripple" d={`M${x} 250 Q${x + d * 14} 270 ${x} 290`} fill="none" stroke="#c1121f" strokeWidth="2.5" strokeLinecap="round" opacity={0.6 - k * 0.2}
        style={{ animationDelay: `${k * 0.3}s` }} />)))}
    <g className="sc-ring">
      <rect x="404" y="262" width="132" height="16" rx="8" fill="#050505" stroke="#bbb" strokeWidth="1.5" />
      <circle cx="404" cy="270" r="13" fill="#050505" stroke="#bbb" strokeWidth="1.5" /><circle cx="536" cy="270" r="13" fill="#050505" stroke="#bbb" strokeWidth="1.5" />
    </g>
  </>);
}
function Study() {
  const rows = [110, 170, 230, 290];
  return (<>
    <rect width="800" height="450" fill="url(#sn)" />
    <rect x="30" y="50" width="250" height="280" fill="#060606" stroke="#1e1e1e" />
    {rows.map((y, r) => (<g key={y}>
      <line x1="30" y1={y + 20} x2="280" y2={y + 20} stroke="#222" strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => { const h = 26 + rnd(i + r * 10, 15) * 26; return <rect key={i} x={38 + i * 24} y={y + 20 - h} width="19" height={h} fill="#0e0e0e" stroke="#222" />; })}
    </g>))}
    <rect x="360" y="70" width="110" height="130" fill="#0b0b0b" stroke="#3a3a3a" strokeWidth="4" />
    <circle cx="415" cy="120" r="19" fill="#040404" /><path d="M378 196 Q380 150 415 146 Q450 150 452 196Z" fill="#040404" />
    <rect x="620" y="90" width="120" height="160" fill="#171717" stroke="#2a2a2a" strokeWidth="4" /><line x1="680" y1="90" x2="680" y2="250" stroke="#2a2a2a" strokeWidth="4" />
    <path d="M530 335 L530 212 Q530 186 575 186 Q620 186 620 212 L620 335Z" fill="#030303" stroke="#2a2a2a" />
    <rect x="512" y="288" width="24" height="48" rx="8" fill="#030303" stroke="#2a2a2a" /><rect x="614" y="288" width="24" height="48" rx="8" fill="#030303" stroke="#2a2a2a" />
    <rect x="150" y="318" width="520" height="14" fill="#0a0a0a" stroke="#333" />
    <rect x="170" y="332" width="480" height="118" fill="#050505" stroke="#1c1c1c" />
    <rect x="200" y="350" width="180" height="62" fill="none" stroke="#1c1c1c" /><rect x="430" y="350" width="180" height="62" fill="none" stroke="#1c1c1c" />
    <Lamp bx={230} by={318} />
    <rect x="330" y="306" width="36" height="12" rx="3" fill="#ccc" opacity=".88" /><rect x="343" y="309" width="9" height="6" fill="#c1121f" />
    {[[302, 316], [312, 317.5], [322, 316]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.2" ry="1.8" fill="#eee" opacity=".85" />)}
    <path d="M404 318 L410 288 L438 288 L444 318Z" fill="#111" stroke="#ddd" strokeWidth="1.5" />
    <path d="M406.5 318 L410 302 L438 302 L441.5 318Z" fill="#999" opacity=".55" /><line x1="415" y1="292" x2="418" y2="312" stroke="#fff" strokeWidth="1.5" opacity=".5" />
    <path d="M466 318 Q460 300 470 288 L470 268 L482 268 L482 288 Q492 300 486 318Z" fill="#0d0d0d" stroke="#888" strokeWidth="1.3" /><rect x="472" y="258" width="8" height="10" rx="2" fill="#bbb" opacity=".8" />
  </>);
}
function Evidence() {
  return (<>
    <rect width="800" height="450" fill="url(#sn)" />
    <polygon points="40,250 760,250 800,450 0,450" fill="#0c0c0c" stroke="#2a2a2a" />
    <Paper x={150} y={330} w={72} h={56} rot={8} lines={3} />
    <Paper x={250} y={300} w={112} h={82} rot={-6} lines={5} stamp />
    <Paper x={430} y={330} w={96} h={70} rot={5} lines={4} seal />
    <g transform="rotate(-10 595 337)"><rect x="560" y="310" width="70" height="55" fill="#cfcfcf" opacity=".92" /><rect x="567" y="316" width="56" height="34" fill="#222" />
      <circle cx="595" cy="328" r="7" fill="#050505" /><path d="M581 350 Q583 337 595 336 Q607 337 609 350Z" fill="#050505" /></g>
    <rect x="380" y="292" width="36" height="14" rx="3" fill="#ccc" opacity=".9" /><rect x="393" y="295" width="9" height="8" fill="#c1121f" />
    {[[428, 300], [438, 303]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2" fill="#eee" opacity=".85" />)}
    <circle cx="690" cy="342" r="22" fill="none" stroke="#ddd" strokeWidth="4" /><line x1="706" y1="358" x2="736" y2="388" stroke="#ddd" strokeWidth="6" strokeLinecap="round" />
    <g className="sc-swing">
      <polygon points="382,128 418,128 690,420 110,420" fill="url(#g-cone)" opacity=".85" />
      <ellipse cx="400" cy="345" rx="270" ry="52" fill="#fff" opacity=".09" />
      <line x1="400" y1="0" x2="400" y2="92" stroke="#3a3a3a" strokeWidth="2.5" />
      <polygon points="378,92 422,92 462,130 338,130" fill="#050505" stroke="#444" />
      <ellipse cx="400" cy="130" rx="54" ry="5" fill="#fff" opacity=".9" />
    </g>
  </>);
}
function Confront() {
  return (<>
    <rect width="800" height="450" fill="url(#sn)" />
    {Array.from({ length: 5 }, (_, i) => <polygon key={i} points={`${-20 + i * 70},0 ${25 + i * 70},0 ${150 + i * 70},450 ${105 + i * 70},450`} fill="#ddd" opacity=".07" />)}
    <rect x="0" y="405" width="800" height="45" fill="#0b0b0b" /><ellipse cx="400" cy="420" rx="290" ry="14" fill="#fff" opacity=".08" />
    <g fill="#000" stroke="#2e2e2e" strokeWidth="1.5">
      <rect x="126" y="392" width="52" height="38" rx="4" />
      <path d="M150 450 L156 262 Q160 236 200 232 Q240 236 244 262 L250 450Z" /><circle cx="200" cy="205" r="24" />
      <path d="M296 450 L310 268 Q316 246 330 244 Q344 246 350 268 L364 450Z" /><ellipse cx="330" cy="220" rx="26" ry="30" /><circle cx="330" cy="222" r="21" />
      <path d="M540 450 L552 268 Q560 240 610 236 Q660 240 668 268 L682 450Z" /><circle cx="610" cy="208" r="22" />
      <ellipse cx="610" cy="190" rx="44" ry="8" /><path d="M584 190 Q586 160 610 160 Q634 160 636 190Z" />
    </g>
    <path d="M314 268 Q298 250 314 232" fill="none" stroke="#2e2e2e" strokeWidth="11" strokeLinecap="round" /><path d="M314 268 Q298 250 314 232" fill="none" stroke="#000" strokeWidth="8" strokeLinecap="round" />
    <path d="M572 282 Q520 292 486 296" fill="none" stroke="#2e2e2e" strokeWidth="16" strokeLinecap="round" /><path d="M572 282 Q520 292 486 296" fill="none" stroke="#000" strokeWidth="13" strokeLinecap="round" />
    <Paper x={434} y={268} w={52} h={62} rot={-8} lines={4} stamp />
    <rect x="584" y="182" width="52" height="6" fill="#c1121f" opacity=".85" />
    <line x1="626" y1="214" x2="642" y2="216" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" />
    <Ember x={643} y={216} /><Smoke x={643} y={212} n={5} dur={8} />
  </>);
}

export default function Scene({ kind }) {
  return (
    <svg className="scene" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" key={kind}>
      <defs>
        <linearGradient id="sn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#020202" /><stop offset="1" stopColor="#1d1d1d" /></linearGradient>
        <linearGradient id="sd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1a1a" /><stop offset="1" stopColor="#a8a8a8" /></linearGradient>
        <radialGradient id="beam"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id="g-fog"><stop offset="0" stopColor="#d8d8d8" stopOpacity=".22" /><stop offset="1" stopColor="#d8d8d8" stopOpacity="0" /></radialGradient>
        <linearGradient id="g-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset="1" stopColor="#fff" stopOpacity=".04" /></linearGradient>
      </defs>
      {kind === 'city' && <City />}{kind === 'dawn' && <City dawn />}{kind === 'mansion' && <Mansion />}
      {kind === 'blinds' && <Blinds />}{kind === 'cuffs' && <Cuffs />}
      {kind === 'phone' && <Phone />}{kind === 'study' && <Study />}{kind === 'evidence' && <Evidence />}{kind === 'confront' && <Confront />}
      {kind === 'black' && <rect width="800" height="450" fill="#000" />}
      {kind && kind !== 'black' && <rect className="sc-proj" width="800" height="450" fill="#fff" opacity="0" />}
    </svg>
  );
}
