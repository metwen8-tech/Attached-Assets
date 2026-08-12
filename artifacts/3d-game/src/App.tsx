/// <reference types="@react-three/fiber" />
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KeyboardControls, useKeyboardControls, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Bot, BrainCircuit, Check, ChevronRight, Command, Cpu, FolderOpen,
  Gauge, HardDrive, Headphones, Layers3, Maximize, MemoryStick, Mic, Network,
  Power, Radar, ScanLine, Search, Send, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Terminal as TerminalIcon, X, Zap,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        [elementName: string]: any;
      }
    }
  }
}

const queryClient = new QueryClient();

type PanelKey = 'home' | 'system' | 'files' | 'terminal' | 'agents' | 'memory' | 'network' | 'settings';
type Notice = { id: number; text: string; detail?: string };
type Control = 'forward' | 'back' | 'left' | 'right';

const navItems: { key: PanelKey; label: string; icon: typeof Activity }[] = [
  { key: 'home', label: 'Home', icon: Radar },
  { key: 'system', label: 'System', icon: Cpu },
  { key: 'files', label: 'Files', icon: FolderOpen },
  { key: 'terminal', label: 'Terminal', icon: TerminalIcon },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'memory', label: 'Memory', icon: BrainCircuit },
  { key: 'network', label: 'Network', icon: Network },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const particles = Array.from({ length: 170 }, (_, i) => {
  const a = i * 2.39996;
  const radius = 2.6 + ((i * 37) % 100) / 100 * 4.5;
  return [Math.cos(a) * radius, (Math.sin(i * 1.71) * 1.5), Math.sin(a) * radius] as [number, number, number];
});

function CoreOrb({ effects }: { effects: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (core.current) {
      core.current.rotation.y = t * 0.18;
      core.current.rotation.x = Math.sin(t * .35) * .12;
      core.current.scale.setScalar(1 + Math.sin(t * 1.4) * .035);
    }
    if (halo.current) halo.current.scale.setScalar(1.08 + Math.sin(t * .75) * .06);
  });
  return (
    <group>
      <mesh ref={halo}>
        <sphereGeometry args={[1.7, 24, 24]} />
        <meshBasicMaterial color="#4fe0cc" transparent opacity={effects ? .06 : .025} depthWrite={false} />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.18, 3]} />
        <meshStandardMaterial color="#0e494e" emissive="#35bcae" emissiveIntensity={effects ? 1.5 : .8} roughness={.24} metalness={.72} wireframe />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.33, .018, 8, 64]} />
        <meshBasicMaterial color="#ff7847" transparent opacity={.9} />
      </mesh>
      <mesh rotation={[0, Math.PI / 3, Math.PI / 5]}>
        <torusGeometry args={[1.48, .009, 8, 64]} />
        <meshBasicMaterial color="#e8e3be" transparent opacity={.55} />
      </mesh>
    </group>
  );
}

function ParticleField({ effects }: { effects: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(particles.flat(), 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (ref.current && effects) ref.current.rotation.y += delta * .018;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#4fe0cc" size={.025} transparent opacity={effects ? .52 : .18} sizeAttenuation />
    </points>
  );
}

function CoreScene({ effects, notify }: { effects: boolean; notify: (text: string, detail?: string) => void }) {
  const [subscribe, getState] = useKeyboardControls<Control>();
  const ship = useRef<THREE.Group>(null);
  useEffect(() => subscribe((s) => s.forward || s.back || s.left || s.right, (pressed) => {
    if (pressed) notify('Navigation input received', 'WASD / arrow movement is mapped to the core viewport.');
  }), [subscribe, notify]);
  useFrame((_, delta) => {
    const state = getState();
    if (ship.current) {
      if (state.left) ship.current.rotation.y += delta * .3;
      if (state.right) ship.current.rotation.y -= delta * .3;
      if (state.forward) ship.current.position.z = Math.max(-.4, ship.current.position.z - delta * .15);
      if (state.back) ship.current.position.z = Math.min(.4, ship.current.position.z + delta * .15);
    }
  });
  return (
    <>
      <color attach="background" args={['#071419']} />
      <fog attach="fog" args={['#071419', 7, 14]} />
      <ambientLight intensity={.32} color="#9be8db" />
      <pointLight position={[2, 3, 4]} intensity={13} color="#4fe0cc" distance={8} />
      <pointLight position={[-3, -2, 1]} intensity={7} color="#ff7847" distance={7} />
      <group ref={ship}>
        <CoreOrb effects={effects} />
        <ParticleField effects={effects} />
      </group>
      <gridHelper args={[14, 24, '#183d42', '#0b252a']} rotation={[0, 0, 0]} position={[0, -2.05, 0]} />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={effects} autoRotateSpeed={.18} />
    </>
  );
}

function BootScreen({ onReady }: { onReady: () => void }) {
  const [progress, setProgress] = useState(0);
  const logs = [
    'mounting METELLUS kernel',
    'calibrating neural geometry',
    'warming WEND core interface',
    'establishing local command layer',
  ];
  useEffect(() => {
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + 8, 100)), 120);
    const done = window.setTimeout(onReady, 1850);
    return () => { window.clearInterval(timer); window.clearTimeout(done); };
  }, [onReady]);
  return (
    <motion.div className="boot-screen" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .5 }}>
      <div className="boot-inner">
        <div className="boot-kicker">WEND / METELLUS OS / local instance</div>
        <div className="boot-rule" />
        <div className="boot-wordmark">Think<br />inside.</div>
        <div className="boot-log">
          {logs.slice(0, Math.max(1, Math.ceil(progress / 27))).map((log, i) => (
            <div key={log}><strong>{String(i + 1).padStart(2, '0')}</strong>&nbsp;&nbsp;{log} <Check size={10} style={{ display: 'inline', color: '#4fe0cc' }} /></div>
          ))}
        </div>
        <div className="boot-progress"><span style={{ width: `${progress}%` }} /></div>
        <button className="boot-skip" onClick={onReady} data-testid="button-skip-boot">skip initialization <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></button>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, unit, tone = 'normal' }: { label: string; value: number; unit: string; tone?: string }) {
  return <div className={`metric ${tone}`}>
    <div className="metric-head"><span>{label}</span><strong>{value}{unit}</strong></div>
    <div className="metric-bar"><span style={{ width: `${value}%` }} /></div>
  </div>;
}

function SystemPanel({ values, onScan, scanning }: { values: number[]; onScan: () => void; scanning: boolean }) {
  return <Panel title="System matrix" kicker="live simulation">
    <div className="core-readout"><div className="large">OPTIMAL</div><small>WEND CORE / coherence field stable</small></div>
    <Metric label="Core load" value={values[0]} unit="%" />
    <Metric label="Memory lattice" value={values[1]} unit="%" />
    <Metric label="Signal latency" value={values[2]} unit="ms" tone="accent" />
    <button className="action-button" style={{ marginTop: 17 }} onClick={onScan} data-testid="button-scan-system"><ScanLine size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 7 }} /> {scanning ? 'scanning...' : 'run system scan'}</button>
  </Panel>;
}

function Panel({ title, kicker, children, onClose }: { title: string; kicker?: string; children: ReactNode; onClose?: () => void }) {
  return <motion.div className="modal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
    <div className="modal-head"><div><div className="eyebrow">{kicker ?? 'METELLUS OS'}</div><h2>{title}</h2></div>{onClose && <button className="modal-close" onClick={onClose} data-testid="button-close-panel"><X size={18} /></button>}</div>
    {children}
  </motion.div>;
}

function TerminalPanel({ notify }: { notify: (text: string, detail?: string) => void }) {
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState(['METELLUS local shell v0.8.4', 'Safe mode enabled. No host filesystem access.', 'Type help to see available commands.']);
  const run = () => {
    const cmd = command.trim().toLowerCase();
    if (!cmd) return;
    const response = cmd === 'help' ? 'safe commands: help, status, scan, clear, whoami' :
      cmd === 'status' ? 'core: optimal / memory: nominal / network: local simulation' :
      cmd === 'scan' ? 'scan queued — all local interface nodes respond' :
      cmd === 'whoami' ? 'operator / local session / identity not persisted' :
      cmd === 'clear' ? '' : `command not available in safe mode: ${cmd}`;
    setLines((old) => cmd === 'clear' ? [] : [...old, `> ${cmd}`, response]);
    if (cmd === 'scan') notify('Terminal scan complete', 'No external systems were contacted.');
    setCommand('');
  };
  return <Panel title="Terminal" kicker="safe local shell">
    <div className="terminal-window" data-testid="text-terminal-output">{lines.map((line, i) => <div className="terminal-line" key={`${line}-${i}`}><strong>{line.startsWith('>') ? '' : '· '}</strong>{line}</div>)}</div>
    <form className="terminal-form" onSubmit={(e) => { e.preventDefault(); run(); }}><input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="enter safe command" aria-label="Terminal command" data-testid="input-terminal-command" /><button type="submit" data-testid="button-run-command"><Send size={13} /></button></form>
  </Panel>;
}

function FilesPanel() {
  const files = [['/memory/field-notes.wnd', '12.4 KB', 'updated 4m ago'], ['/agents/atlas.profile', '3.1 KB', 'online'], ['/system/manifest.json', '8.8 KB', 'read only'], ['/network/local-nodes.map', '2.0 KB', 'simulated']];
  return <div className="row-list">{files.map(([name, size, info]) => <div className="list-row" key={name}><FolderOpen size={16} /><div><strong>{name}</strong><small>{size} / {info}</small></div><ChevronRight size={14} color="#697f80" /></div>)}</div>;
}

function AgentsPanel({ notify }: { notify: (text: string, detail?: string) => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const agents = [['ATLAS', 'Synthesis / ready', 'A'], ['MIRA', 'Pattern watch / idle', 'M'], ['ORBIT', 'Memory indexing / ready', 'O']];
  const activate = (name: string) => { setRunning(name); notify(`${name} agent activated`, 'Simulated agent response channel is ready.'); window.setTimeout(() => setRunning(null), 1400); };
  return <Panel title="Agent center" kicker="three local processes"><div className="row-list">{agents.map(([name, state, initial]) => <div className="list-row" key={name}><div className="info-icon" style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', border: '1px solid #4fe0cc', font: '.65rem var(--app-font-mono)' }}>{initial}</div><div><strong>{name}</strong><small>{state}</small></div><button className="tag" onClick={() => activate(name)} data-testid={`button-activate-agent-${name.toLowerCase()}`}>{running === name ? 'working' : 'activate'}</button></div>)}</div></Panel>;
}

function MemoryPanel() {
  return <Panel title="Memory center" kicker="local recall index"><div className="section-grid"><div className="info-tile"><MemoryStick className="info-icon" size={17} /><h3>2,418 fragments</h3><p>Indexed locally in the current session. Nothing is uploaded.</p></div><div className="info-tile"><Layers3 className="info-icon" size={17} /><h3>87 clusters</h3><p>Conceptual groupings inferred from simulated field notes.</p></div></div><div className="core-readout" style={{ marginTop: 12 }}><div className="large">92.6%</div><small>RECALL COHERENCE / last index 00:42 ago</small></div></Panel>;
}

function NetworkPanel() {
  return <Panel title="Network field" kicker="simulated topology"><div className="core-readout"><div className="large">LOCAL ONLY</div><small>No network connection or external nodes are being accessed.</small></div><div className="row-list"><div className="list-row"><Network size={16} /><div><strong>METELLUS loopback</strong><small>127.0.0.1 / responsive</small></div><span className="tag">stable</span></div><div className="list-row"><ShieldCheck size={16} /><div><strong>Privacy boundary</strong><small>external traffic blocked by design</small></div><span className="tag">sealed</span></div></div></Panel>;
}

function SettingsPanel({ effects, setEffects, reduced, setReduced, notify }: { effects: boolean; setEffects: (v: boolean) => void; reduced: boolean; setReduced: (v: boolean) => void; notify: (text: string, detail?: string) => void }) {
  const requestMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { notify('Voice readiness unavailable', 'This browser does not expose microphone access.'); return; }
    notify('Voice readiness is simulated', 'Microphone access is not requested by METELLUS OS.');
  };
  return <Panel title="Settings" kicker="interface controls"><div className="settings-list">
    <div className="setting-row"><div><strong>Atmospheric effects</strong><small>Particles, glow and orbital motion</small></div><button className={`toggle ${effects ? 'on' : ''}`} onClick={() => setEffects(!effects)} aria-label="Toggle atmospheric effects" data-testid="button-toggle-effects"><span /></button></div>
    <div className="setting-row"><div><strong>Reduced motion</strong><small>Respect prefers-reduced-motion preference</small></div><button className={`toggle ${reduced ? 'on' : ''}`} onClick={() => setReduced(!reduced)} aria-label="Toggle reduced motion" data-testid="button-toggle-motion"><span /></button></div>
    <div className="setting-row"><div><strong>Voice input readiness</strong><small>Browser permission is never requested</small></div><button className="icon-button" onClick={requestMic} aria-label="Check voice readiness" data-testid="button-check-microphone"><Mic size={17} /></button></div>
    <div className="setting-row"><div><strong>Render profile</strong><small>Balanced / 170 field particles</small></div><Gauge size={17} color="#e8e3be" /></div>
  </div></Panel>;
}

function CommandCenter({ close, select, notify }: { close: () => void; select: (key: PanelKey) => void; notify: (text: string, detail?: string) => void }) {
  const [search, setSearch] = useState('');
  const commands = [
    ['Open system matrix', 'system', Cpu], ['Open terminal', 'terminal', TerminalIcon], ['Run local system scan', 'scan', ScanLine],
    ['Open memory center', 'memory', BrainCircuit], ['Check voice readiness', 'voice', Mic], ['Enter fullscreen', 'full', Maximize],
  ] as const;
  const filtered = commands.filter(([label]) => label.toLowerCase().includes(search.toLowerCase()));
  const execute = (key: string) => {
    close();
    if (key === 'scan') { notify('System scan complete', 'Core, memory and local signal fields are nominal.'); return; }
    if (key === 'voice') { notify('Voice readiness is simulated', 'No microphone permission was requested.'); return; }
    if (key === 'full') { document.documentElement.requestFullscreen?.().catch(() => notify('Fullscreen unavailable', 'The browser declined the fullscreen request.')); return; }
    select(key as PanelKey);
  };
  return <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}><Panel title="Command center" kicker="ctrl + k / quick actions" onClose={close}><div className="command-search"><Search size={16} color="#4fe0cc" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search commands..." data-testid="input-command-search" /><span className="key">esc</span></div><div className="command-list">{filtered.map(([label, key, Icon]) => <button className="command-row" key={key} onClick={() => execute(key)} data-testid={`button-command-${key}`}><Icon /><div>{label}<span>{key === 'scan' ? 'analyze local interface state' : 'open workspace module'}</span></div><small>↵</small></button>)}</div></Panel></div>;
}

function Workspace() {
  const [booted, setBooted] = useState(false);
  const [active, setActive] = useState<PanelKey>('home');
  const [commandOpen, setCommandOpen] = useState(false);
  const [effects, setEffects] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [values, setValues] = useState([38, 62, 14]);
  const notify = (text: string, detail?: string) => {
    const id = Date.now();
    setNotices((old) => [...old.slice(-2), { id, text, detail }]);
    window.setTimeout(() => setNotices((old) => old.filter((n) => n.id !== id)), 4200);
  };
  const openPanel = (key: PanelKey) => { setActive(key); if (key !== 'home') setCommandOpen(false); };
  useEffect(() => {
    const interval = window.setInterval(() => setValues((old) => old.map((n, i) => Math.max(5, Math.min(i === 2 ? 38 : 88, n + (Math.random() > .5 ? 1 : -1) * (i === 2 ? 2 : 3))))), 1600);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandOpen(true); }
      if (e.key === 'Escape') { setCommandOpen(false); setActive('home'); }
      if (e.key.toLowerCase() === 'f' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) document.documentElement.requestFullscreen?.().catch(() => notify('Fullscreen unavailable'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const runScan = () => {
    setScanning(true); notify('System scan started', 'Reading local simulated telemetry.');
    window.setTimeout(() => { setScanning(false); notify('System scan complete', 'No anomalies found in the local simulation.'); }, 1500);
  };
  const panel = active === 'system' ? <SystemPanel values={values} onScan={runScan} scanning={scanning} /> :
    active === 'files' ? <Panel title="File lattice" kicker="simulated workspace"><FilesPanel /></Panel> :
    active === 'terminal' ? <TerminalPanel notify={notify} /> :
    active === 'agents' ? <AgentsPanel notify={notify} /> :
    active === 'memory' ? <MemoryPanel /> :
    active === 'network' ? <NetworkPanel /> :
    active === 'settings' ? <SettingsPanel effects={effects} setEffects={setEffects} reduced={reduced} setReduced={setReduced} notify={notify} /> : null;
  if (!booted) return <AnimatePresence><BootScreen onReady={() => setBooted(true)} /></AnimatePresence>;
  return <KeyboardControls map={[{ name: 'forward', keys: ['ArrowUp', 'KeyW'] }, { name: 'back', keys: ['ArrowDown', 'KeyS'] }, { name: 'left', keys: ['ArrowLeft', 'KeyA'] }, { name: 'right', keys: ['ArrowRight', 'KeyD'] }]}>
    <main className="wend-app">
      <div className="desktop">
        <header className="topbar">
          <div className="brand"><div className="brand-mark"><span>W</span></div><div className="brand-name">WEND <i>/ METELLUS</i></div></div>
          <div className="top-status"><span className="signal-dot" /> local session / nominal</div>
          <div className="top-actions"><button className="icon-button" onClick={() => setCommandOpen(true)} aria-label="Open command center" data-testid="button-open-command"><Command size={16} /></button><button className="icon-button" onClick={() => document.documentElement.requestFullscreen?.().catch(() => notify('Fullscreen unavailable'))} aria-label="Enter fullscreen" data-testid="button-fullscreen"><Maximize size={16} /></button><button className="icon-button" onClick={() => notify('Session power control', 'Close this tab to end the local simulation.')} aria-label="Session power information" data-testid="button-power"><Power size={16} /></button></div>
        </header>
        <nav className="nav-rail" aria-label="METELLUS modules">{navItems.map(({ key, label, icon: Icon }) => <button className={`nav-item ${active === key ? 'active' : ''}`} key={key} onClick={() => openPanel(key)} data-testid={`button-nav-${key}`}><Icon /><span>{label}</span></button>)}</nav>
        <section className="scene-wrap">
          <Canvas className="scene-canvas" camera={{ position: [0, .25, 7.4], fov: 43 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}><CoreScene effects={effects && !reduced} notify={notify} /></Canvas>
          <div className="scene-label"><div className="eyebrow">primary interface / 01</div><h1>WEND Core</h1><p>your local intelligence, visualized</p></div>
          <div className="scene-coordinates"><div>FIELD POSITION <strong>0.00 / 0.00 / 0.00</strong></div><div>ROTATION <strong>18.4°</strong></div><div>PHASE <strong>COHERENT</strong></div></div>
          <div className="scene-hint"><span className="key">W A S D</span><span>navigate field</span><span className="key">drag</span><span>orbit view</span></div>
          <AnimatePresence>{commandOpen ? <CommandCenter close={() => setCommandOpen(false)} select={openPanel} notify={notify} /> : active !== 'home' && <div className="overlay">{panel}</div>}</AnimatePresence>
        </section>
        <aside className="right-panel">
          <div className="panel-title"><h2>System pulse</h2><span>LIVE / 00:42:18</span></div>
          <Metric label="Core load" value={values[0]} unit="%" /><Metric label="Memory lattice" value={values[1]} unit="%" /><Metric label="Signal latency" value={values[2]} unit="ms" />
          <div className="telemetry-list"><div className="eyebrow">Telemetry</div><div className="telemetry-row"><span>processes</span><span>14 active</span></div><div className="telemetry-row"><span>local nodes</span><span>03 online</span></div><div className="telemetry-row"><span>coherence</span><span>92.6%</span></div><div className="telemetry-row"><span>session</span><span>ephemeral</span></div></div>
          <div className="core-readout"><div className="large">NOMINAL</div><small>all local systems responding</small></div>
        </aside>
        <footer className="bottom-bar"><div className="bottom-prompt"><b>WEND://</b><span>{scanning ? 'scanning local system...' : 'awaiting your direction'}</span></div><div className="bottom-meta">CTRL + K&nbsp;&nbsp; COMMAND CENTER</div><button className="icon-button" onClick={() => notify('Voice readiness is simulated', 'Microphone access is not requested.')} aria-label="Voice readiness" data-testid="button-voice"><Headphones size={15} /></button></footer>
      </div>
      <div className="notice-stack" aria-live="polite">{notices.map((notice) => <div className="notice" key={notice.id} data-testid={`status-notice-${notice.id}`}>{notice.text}{notice.detail && <small>{notice.detail}</small>}</div>)}</div>
    </main>
  </KeyboardControls>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Workspace} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;