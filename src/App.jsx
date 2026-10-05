import { useEffect, useRef, useState } from 'react';
import { useGame, P, migrasiSaveLama } from './store';
import { usePrefs } from './prefs';
import { cekSyarat } from './engine/kondisi';
import { petunjukBerikut, biayaPetunjuk } from './engine/aksi';
import audio from './audio';
import MapView from './components/MapView';
import Dialogue from './components/Dialogue';
import Notebook from './components/Notebook';
import Board from './components/Board';
import Evidence from './components/Evidence';
import Analisis from './components/Analisis';
import DocViewer from './components/DocViewer';
import Effects from './components/Effects';
import Cutscene from './components/Cutscene';
import EndScreen from './components/EndScreen';
import Tuduhan from './components/Tuduhan';
import ConfirmDialog from './components/ConfirmDialog';
import {
  IconSoundOn, IconSoundOff, IconRain, IconSun, IconHint, IconPause, IconMap, IconDialog, IconEvidence,
  IconNotebook, IconBoard, IconMagnify, IconAlert, IconTimer, IconClose,
} from './components/Icons';

const K = P.kasus;
const TABS = { Peta: MapView, Dialog: Dialogue, Bukti: Evidence, Analisis, Catatan: Notebook, Papan: Board };
const fmt = (x) => { const t = Math.max(0, Math.ceil(x)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// Slide bersyarat (varian epilog, rekonstruksi C7) disaring dengan state saat ini
export const saringSlide = (slides, s) => slides.filter((sl) => cekSyarat(sl.syarat, s, P));

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
  const [diff, setDiff] = useState(K.config.kesulitanDefault);
  const [confirmNew, setConfirmNew] = useState(false);
  const [saveLama] = useState(() => migrasiSaveLama());
  const startNew = () => go(() => begin(diff));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.repeat || confirmNew) return;
      if (e.target.closest?.('button, a, input, [role="alertdialog"]')) return;
      e.preventDefault();
      if (paused) go(resume); else startNew();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main className="menu">
      <div className="menu-inner">
        <h1 className="menu-title">{K.meta.judul}</h1>
        <p className="menu-setting">{K.meta.latar}</p>
        {saveLama && <p className="menu-notice" role="status">Kasus telah diperbarui ke versi 2 dengan cerita baru. Progres lama tidak bisa dilanjutkan; silakan mulai penyelidikan baru.</p>}
        {paused && <button type="button" className="btn btn--primary menu-cta" onClick={() => go(resume)}>Lanjutkan ({fmt(timeLeft)} tersisa)</button>}
        <section className="dossier" aria-label="Briefing kasus">
          <span className="dossier-tab" aria-hidden="true">Berkas Kasus</span>
          <p className="dossier-text">{K.meta.briefing}</p>
        </section>
        <p className="menu-label" id="levels-label">{paused ? 'Tingkat kesulitan untuk kasus baru' : 'Pilih tingkat kesulitan'}</p>
        <div className="levels" role="radiogroup" aria-labelledby="levels-label">
          {Object.keys(K.config.kesulitan).map((k) => {
            const d = K.config.kesulitan[k];
            return (
              <label key={k} className="lvl">
                <input type="radio" name="difficulty" className="lvl-input" value={k} checked={diff === k} onChange={() => setDiff(k)} />
                <span className="lvl-card">
                  <span className="lvl-head"><span className="lvl-name">{LEVEL_LABEL[k] || k}</span><span className="lvl-mark" aria-hidden="true" /></span>
                  <span className="lvl-stat"><span className="lvl-k">Waktu</span><span className="lvl-v">{d.timerMenit} menit</span></span>
                  <span className="lvl-stat"><span className="lvl-k">Petunjuk</span><span className="lvl-v">−{d.biayaPetunjukMenit} menit</span></span>
                  <span className="lvl-stat"><span className="lvl-k">Deduksi wajib</span><span className="lvl-v">{d.deduksiWajib}</span></span>
                  <span className="lvl-stat"><span className="lvl-k">Pengali skor</span><span className="lvl-v">{mult(d.pengaliSkor)}</span></span>
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

const TAB_ICON = { Peta: IconMap, Dialog: IconDialog, Bukti: IconEvidence, Analisis: IconMagnify, Catatan: IconNotebook, Papan: IconBoard };
const TAB_IDS = Object.keys(TABS);
const pad2 = (n) => String(n).padStart(2, '0');

// Jenis toast datang dari store (msgJenis), bukan ditebak dari teks
const TOAST_ICON = { bukti: IconMagnify, deduksi: IconBoard, petunjuk: IconHint, salah: IconAlert, waktu: IconTimer, info: IconDialog };
const TOAST_MS = { default: 2400, petunjuk: 9000 };

function Toast() {
  const msg = useGame((s) => s.msg);
  const kind = useGame((s) => s.msgJenis) || 'info';
  const docTerbuka = useGame((s) => s.doc) != null;
  const ms = kind === 'petunjuk' ? TOAST_MS.petunjuk : TOAST_MS.default;
  useEffect(() => {
    if (!msg) return undefined;
    const id = setTimeout(() => useGame.setState((st) => (st.msg === msg ? { msg: '' } : st)), ms);
    return () => clearTimeout(id);
  }, [msg, ms]);
  const Ico = TOAST_ICON[kind] || IconDialog;
  return (
    <div className={`toast-region${docTerbuka ? ' toast-region--docked' : ''}`} role="status" aria-live="polite">
      {msg && (
        <div className={`toast toast--${kind}`} key={msg} style={{ '--toast-ms': `${ms}ms` }}>
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
  const total = K.config.kesulitan[diff].timerMenit * 60;
  const pct = Math.max(0, Math.min(100, (timeLeft / total) * 100));
  const state = pct < 10 ? 'danger' : pct < 25 ? 'warn' : 'ok';
  const prev = useRef(timeLeft);
  const [float, setFloat] = useState(null);
  useEffect(() => {
    const drop = Math.round(prev.current - timeLeft);
    prev.current = timeLeft;
    if (drop >= 30) setFloat({ id: Date.now(), text: `−${Math.floor(drop / 60)}:${pad2(drop % 60)}` });
  }, [timeLeft]);
  useEffect(() => {
    if (!float) return undefined;
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
  const s = useGame();
  const hint = useGame((x) => x.hint);
  const [askHint, setAskHint] = useState(false);
  const cfg = K.config.kesulitan[s.diff];
  const nEv = s.bukti.length + s.kartu.length, nNote = s.catatan.length, nDed = s.deduksi.length;
  const nAnalisis = P.tekaTeki.filter((t) => !s.tekaTeki.includes(t.id) && cekSyarat(t.syarat, s, P)).length;
  const berikut = petunjukBerikut(s, P);
  const biaya = berikut ? biayaPetunjuk(berikut, s, P) : 0;

  useEffect(() => () => useGame.setState({ msg: '' }), []);

  const counts = { Bukti: nEv, Catatan: nNote, Papan: nDed, Analisis: s.tekaTeki.length + nAnalisis };
  const badge = { Bukti: `${s.bukti.length}/${K.bukti.length}`, Catatan: `${nNote}`, Papan: `${nDed}/${cfg.deduksiWajib}`, Analisis: nAnalisis ? `${nAnalisis}` : undefined };

  useEffect(() => {
    setSeen((p) => {
      let n = p;
      for (const t of Object.keys(counts)) {
        const v = t === tab ? counts[t] : Math.min(p[t] ?? 0, counts[t]);
        if (v !== p[t]) { if (n === p) n = { ...p }; n[t] = v; }
      }
      return n;
    });
  }, [tab, nEv, nNote, nDed, counts.Analisis]);

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
        <strong className="hud-title">{K.meta.judul}</strong>
        <TimerPlaque />
        <div className="hud-right">
          <div className="hud-actions">
            <button type="button" className="btn btn--secondary hud-btn" title={`Gunakan petunjuk; ${s.petunjuk.length} terpakai`}
              aria-label={berikut ? `Petunjuk tingkat ${berikut.tingkat}, biaya ${biaya} menit; ${s.petunjuk.length} terpakai` : 'Petunjuk: tidak ada petunjuk baru'} onClick={() => setAskHint(true)}>
              <IconHint /><span>Petunjuk {berikut ? <>(&minus;{biaya}m)</> : ''}</span><span className="hud-used" aria-hidden="true">{s.petunjuk.length}</span>
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
            const fresh = !active && counts[t] !== undefined && counts[t] > (seen[t] ?? 0);
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
        body={berikut
          ? `Petunjuk tingkat ${berikut.tingkat} memakan −${biaya} menit dan mengurangi skor. Petunjuk yang sudah dipakai: ${s.petunjuk.length}.`
          : 'Tidak ada petunjuk baru yang relevan saat ini. Tidak ada biaya.'}
        confirmLabel={berikut ? `Gunakan (−${biaya} menit)` : 'Mengerti'}
        cancelLabel="Batal"
        onConfirm={() => { setAskHint(false); hint(); }}
        onCancel={() => setAskHint(false)}
      />
    </div>
  );
}

export default function App() {
  const s = useGame();
  const { status, timeLeft, begin, finishIntro, finishEnding, resume, tick, selesaiCutscene } = s;
  const sound = usePrefs((p) => p.sound);
  const [tab, setTab] = useState('Peta');
  const [seen, setSeen] = useState(() => { const g = useGame.getState(); return { Bukti: g.bukti.length + g.kartu.length, Catatan: g.catatan.length, Papan: g.deduksi.length, Analisis: g.tekaTeki.length }; });
  useEffect(() => {
    const id = setInterval(tick, 1000); // timer berhenti sendiri bila bukan 'playing', dokumen terbuka, atau cutscene
    return () => clearInterval(id);
  }, [tick]);
  useEffect(() => { audio.setMuted(!sound); }, [sound]);
  const go = (fn) => { audio.start(); audio.setMuted(!sound); fn(); }; // audio hanya boleh mulai setelah klik pemain

  const cutId = status === 'playing' ? s.antreanCutscene[0] : null;
  let screen;
  if (status === 'menu' || status === 'paused') screen = <Menu status={status} timeLeft={timeLeft} go={go} begin={begin} resume={resume} />;
  else if (status === 'intro') screen = <Cutscene slides={P.cerita.intro} slate={K.meta.latar} onDone={finishIntro} />;
  else if (status === 'ending') {
    const e = P.cerita.ending[s.hasil?.ending] || P.cerita.ending.tuduhan_salah;
    screen = <Cutscene key={s.hasil?.ending} slides={saringSlide(e.slides, s)} onDone={finishEnding} />;
  } else if (status !== 'playing') screen = <EndScreen />;
  else {
    screen = (<>
      <Playing tab={tab} setTab={setTab} seen={seen} setSeen={setSeen} />
      {cutId && <div className="cut-overlay"><Cutscene key={cutId} slides={saringSlide(P.cerita.cutscene[cutId], s)} onDone={selesaiCutscene} /></div>}
      {!cutId && s.flags.tuduhanTerbuka && <Tuduhan />}
    </>);
  }
  return (<><Effects />{screen}</>);
}
