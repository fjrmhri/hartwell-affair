import { useEffect, useRef, useState } from 'react';
import { useGame } from './store';
import { usePrefs } from './prefs';
import audio from './audio';
import C from './data/case.json';
import MapView from './components/MapView';
import Dialogue from './components/Dialogue';
import Notebook from './components/Notebook';
import Board from './components/Board';
import Evidence from './components/Evidence';
import DocViewer from './components/DocViewer';
import Effects from './components/Effects';
import Cutscene from './components/Cutscene';
import EndScreen from './components/EndScreen';
import ConfirmDialog from './components/ConfirmDialog';
import STORY from './data/story.json';
import {
  IconSoundOn, IconSoundOff, IconRain, IconSun, IconHint, IconPause, IconMap, IconDialog, IconEvidence,
  IconNotebook, IconBoard, IconMagnify, IconAlert, IconTimer, IconClose,
} from './components/Icons';

const TABS = { Peta: MapView, Dialog: Dialogue, Bukti: Evidence, Catatan: Notebook, Papan: Board };
const fmt = (x) => { const t = Math.max(0, Math.ceil(x)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

function Controls({ labeled = false }) {
  const { sound, fx, toggleSound, toggleFx } = usePrefs();
  if (labeled) return (<>
    <button type="button" className="ctrl-icon ctrl-icon--labeled" aria-pressed={sound} onClick={toggleSound}>
      {sound ? <IconSoundOn /> : <IconSoundOff />}<span>Suara</span><span className="ctrl-state" aria-hidden="true">{sound ? 'nyala' : 'mati'}</span>
    </button>
    <button type="button" className="ctrl-icon ctrl-icon--labeled" aria-pressed={fx} onClick={toggleFx}>
      {fx ? <IconRain /> : <IconSun />}<span>Efek visual</span><span className="ctrl-state" aria-hidden="true">{fx ? 'nyala' : 'mati'}</span>
    </button>
  </>);
  return (<>
    <button className="ctrl-icon" title={sound ? 'Matikan suara' : 'Nyalakan suara'} aria-label={sound ? 'Matikan suara' : 'Nyalakan suara'} onClick={toggleSound}>{sound ? <IconSoundOn /> : <IconSoundOff />}</button>
    <button className="ctrl-icon" title={fx ? 'Matikan efek visual' : 'Nyalakan efek visual'} aria-label={fx ? 'Matikan efek visual' : 'Nyalakan efek visual'} onClick={toggleFx}>{fx ? <IconRain /> : <IconSun />}</button>
  </>);
}

const LEVEL_LABEL = { easy: 'Mudah', normal: 'Normal', hard: 'Sulit' };
const mult = (x) => `×${x.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;

function Menu({ status, timeLeft, go, begin, resume }) {
  const paused = status === 'paused';
  const [diff, setDiff] = useState(C.config.defaultDifficulty);
  const [confirmNew, setConfirmNew] = useState(false);
  const startNew = () => go(() => begin(diff));

  // Enter memulai (menu) atau melanjutkan (jeda); diabaikan bila fokus di tombol/dialog agar tidak ganda
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.repeat || confirmNew) return;
      if (e.target.closest?.('button, a, [role="alertdialog"]')) return;
      e.preventDefault();
      if (paused) go(resume); else startNew();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main className="menu">
      <div className="menu-inner">
        <h1 className="menu-title">{C.meta.title}</h1>
        <p className="menu-setting">{C.meta.setting}</p>
        {paused && <button type="button" className="btn btn--primary menu-cta" onClick={() => go(resume)}>Lanjutkan ({fmt(timeLeft)} tersisa)</button>}
        <section className="dossier" aria-label="Briefing kasus">
          <span className="dossier-tab" aria-hidden="true">Berkas Kasus</span>
          <p className="dossier-text">{C.meta.briefing}</p>
        </section>
        <p className="menu-label" id="levels-label">{paused ? 'Tingkat kesulitan untuk kasus baru' : 'Pilih tingkat kesulitan'}</p>
        <div className="levels" role="radiogroup" aria-labelledby="levels-label">
          {Object.keys(C.config.difficulty).map((k) => {
            const d = C.config.difficulty[k];
            return (
              <label key={k} className="lvl">
                <input type="radio" name="difficulty" className="lvl-input" value={k} checked={diff === k} onChange={() => setDiff(k)} />
                <span className="lvl-card">
                  <span className="lvl-head"><span className="lvl-name">{LEVEL_LABEL[k] || k}</span><span className="lvl-mark" aria-hidden="true" /></span>
                  <span className="lvl-stat"><span className="lvl-k">Waktu</span><span className="lvl-v">{d.timerMinutes} menit</span></span>
                  <span className="lvl-stat"><span className="lvl-k">Petunjuk</span><span className="lvl-v">−{d.hintCostMinutes} menit</span></span>
                  <span className="lvl-stat"><span className="lvl-k">Deduksi wajib</span><span className="lvl-v">{d.deductionsRequired}</span></span>
                  <span className="lvl-stat"><span className="lvl-k">Pengali skor</span><span className="lvl-v">{mult(d.scoreMultiplier)}</span></span>
                </span>
              </label>
            );
          })}
        </div>
        {paused
          ? <button type="button" className="btn btn--secondary menu-alt" onClick={() => setConfirmNew(true)}>Mulai baru</button>
          : <button type="button" className="btn btn--primary menu-cta" onClick={startNew}>Mulai penyelidikan</button>}
        <div className="menu-controls"><Controls labeled /></div>
      </div>
      <ConfirmDialog
        open={confirmNew}
        title="Mulai penyelidikan baru?"
        body={`Kasus baru dimulai pada tingkat ${LEVEL_LABEL[diff] || diff}. Progres yang sedang berjalan (sisa ${fmt(timeLeft)}) akan tertimpa dan tidak dapat dikembalikan.`}
        confirmLabel="Mulai baru"
        cancelLabel="Batal"
        danger
        onConfirm={() => { setConfirmNew(false); startNew(); }}
        onCancel={() => setConfirmNew(false)}
      />
    </main>
  );
}

const TAB_ICON = { Peta: IconMap, Dialog: IconDialog, Bukti: IconEvidence, Catatan: IconNotebook, Papan: IconBoard };
const TAB_IDS = Object.keys(TABS);
const pad2 = (n) => String(n).padStart(2, '0');

// Jenis toast dideteksi dari awalan pesan (teks pesan dihasilkan store.js)
const toastKind = (m) => {
  if (m.startsWith('Bukti')) return 'bukti';
  if (m.startsWith('Deduksi')) return 'deduksi';
  if (m.startsWith('Petunjuk')) return 'petunjuk';
  if (m.startsWith('Waktu')) return 'waktu';
  if (/^(Tidak ada hubungan|Belum cukup|Tuduhan salah)/.test(m)) return 'salah';
  return 'info';
};
const TOAST_ICON = { bukti: IconMagnify, deduksi: IconBoard, petunjuk: IconHint, salah: IconAlert, waktu: IconTimer, info: IconDialog };

// Durasi toast (ms). Ubah di sini: default = semua pesan; petunjuk = pesan berawalan "Petunjuk" (teks panjang)
const TOAST_MS = { default: 2000, petunjuk: 9000 };
const toastMs = (m) => (m.startsWith('Petunjuk') ? TOAST_MS.petunjuk : TOAST_MS.default);

function Toast() {
  const msg = useGame((s) => s.msg);
  const docTerbuka = useGame((s) => s.doc) != null;
  useEffect(() => {
    if (!msg) return;
    // Hanya hapus bila pesan yang tampil masih pesan ini (pesan baru tidak ikut terhapus)
    const id = setTimeout(() => useGame.setState((st) => (st.msg === msg ? { msg: '' } : st)), toastMs(msg));
    return () => clearTimeout(id);
  }, [msg]);
  const kind = msg ? toastKind(msg) : 'info';
  const Ico = TOAST_ICON[kind];
  return (
    <div className={`toast-region${docTerbuka ? ' toast-region--docked' : ''}`} role="status" aria-live="polite">
      {msg && (
        <div className={`toast toast--${kind}`} key={msg} style={{ '--toast-ms': `${toastMs(msg)}ms` }}>
          <Ico className="toast-ico" />
          <span className="toast-text">{msg}</span>
          <button type="button" className="ctrl-icon toast-close" aria-label="Tutup pemberitahuan" onClick={() => useGame.setState({ msg: '' })}><IconClose /></button>
        </div>
      )}
    </div>
  );
}

function TimerPlaque() {
  const timeLeft = useGame((s) => s.timeLeft);
  const diff = useGame((s) => s.diff);
  const total = C.config.difficulty[diff].timerMinutes * 60;
  const pct = Math.max(0, Math.min(100, (timeLeft / total) * 100));
  const state = timeLeft < 300 ? 'danger' : timeLeft < 600 ? 'warn' : 'ok';
  const prev = useRef(timeLeft);
  const [float, setFloat] = useState(null);
  useEffect(() => {
    const drop = Math.round(prev.current - timeLeft);
    prev.current = timeLeft;
    if (drop >= 30) setFloat({ id: Date.now(), text: `\u2212${Math.floor(drop / 60)}:${pad2(drop % 60)}` });
  }, [timeLeft]);
  useEffect(() => {
    if (!float) return;
    const id = setTimeout(() => setFloat(null), 2400);
    return () => clearTimeout(id);
  }, [float]);
  return (
    <div className={`plaque plaque--${state}`} role="timer" aria-label={`Sisa waktu ${fmt(timeLeft)}`}>
      <span className="plaque-time">{fmt(timeLeft)}</span>
      <span className="plaque-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
      {float && <span className="plaque-float" key={float.id} aria-hidden="true">{float.text}</span>}
    </div>
  );
}

function Playing({ tab, setTab, seen, setSeen }) {
  const diff = useGame((s) => s.diff);
  const hint = useGame((s) => s.hint);
  const hintsUsed = useGame((s) => s.hintsUsed.length);
  const nEv = useGame((s) => s.evidence.length);
  const nNote = useGame((s) => s.notebook.length);
  const nDed = useGame((s) => s.confirmed.length);
  const [askHint, setAskHint] = useState(false);
  const cfg = C.config.difficulty[diff];

  // Pesan lama tidak boleh muncul lagi saat kembali dari jeda
  useEffect(() => () => useGame.setState({ msg: '' }), []);

  const counts = { Bukti: nEv, Catatan: nNote, Papan: nDed };
  const badge = { Bukti: `${nEv}/${C.evidence.length}`, Catatan: `${nNote}`, Papan: `${nDed}/${cfg.deductionsRequired}` };

  // Titik "baru": isi bertambah sejak tab terakhir dibuka. Tab aktif selalu dianggap sudah dilihat;
  // bila hitungan turun (kasus baru) penanda ikut diturunkan.
  useEffect(() => {
    setSeen((p) => {
      let n = p;
      for (const t of Object.keys(counts)) {
        const v = t === tab ? counts[t] : Math.min(p[t], counts[t]);
        if (v !== p[t]) { if (n === p) n = { ...p }; n[t] = v; }
      }
      return n;
    });
  }, [tab, nEv, nNote, nDed]);

  const onTabKey = (e) => {
    const i = TAB_IDS.indexOf(tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TAB_IDS[(i + 1) % TAB_IDS.length];
    else if (e.key === 'ArrowLeft') next = TAB_IDS[(i - 1 + TAB_IDS.length) % TAB_IDS.length];
    else if (e.key === 'Home') next = TAB_IDS[0];
    else if (e.key === 'End') next = TAB_IDS[TAB_IDS.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  const Tab = TABS[tab];
  return (
    <div className={`app app--${tab.toLowerCase()}`}>
      <header className="hud">
        <strong className="hud-title">{C.meta.title}</strong>
        <TimerPlaque />
        <div className="hud-right">
          <div className="hud-actions">
            <button type="button" className="btn btn--secondary hud-btn" title={`Gunakan petunjuk; ${hintsUsed} terpakai`} aria-label={`Petunjuk, biaya ${cfg.hintCostMinutes} menit; ${hintsUsed} terpakai`} onClick={() => setAskHint(true)}>
              <IconHint /><span>Petunjuk (&minus;{cfg.hintCostMinutes}m)</span><span className="hud-used" aria-hidden="true">{hintsUsed}</span>
            </button>
            <button type="button" className="btn btn--secondary hud-btn" onClick={() => useGame.setState({ status: 'paused' })}>
              <IconPause /><span>Jeda</span>
            </button>
          </div>
          <div className="hud-ctrls"><Controls /></div>
        </div>
      </header>
      <nav className="tabbar" aria-label="Bagian permainan">
        <div className="tabs" role="tablist" onKeyDown={onTabKey}>
          {TAB_IDS.map((t) => {
            const Ico = TAB_ICON[t];
            const active = t === tab;
            const fresh = !active && counts[t] !== undefined && counts[t] > seen[t];
            return (
              <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={active} aria-controls="tabpanel"
                tabIndex={active ? 0 : -1} className={active ? 'tab tab--on' : 'tab'} onClick={() => setTab(t)}>
                <span className="tab-ico"><Ico />{fresh && <span className="tab-dot" aria-hidden="true" />}</span>
                <span className="tab-label">{t}</span>
                {badge[t] !== undefined && <span className="tab-badge">{badge[t]}</span>}
                {fresh && <span className="sr-only">, ada isi baru</span>}
              </button>
            );
          })}
        </div>
      </nav>
      <Toast />
      <section className={`tabview tabview--${tab.toLowerCase()}`} id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} key={tab}><Tab /></section>
      <DocViewer />
      <ConfirmDialog
        open={askHint}
        title="Gunakan petunjuk?"
        body={`Biaya \u2212${cfg.hintCostMinutes} menit dari sisa waktu. Petunjuk yang sudah dipakai: ${hintsUsed}.`}
        confirmLabel={`Gunakan (\u2212${cfg.hintCostMinutes} menit)`}
        cancelLabel="Batal"
        onConfirm={() => { setAskHint(false); hint(); }}
        onCancel={() => setAskHint(false)}
      />
    </div>
  );
}

export default function App() {
  const { status, timeLeft, begin, finishIntro, finishEnding, resume, tick } = useGame();
  const sound = usePrefs((p) => p.sound);
  const [tab, setTab] = useState('Peta');
  const [seen, setSeen] = useState(() => { const g = useGame.getState(); return { Bukti: g.evidence.length, Catatan: g.notebook.length, Papan: g.confirmed.length }; });
  useEffect(() => {
    const id = setInterval(tick, 1000); // timer berhenti otomatis bila status bukan 'playing'
    return () => clearInterval(id);
  }, [tick]);
  useEffect(() => { audio.setMuted(!sound); }, [sound]);
  const go = (fn) => { audio.start(); audio.setMuted(!sound); fn(); }; // audio hanya boleh mulai setelah klik pemain

  let screen;
  if (status === 'menu' || status === 'paused') screen = <Menu status={status} timeLeft={timeLeft} go={go} begin={begin} resume={resume} />;
  else if (status === 'intro') screen = <Cutscene slides={STORY.intro} onDone={finishIntro} />;
  else if (status === 'ending') screen = <Cutscene slides={STORY.ending} onDone={finishEnding} />;
  else if (status !== 'playing') screen = <EndScreen />;
  else screen = <Playing tab={tab} setTab={setTab} seen={seen} setSeen={setSeen} />;
  return (<><Effects />{screen}</>);
}
