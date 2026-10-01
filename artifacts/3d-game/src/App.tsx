/// <reference types="@react-three/fiber" />
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  KeyboardControls,
  OrbitControls,
  useKeyboardControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Command,
  Cpu,
  Eye,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Gauge,
  Grid3X3,
  HardDrive,
  Headphones,
  Layers3,
  Maximize,
  MemoryStick,
  Mic,
  Minimize2,
  Network,
  Pencil,
  Play,
  Plus,
  Power,
  Radar,
  RotateCcw,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useWendStore } from '@/hooks/useWendStore';
import type {
  PanelKey,
  VirtualFile,
  WendAgent,
  WendMemory,
  WendSettings,
  WendWindow,
  WindowKey,
} from '@/types/wend';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const WEND_VERSION = '0.1.0';

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

const windowTitles: Record<WindowKey, { title: string; kicker: string }> = {
  system: { title: 'System matrix', kicker: 'live simulated telemetry' },
  files: { title: 'File lattice', kicker: 'virtual local workspace' },
  terminal: { title: 'Terminal', kicker: 'safe local shell' },
  agents: { title: 'Agent center', kicker: 'three local processes' },
  memory: { title: 'Memory center', kicker: 'persistent local recall' },
  network: { title: 'Network field', kicker: 'simulated topology' },
  settings: { title: 'Settings', kicker: 'interface controls' },
  notifications: { title: 'Notification center', kicker: 'local event history' },
};

const particlePositions = Array.from({ length: 170 }, (_, index) => {
  const angle = index * 2.39996;
  const radius = 2.6 + ((index * 37) % 100) / 100 * 4.5;
  return [
    Math.cos(angle) * radius,
    Math.sin(index * 1.71) * 1.5,
    Math.sin(angle) * radius,
  ] as [number, number, number];
});

function CoreOrb({
  effects,
  glow,
  state,
  onClick,
}: {
  effects: boolean;
  glow: boolean;
  state: 'idle' | 'listening' | 'processing' | 'success' | 'warning' | 'error';
  onClick: () => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const stateColor = {
    idle: '#35bcae',
    listening: '#7dd3fc',
    processing: '#ff7847',
    success: '#e8e3be',
    warning: '#f59e0b',
    error: '#ef6666',
  }[state];

  useFrame(({ clock, pointer }) => {
    const time = clock.getElapsedTime();
    if (core.current) {
      core.current.rotation.y = time * (state === 'processing' ? 0.42 : 0.18);
      core.current.rotation.x = Math.sin(time * 0.35) * 0.12 + pointer.y * 0.08;
      core.current.rotation.z = pointer.x * 0.05;
      core.current.scale.setScalar(1 + Math.sin(time * (state === 'idle' ? 1.4 : 3.4)) * (state === 'idle' ? 0.035 : 0.075));
    }
    if (halo.current) {
      halo.current.scale.setScalar(1.08 + Math.sin(time * 0.75) * (state === 'idle' ? 0.06 : 0.11));
      halo.current.rotation.y = -time * 0.08;
    }
  });

  return (
    <group onClick={onClick} onPointerOver={(event) => event.stopPropagation()}>
      <mesh ref={halo}>
        <sphereGeometry args={[1.7, 24, 24]} />
        <meshBasicMaterial color={stateColor} transparent opacity={glow && effects ? 0.09 : 0.025} depthWrite={false} />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.18, 3]} />
        <meshStandardMaterial color="#0e494e" emissive={stateColor} emissiveIntensity={glow && effects ? 1.6 : 0.7} roughness={0.24} metalness={0.72} wireframe />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.33, 0.018, 8, 64]} />
        <meshBasicMaterial color={state === 'error' ? stateColor : '#ff7847'} transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[0, Math.PI / 3, Math.PI / 5]}>
        <torusGeometry args={[1.48, 0.009, 8, 64]} />
        <meshBasicMaterial color={stateColor} transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function ParticleField({ enabled, count }: { enabled: boolean; count: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions.slice(0, count).flat(), 3));
    return geometry;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current && enabled) ref.current.rotation.y += delta * 0.018;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#4fe0cc" size={0.025} transparent opacity={enabled ? 0.52 : 0.12} sizeAttenuation />
    </points>
  );
}

function CoreScene({
  effects,
  particles,
  grid,
  glow,
  state,
  onCoreClick,
  notify,
}: {
  effects: boolean;
  particles: boolean;
  grid: boolean;
  glow: boolean;
  state: 'idle' | 'listening' | 'processing' | 'success' | 'warning' | 'error';
  onCoreClick: () => void;
  notify: (text: string, detail?: string) => void;
}) {
  const [subscribe, getState] = useKeyboardControls<Control>();
  const ship = useRef<THREE.Group>(null);
  const didNotifyInput = useRef(false);

  useEffect(() => subscribe(
    (keyboardState) => keyboardState.forward || keyboardState.back || keyboardState.left || keyboardState.right,
    (pressed) => {
      if (pressed && !didNotifyInput.current) {
        didNotifyInput.current = true;
        notify('Navigation input received', 'WASD and arrow movement are mapped to the core viewport.');
        window.setTimeout(() => { didNotifyInput.current = false; }, 1600);
      }
    },
  ), [notify, subscribe]);

  useFrame((_, delta) => {
    const controls = getState();
    if (!ship.current) return;
    if (controls.left) ship.current.rotation.y += delta * 0.3;
    if (controls.right) ship.current.rotation.y -= delta * 0.3;
    if (controls.forward) ship.current.position.z = Math.max(-0.4, ship.current.position.z - delta * 0.15);
    if (controls.back) ship.current.position.z = Math.min(0.4, ship.current.position.z + delta * 0.15);
  });

  return (
    <>
      <color attach="background" args={['#071419']} />
      <fog attach="fog" args={['#071419', 7, 14]} />
      <ambientLight intensity={0.32} color="#9be8db" />
      <pointLight position={[2, 3, 4]} intensity={glow ? 13 : 5} color="#4fe0cc" distance={8} />
      <pointLight position={[-3, -2, 1]} intensity={glow ? 7 : 3} color="#ff7847" distance={7} />
      <group ref={ship}>
        <CoreOrb effects={effects} glow={glow} state={state} onClick={onCoreClick} />
        <ParticleField enabled={effects && particles} count={particles ? 170 : 36} />
      </group>
      {grid && <gridHelper args={[14, 24, '#183d42', '#0b252a']} position={[0, -2.05, 0]} />}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={effects} autoRotateSpeed={0.18} />
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
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(done);
    };
  }, [onReady]);

  return (
    <motion.div className="boot-screen" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="boot-inner">
        <div className="boot-kicker">WEND / METELLUS OS / local instance</div>
        <div className="boot-rule" />
        <div className="boot-wordmark">Think<br />inside.</div>
        <div className="boot-log">
          {logs.slice(0, Math.max(1, Math.ceil(progress / 27))).map((log, index) => (
            <div key={log}><strong>{String(index + 1).padStart(2, '0')}</strong>&nbsp;&nbsp;{log} <Check size={10} style={{ display: 'inline', color: '#4fe0cc' }} /></div>
          ))}
        </div>
        <div className="boot-progress"><span style={{ width: `${progress}%` }} /></div>
        <button className="boot-skip" onClick={onReady} data-testid="button-skip-boot">
          skip initialization <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </button>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, barValue, unit = '', tone = 'normal' }: { label: string; value: string | number; barValue: number; unit?: string; tone?: string }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-head"><span>{label}</span><strong>{value}{unit}</strong></div>
      <div className="metric-bar"><span style={{ width: `${Math.max(0, Math.min(100, barValue))}%` }} /></div>
    </div>
  );
}

function WindowFrame({
  windowKey,
  title,
  kicker,
  windowState,
  children,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onDragStart,
}: {
  windowKey: WindowKey;
  title: string;
  kicker: string;
  windowState: WendWindow;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  if (!windowState.open || windowState.minimized) return null;
  const positionStyle = windowState.maximized
    ? { zIndex: windowState.z }
    : { left: windowState.x, top: windowState.y, zIndex: windowState.z };

  return (
    <motion.div
      className={`modal window-shell ${windowState.maximized ? 'window-maximized' : ''}`}
      style={positionStyle}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      onPointerDown={onFocus}
      data-window={windowKey}
    >
      <div className="modal-head window-head" onPointerDown={onDragStart}>
        <div>
          <div className="eyebrow">{kicker}</div>
          <h2>{title}</h2>
        </div>
        <div className="window-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button className="window-control" onClick={onMinimize} aria-label={`Minimize ${title}`}><Minimize2 size={14} /></button>
          <button className="window-control" onClick={onMaximize} aria-label={`${windowState.maximized ? 'Restore' : 'Maximize'} ${title}`}><Maximize size={13} /></button>
          <button className="window-control close" onClick={onClose} aria-label={`Close ${title}`}><X size={15} /></button>
        </div>
      </div>
      <div className="window-body">{children}</div>
    </motion.div>
  );
}

function SystemPanel({
  values,
  store,
}: {
  values: { cpu: number; ram: number; storage: number; network: number };
  store: ReturnType<typeof useWendStore>;
}) {
  const scanSteps = ['INITIALIZING', 'CHECKING CORE', 'CHECKING MEMORY', 'CHECKING NETWORK', 'CHECKING INTERFACE', 'FINALIZING'];
  return (
    <div>
      <div className="core-readout"><div className="large">{store.scan.active ? 'SCANNING' : 'OPTIMAL'}</div><small>WEND CORE / simulated browser telemetry</small></div>
      <Metric label="CPU / simulated" value={values.cpu} barValue={values.cpu} unit="%" />
      <Metric label="RAM / simulated" value={values.ram} barValue={values.ram} unit="%" />
      <Metric label="Storage / simulated" value={values.storage} barValue={values.storage} unit="%" tone="accent" />
      <Metric label="Network / simulated" value={values.network} barValue={values.network} unit=" Mbps" />
      <div className="telemetry-list compact">
        <div className="eyebrow">System scan</div>
        {scanSteps.map((step, index) => <div className={`scan-step ${store.scan.step > index ? 'complete' : store.scan.step === index && store.scan.active ? 'current' : ''}`} key={step}><span>{store.scan.step > index ? 'OK' : store.scan.step === index && store.scan.active ? '...' : '--'}</span>{step}</div>)}
      </div>
      <div className="scan-result"><strong>HEALTH {store.scan.health}%</strong><small>All readings are local simulations, not host system data.</small></div>
      <button className="action-button" style={{ marginTop: 17 }} onClick={store.runScan} disabled={store.scan.active} data-testid="button-scan-system">
        <ScanLine size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 7 }} /> {store.scan.active ? 'scanning...' : 'run system scan'}
      </button>
    </div>
  );
}

function TerminalPanel({
  lines,
  history,
  setHistory,
  execute,
}: {
  lines: string[];
  history: string[];
  setHistory: (value: string[] | ((current: string[]) => string[])) => void;
  execute: (command: string) => void;
}) {
  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const run = () => {
    if (!command.trim()) return;
    execute(command);
    setCommand('');
    setHistoryIndex(-1);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.min(history.length - 1, historyIndex + 1);
      setHistoryIndex(next);
      setCommand(history[history.length - 1 - next] ?? '');
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.max(-1, historyIndex - 1);
      setHistoryIndex(next);
      setCommand(next === -1 ? '' : history[history.length - 1 - next] ?? '');
    }
  };

  return (
    <div>
      <div className="terminal-window" data-testid="text-terminal-output">
        {lines.map((line, index) => <div className="terminal-line" key={`${line}-${index}`}><strong>{line.startsWith('>') ? '' : '· '}</strong>{line}</div>)}
      </div>
      <form className="terminal-form" onSubmit={(event) => { event.preventDefault(); run(); }}>
        <input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={onKeyDown} placeholder="enter safe command" aria-label="Terminal command" data-testid="input-terminal-command" />
        <button type="submit" aria-label="Run terminal command" data-testid="button-run-command"><Send size={13} /></button>
      </form>
      <div className="terminal-help">UP / DOWN history&nbsp;&nbsp; • &nbsp;&nbsp;safe mode only</div>
    </div>
  );
}

function FilesPanel({ store }: { store: ReturnType<typeof useWendStore> }) {
  const [currentFolder, setCurrentFolder] = useState('root');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'modified'>('name');
  const [newType, setNewType] = useState<VirtualFile['kind'] | null>(null);
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState<VirtualFile | null>(null);
  const current = store.files.find((file) => file.id === currentFolder);
  const breadcrumbs = [];
  let cursor: VirtualFile | undefined = current;
  while (cursor) {
    breadcrumbs.unshift(cursor);
    cursor = cursor.parentId ? store.files.find((file) => file.id === cursor?.parentId) : undefined;
  }
  const visible = store.files
    .filter((file) => file.parentId === currentFolder && file.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : a.modified.localeCompare(b.modified));

  const create = () => {
    if (!newType || !newName.trim()) return;
    store.addFile(currentFolder, newName, newType);
    store.notify(`${newType === 'folder' ? 'Folder' : 'File'} created`, `${newName} is available in the virtual workspace.`, 'success');
    setNewName('');
    setNewType(null);
  };

  return (
    <div className="file-manager">
      <div className="file-toolbar">
        <button className="small-action" onClick={() => setCurrentFolder(current?.parentId ?? 'root')} disabled={currentFolder === 'root'} aria-label="Go back"><ArrowLeft size={13} /> back</button>
        <div className="breadcrumb">{breadcrumbs.map((item, index) => <button key={item.id} onClick={() => setCurrentFolder(item.id)}>{item.name}{index < breadcrumbs.length - 1 ? ' / ' : ''}</button>)}</div>
        <button className="small-action" onClick={() => setSort(sort === 'name' ? 'modified' : 'name')}><ChevronDown size={13} /> {sort}</button>
      </div>
      <div className="file-actions">
        <button className="small-action" onClick={() => setNewType('folder')}><FolderPlus size={13} /> new folder</button>
        <button className="small-action" onClick={() => setNewType('file')}><FilePlus2 size={13} /> new file</button>
        <label className="search-field"><Search size={13} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="search workspace" aria-label="Search virtual files" /></label>
      </div>
      {newType && <form className="inline-form" onSubmit={(event) => { event.preventDefault(); create(); }}><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`${newType} name`} aria-label={`${newType} name`} /><button className="action-button" type="submit"><Plus size={13} /> create</button><button className="small-action" type="button" onClick={() => setNewType(null)}>cancel</button></form>}
      <div className="file-list">
        {visible.length === 0 && <div className="empty-state">No virtual entries match this field.</div>}
        {visible.map((file) => (
          <div className={`list-row file-row ${selected?.id === file.id ? 'selected' : ''}`} key={file.id} onClick={() => setSelected(file)}>
            {file.kind === 'folder' ? <FolderOpen size={16} /> : <FilePlus2 size={16} />}
            <button className="file-main" onDoubleClick={() => file.kind === 'folder' && setCurrentFolder(file.id)}><strong>{file.name}</strong><small>{file.size} / {file.modified}</small></button>
            <button className="row-icon" onClick={() => { const next = window.prompt('Rename virtual entry', file.name); if (next?.trim()) store.updateFile(file.id, { name: next.trim() }); }} aria-label={`Rename ${file.name}`}><Pencil size={13} /></button>
            <button className="row-icon danger" onClick={() => store.removeFile(file.id)} aria-label={`Delete ${file.name}`}><Trash2 size={13} /></button>
            <ChevronRight size={14} color="#697f80" />
          </div>
        ))}
      </div>
      {selected && <div className="file-detail"><div className="eyebrow">selected entry</div><strong>{selected.name}</strong><small>{selected.kind} / {selected.size} / {selected.modified}</small>{selected.kind === 'file' && <p>{selected.content || 'Empty text file.'}</p>}</div>}
      <div className="panel-footnote">Virtual workspace only. Changes persist locally in this browser.</div>
    </div>
  );
}

function AgentsPanel({ store }: { store: ReturnType<typeof useWendStore> }) {
  const [selected, setSelected] = useState<WendAgent | null>(null);
  const toggleAgent = (agent: WendAgent) => {
    const nextStatus = agent.status === 'ONLINE' ? 'STANDBY' : 'ONLINE';
    store.updateAgent(agent.id, { status: nextStatus, lastActivity: nextStatus === 'ONLINE' ? 'activated just now' : 'deactivated just now', level: nextStatus === 'ONLINE' ? Math.min(99, agent.level + 2) : Math.max(1, agent.level - 1) });
    store.notify(`${agent.name} ${nextStatus === 'ONLINE' ? 'activated' : 'deactivated'}`, 'Simulated agent response channel updated.', nextStatus === 'ONLINE' ? 'success' : 'warning');
  };
  return (
    <div>
      <div className="row-list">
        {store.agents.map((agent) => (
          <div className="agent-card" key={agent.id}>
            <div className="agent-avatar">{agent.name.slice(0, 1)}</div>
            <div className="agent-main"><strong>{agent.name}</strong><small>{agent.description}</small><div className="agent-energy"><span style={{ width: `${agent.level}%` }} /></div><small>{agent.status} / {agent.lastActivity}</small></div>
            <button className="tag" onClick={() => toggleAgent(agent)}>{agent.status === 'ONLINE' ? 'deactivate' : 'activate'}</button>
            <button className="row-icon" onClick={() => setSelected(agent)} aria-label={`View ${agent.name}`}><Eye size={13} /></button>
          </div>
        ))}
      </div>
      {selected && <div className="agent-detail"><div className="eyebrow">agent profile</div><h3>{selected.name}</h3><p>{selected.description}. Level {selected.level} energy. This is a controlled simulation.</p><button className="small-action" onClick={() => setSelected(null)}>close profile</button></div>}
    </div>
  );
}

function MemoryPanel({ store }: { store: ReturnType<typeof useWendStore> }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<WendMemory['category'] | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newCategory, setNewCategory] = useState<WendMemory['category']>('NOTE');
  const visible = store.memories.filter((memory) => (category === 'ALL' || memory.category === category) && `${memory.title} ${memory.content}`.toLowerCase().includes(search.toLowerCase()));
  const create = () => {
    if (!title.trim() || !content.trim()) return;
    store.addMemory({ title: title.trim(), content: content.trim(), category: newCategory });
    store.notify('New memory created', `${title.trim()} was added to local recall.`, 'success');
    setTitle('');
    setContent('');
    setCreating(false);
  };
  return (
    <div className="memory-manager">
      <div className="file-actions">
        <label className="search-field"><Search size={13} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="search memory" aria-label="Search memory" /></label>
        <select className="select-input" value={category} onChange={(event) => setCategory(event.target.value as WendMemory['category'] | 'ALL')} aria-label="Filter memory category"><option value="ALL">all categories</option><option value="PROJECT">project</option><option value="NOTE">note</option><option value="KNOWLEDGE">knowledge</option><option value="SYSTEM">system</option></select>
        <button className="small-action" onClick={() => setCreating(!creating)}><Plus size={13} /> create</button>
      </div>
      {creating && <form className="memory-form" onSubmit={(event) => { event.preventDefault(); create(); }}><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="memory title" aria-label="Memory title" /><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="what should WEND remember?" aria-label="Memory content" /><select className="select-input" value={newCategory} onChange={(event) => setNewCategory(event.target.value as WendMemory['category'])}><option value="PROJECT">project</option><option value="NOTE">note</option><option value="KNOWLEDGE">knowledge</option><option value="SYSTEM">system</option></select><button className="action-button" type="submit"><Check size={13} /> save memory</button></form>}
      <div className="memory-list">
        {visible.map((memory) => <div className="memory-card" key={memory.id}><div className="memory-card-head"><span className="eyebrow">{memory.category}</span><div><button className={`row-icon ${memory.pinned ? 'pinned' : ''}`} onClick={() => store.updateMemory(memory.id, { pinned: !memory.pinned })} aria-label={`${memory.pinned ? 'Unpin' : 'Pin'} ${memory.title}`}>✦</button><button className="row-icon danger" onClick={() => store.removeMemory(memory.id)} aria-label={`Delete ${memory.title}`}><Trash2 size={13} /></button></div></div><h3>{memory.title}</h3><p>{memory.content}</p><small>{memory.date} / {memory.pinned ? 'pinned' : 'unfiled'}</small></div>)}
        {visible.length === 0 && <div className="empty-state">No memories match this query.</div>}
      </div>
      <div className="panel-footnote">Local recall persists in this browser and is never uploaded.</div>
    </div>
  );
}

function NetworkPanel() {
  return (
    <div>
      <div className="core-readout"><div className="large">LOCAL ONLY</div><small>No external network connection or host nodes are being accessed.</small></div>
      <div className="row-list">
        <div className="list-row"><Network size={16} /><div><strong>METELLUS loopback</strong><small>127.0.0.1 / responsive</small></div><span className="tag">stable</span></div>
        <div className="list-row"><ShieldCheck size={16} /><div><strong>Privacy boundary</strong><small>external traffic blocked by design</small></div><span className="tag">sealed</span></div>
      </div>
    </div>
  );
}

function NotificationPanel({ store }: { store: ReturnType<typeof useWendStore> }) {
  return (
    <div className="notification-history">
      <div className="file-actions"><span className="panel-footnote">{store.notificationHistory.length} stored events</span><button className="small-action" onClick={store.clearNotifications}><Trash2 size={13} /> clear history</button></div>
      {store.notificationHistory.length === 0 && <div className="empty-state">No events recorded yet.</div>}
      <div className="history-list">{[...store.notificationHistory].reverse().map((notice) => <div className={`history-row ${notice.type}`} key={notice.id}><Circle size={8} fill="currentColor" /><div><strong>{notice.text}</strong><small>{notice.detail || 'local event'} / {new Date(notice.timestamp).toLocaleTimeString()}</small></div></div>)}</div>
    </div>
  );
}

function SettingsPanel({
  settings,
  updateSettings,
  notify,
  resetInterface,
}: {
  settings: WendSettings;
  updateSettings: (patch: Partial<WendSettings>) => void;
  notify: (text: string, detail?: string) => void;
  resetInterface: () => void;
}) {
  const toggle = (key: keyof Pick<WendSettings, 'particles' | 'grid' | 'glow' | 'animations' | 'sidebarExpanded' | 'showSystemPanel' | 'showClock' | 'debug'>) => updateSettings({ [key]: !settings[key] });
  const checkVoice = () => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    notify(supported ? 'Voice interface ready' : 'Voice unavailable', supported ? 'Web Speech API is exposed by this browser.' : 'This browser does not expose Web Speech Recognition.', supported ? 'success' : 'warning');
  };
  return (
    <div className="settings-panel">
      <div className="settings-group"><div className="eyebrow">appearance</div><div className="choice-grid">{(['dark', 'light', 'cyber', 'minimal'] as const).map((theme) => <button key={theme} className={`choice-button ${settings.theme === theme ? 'selected' : ''}`} onClick={() => updateSettings({ theme })}>{theme}</button>)}</div></div>
      <div className="settings-group"><div className="eyebrow">effects</div>{(['particles', 'grid', 'glow', 'animations'] as const).map((key) => <div className="setting-row" key={key}><div><strong>{key}</strong><small>{key === 'grid' ? 'toggle the spatial coordinate field' : `toggle ${key} rendering`}</small></div><button className={`toggle ${settings[key] ? 'on' : ''}`} onClick={() => toggle(key)} aria-label={`Toggle ${key}`}><span /></button></div>)}</div>
      <div className="settings-group"><div className="eyebrow">performance</div><div className="choice-grid">{(['low', 'medium', 'high'] as const).map((mode) => <button key={mode} className={`choice-button ${settings.performance === mode ? 'selected' : ''}`} onClick={() => updateSettings({ performance: mode })}>{mode}</button>)}</div></div>
      <div className="settings-group"><div className="eyebrow">interface</div>{(['sidebarExpanded', 'showSystemPanel', 'showClock', 'debug'] as const).map((key) => <div className="setting-row" key={key}><div><strong>{key === 'sidebarExpanded' ? 'expanded sidebar' : key === 'showSystemPanel' ? 'system panel' : key === 'showClock' ? 'clock' : 'developer console'}</strong><small>persist this preference locally</small></div><button className={`toggle ${settings[key] ? 'on' : ''}`} onClick={() => toggle(key)} aria-label={`Toggle ${key}`}><span /></button></div>)}</div>
      <div className="settings-actions"><button className="small-action" onClick={checkVoice}><Mic size={13} /> check voice</button><button className="small-action danger-button" onClick={resetInterface}><RotateCcw size={13} /> reset interface</button></div>
      {settings.debug && <div className="debug-console"><div className="eyebrow">developer console</div><div>WEND VERSION <strong>{WEND_VERSION}</strong></div><div>RENDER MODE <strong>{settings.performance.toUpperCase()}</strong></div><div>FPS APPROXIMATELY <strong>60</strong></div><div>ACTIVE WINDOWS <strong>local</strong></div><div>MEMORY ITEMS <strong>persistent</strong></div><div>DEBUG MODE <strong>ENABLED</strong></div></div>}
      <div className="panel-footnote">Settings are saved automatically. Simulated metrics are intentionally labeled.</div>
    </div>
  );
}

type CommandItem = { id: string; label: string; detail: string; icon: typeof Command; run: () => void };

function CommandCenter({
  store,
  close,
  openModule,
  toggleFullscreen,
  executeTerminal,
}: {
  store: ReturnType<typeof useWendStore>;
  close: () => void;
  openModule: (key: PanelKey) => void;
  toggleFullscreen: () => void;
  executeTerminal: (command: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const commands = [
    ['open terminal', 'open the safe local shell', TerminalIcon, () => openModule('terminal')],
    ['open files', 'browse the virtual workspace', FolderOpen, () => openModule('files')],
    ['open agents', 'manage simulated processes', Bot, () => openModule('agents')],
    ['open memory', 'search persistent local recall', BrainCircuit, () => openModule('memory')],
    ['open system', 'inspect simulated telemetry', Cpu, () => openModule('system')],
    ['open settings', 'change the interface behavior', Settings, () => openModule('settings')],
    ['open notifications', 'review local event history', Bell, () => openModule('notifications')],
    ['open network', 'view the sealed network field', Network, () => openModule('network')],
    ['system scan', 'run the local interface scan', ScanLine, store.runScan],
    ['close all', 'return to the desktop', X, store.closeAllWindows],
    ['fullscreen', 'toggle browser fullscreen', Maximize, toggleFullscreen],
    ['toggle particles', 'change atmospheric rendering', Sparkles, () => store.updateSettings({ particles: !store.settings.particles })],
    ['toggle grid', 'change the spatial grid', Grid3X3, () => store.updateSettings({ grid: !store.settings.grid })],
    ['reset interface', 'restore persistent defaults', RotateCcw, store.resetInterface],
  ] as const;
  const commandItems: CommandItem[] = commands.map(([label, detail, icon, run]) => ({ id: label, label, detail, icon, run }));
  const globalResults: CommandItem[] = [
    ...store.files.filter((file) => file.name.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map((file) => ({ id: file.id, label: file.name, detail: `virtual ${file.kind} / open files`, icon: file.kind === 'folder' ? FolderOpen : FilePlus2, run: () => openModule('files') })),
    ...store.memories.filter((memory) => `${memory.title} ${memory.content}`.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map((memory) => ({ id: memory.id, label: memory.title, detail: `memory / ${memory.category}`, icon: BrainCircuit, run: () => openModule('memory') })),
    ...store.agents.filter((agent) => agent.name.toLowerCase().includes(search.toLowerCase())).map((agent) => ({ id: agent.id, label: agent.name, detail: `agent / ${agent.status}`, icon: Bot, run: () => openModule('agents') })),
  ];
  const results = search.trim() ? [...commandItems.filter((item) => `${item.label} ${item.detail}`.includes(search.toLowerCase())), ...globalResults] : commandItems;
  const execute = (item: CommandItem) => {
    item.run();
    close();
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((value) => Math.min(results.length - 1, value + 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => Math.max(0, value - 1)); }
    if (event.key === 'Enter' && results[selected]) { event.preventDefault(); execute(results[selected]); }
    if (event.key === 'Escape') close();
  };
  useEffect(() => setSelected(0), [search]);
  return (
    <div className="overlay command-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="modal command-modal">
        <div className="modal-head"><div><div className="eyebrow">ctrl + k / command layer</div><h2>Command center</h2></div><button className="modal-close" onClick={close} aria-label="Close command center"><X size={18} /></button></div>
        <div className="command-search"><Search size={16} color="#4fe0cc" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={onKeyDown} placeholder="Search commands, files, memory, agents..." data-testid="input-command-search" /><span className="key">esc</span></div>
        <div className="command-list">{results.map((item, index) => <button className={`command-row ${selected === index ? 'selected' : ''}`} key={`${item.id}-${index}`} onMouseEnter={() => setSelected(index)} onClick={() => execute(item)} data-testid={`button-command-${item.id.replaceAll(' ', '-')}`}><item.icon /><div>{item.label}<span>{item.detail}</span></div><small>enter</small></button>)}</div>
        {results.length === 0 && <div className="empty-state">No command or local record matches this query.</div>}
        <div className="command-foot"><ArrowUp size={11} /><ArrowDown size={11} /> navigate <span>enter</span> execute <span>esc</span> close</div>
      </div>
    </div>
  );
}

function Workspace() {
  const store = useWendStore();
  const [booted, setBooted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [values, setValues] = useState({ cpu: 38, ram: 62, storage: 48, network: 84 });
  const [dragging, setDragging] = useState<{ key: WindowKey; offsetX: number; offsetY: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');

  useEffect(() => {
    const telemetry = window.setInterval(() => setValues((current) => ({
      cpu: Math.max(18, Math.min(82, current.cpu + (Math.random() > 0.5 ? 1 : -1) * 3)),
      ram: Math.max(34, Math.min(88, current.ram + (Math.random() > 0.5 ? 1 : -1) * 2)),
      storage: Math.max(38, Math.min(64, current.storage + (Math.random() > 0.5 ? 1 : -1))),
      network: Math.max(42, Math.min(98, current.network + (Math.random() > 0.5 ? 2 : -2))),
    })), 1600);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearInterval(telemetry);
      window.clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (dragging) store.moveWindow(dragging.key, event.clientX - dragging.offsetX, event.clientY - dragging.offsetY);
    };
    const end = () => setDragging(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
  }, [dragging, store]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => store.notify('Fullscreen unavailable', 'The browser declined the request.', 'warning'));
    } else {
      document.documentElement.requestFullscreen?.().catch(() => store.notify('Fullscreen unavailable', 'The browser declined the request.', 'warning'));
    }
  }, [store]);

  const openModule = useCallback((key: PanelKey) => {
    if (key === 'home') {
      store.setActiveWindow('home');
      return;
    }
    store.openWindow(key);
  }, [store]);

  const executeTerminal = useCallback((rawCommand: string) => {
    const command = rawCommand.trim().toLowerCase();
    if (!command) return;
    store.setTerminalHistory((current) => [...current, command].slice(-40));
    if (command === 'clear') {
      store.setTerminalLines([]);
      return;
    }
    const responses: Record<string, string> = {
      help: 'commands: help, clear, status, system, version, about, date, time, scan, agents, memory, files, open terminal, open files, open agents, open settings',
      status: 'core: optimal / memory: nominal / network: local simulation / storage: browser persistence',
      system: 'WEND METELLUS OS / simulated telemetry only / health 98%',
      version: `WEND 3D — METELLUS OS / Version ${WEND_VERSION}`,
      about: 'WEND means Wide Expanding Neural Design. This is a local-first interactive prototype.',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      scan: 'scan queued — local interface nodes are responding',
      agents: `${store.agents.filter((agent) => agent.status === 'ONLINE').length} simulated agents online`,
      memory: `${store.memories.length} memories indexed locally`,
      files: `${store.files.length - 1} virtual entries available`,
      whoami: 'operator / local session / identity not persisted',
    };
    const openCommands: Record<string, PanelKey> = {
      'open terminal': 'terminal',
      'open files': 'files',
      'open agents': 'agents',
      'open memory': 'memory',
      'open settings': 'settings',
      'open system': 'system',
      'open network': 'network',
    };
    if (command === 'close all') {
      store.closeAllWindows();
    } else if (openCommands[command]) {
      openModule(openCommands[command]);
    }
    if (command === 'scan') store.runScan();
    const response = responses[command] ?? (openCommands[command] ? `${command} executed` : `command not available in safe mode: ${command}`);
    store.setTerminalLines((current) => [...current, `> ${command}`, response].slice(-60));
    if (command === 'scan') store.notify('Terminal scan started', 'The local system scan is running.', 'info');
  }, [openModule, store]);

  const startVoice = () => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void } }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void } }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState('error');
      store.notify('Voice unavailable', 'This browser does not expose Web Speech Recognition.', 'warning');
      return;
    }
    const recognition = new SpeechRecognition();
    setVoiceState('listening');
    store.pulseOrb('listening', 5000);
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setVoiceState('processing');
      executeTerminal(transcript);
      store.notify('Voice command executed', transcript, 'success');
    };
    recognition.onerror = () => {
      setVoiceState('error');
      store.notify('Voice command failed', 'The browser could not process the listening session.', 'error');
    };
    recognition.onend = () => setVoiceState('idle');
    try {
      recognition.start();
    } catch {
      setVoiceState('error');
      store.notify('Voice unavailable', 'The browser blocked the listening session.', 'warning');
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 't') { event.preventDefault(); openModule('terminal'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); openModule('files'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); openModule('agents'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') { event.preventDefault(); openModule('memory'); }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') { event.preventDefault(); openModule('settings'); }
      if (event.key === 'Escape' && !typing) {
        if (commandOpen) setCommandOpen(false);
        else if (store.activeWindow !== 'home') store.closeWindow(store.activeWindow as WindowKey);
      }
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandOpen, openModule, store, toggleFullscreen]);

  const startDrag = (key: WindowKey, event: ReactPointerEvent<HTMLDivElement>) => {
    const windowState = store.windows[key];
    if (windowState.maximized) return;
    store.focusWindow(key);
    setDragging({ key, offsetX: event.clientX - windowState.x, offsetY: event.clientY - windowState.y });
  };

  const windowContent = (key: WindowKey) => {
    if (key === 'system') return <SystemPanel values={values} store={store} />;
    if (key === 'files') return <FilesPanel store={store} />;
    if (key === 'terminal') return <TerminalPanel lines={store.terminalLines} history={store.terminalHistory} setHistory={store.setTerminalHistory} execute={executeTerminal} />;
    if (key === 'agents') return <AgentsPanel store={store} />;
    if (key === 'memory') return <MemoryPanel store={store} />;
    if (key === 'network') return <NetworkPanel />;
    if (key === 'notifications') return <NotificationPanel store={store} />;
    return <SettingsPanel settings={store.settings} updateSettings={store.updateSettings} notify={store.notify} resetInterface={store.resetInterface} />;
  };

  if (!booted) return <AnimatePresence><BootScreen onReady={() => setBooted(true)} /></AnimatePresence>;
  const particleCount = store.settings.performance === 'low' ? 60 : store.settings.performance === 'high' ? 170 : 110;
  const desktopClass = `desktop ${store.settings.showSystemPanel ? '' : 'system-panel-hidden'} ${store.settings.sidebarExpanded ? 'sidebar-expanded' : ''}`;
  const openWindows = Object.keys(store.windows) as WindowKey[];
  const minimizedWindows = openWindows.filter((key) => store.windows[key].open && store.windows[key].minimized);

  return (
    <KeyboardControls map={[{ name: 'forward', keys: ['ArrowUp', 'KeyW'] }, { name: 'back', keys: ['ArrowDown', 'KeyS'] }, { name: 'left', keys: ['ArrowLeft', 'KeyA'] }, { name: 'right', keys: ['ArrowRight', 'KeyD'] }]}>
      <main className={`wend-app theme-${store.settings.theme} ${store.settings.animations ? '' : 'no-motion'}`}>
        <div className={desktopClass}>
          <header className="topbar">
            <div className="brand"><div className="brand-mark"><span>W</span></div><div className="brand-name">WEND <i>/ METELLUS</i></div></div>
            <div className="top-status"><span className="signal-dot" /> local session / nominal</div>
            <div className="top-clock">{store.settings.showClock ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'} <span>{now.toLocaleDateString()}</span></div>
            <div className="top-actions">
              <button className="icon-button" onClick={() => setCommandOpen(true)} aria-label="Open command center" data-testid="button-open-command"><Command size={16} /></button>
              <button className="icon-button" onClick={() => openModule('notifications')} aria-label="Open notification center" data-testid="button-open-notifications"><Bell size={16} /><span className="notification-count">{store.notificationHistory.length}</span></button>
              <button className="icon-button" onClick={toggleFullscreen} aria-label="Toggle fullscreen" data-testid="button-fullscreen"><Maximize size={16} /></button>
              <button className="icon-button" onClick={() => store.notify('Session power control', 'Close this tab to end the local simulation.', 'info')} aria-label="Session power information" data-testid="button-power"><Power size={16} /></button>
            </div>
          </header>
          <nav className="nav-rail" aria-label="METELLUS modules">{navItems.map(({ key, label, icon: Icon }) => <button className={`nav-item ${store.activeWindow === key ? 'active' : ''}`} key={key} onClick={() => openModule(key)} data-testid={`button-nav-${key}`}><Icon /><span>{label}</span></button>)}</nav>
          <section className="scene-wrap">
            <Canvas className="scene-canvas" camera={{ position: [0, 0.25, 7.4], fov: 43 }} dpr={[1, store.settings.performance === 'high' ? 1.5 : 1.2]} gl={{ antialias: true, alpha: false }}>
              <CoreScene effects={store.settings.animations} particles={store.settings.particles} grid={store.settings.grid} glow={store.settings.glow} state={store.orbState} onCoreClick={() => { store.pulseOrb('success'); store.notify('Core interaction registered', 'WEND received your signal.', 'success'); }} notify={store.notify} />
            </Canvas>
            <div className="scene-label"><div className="eyebrow">primary interface / 01</div><h1>WEND Core</h1><p>your local intelligence, visualized</p></div>
            <div className="scene-coordinates"><div>FIELD POSITION <strong>0.00 / 0.00 / 0.00</strong></div><div>ROTATION <strong>18.4°</strong></div><div>PHASE <strong>{store.orbState.toUpperCase()}</strong></div></div>
            <div className="scene-hint"><span className="key">W A S D</span><span>navigate field</span><span className="key">drag</span><span>orbit view</span></div>
            <div className="quick-actions"><div className="eyebrow">quick actions</div><div>{(['terminal', 'files', 'agents', 'memory', 'system'] as const).map((key) => <button key={key} className="quick-action" onClick={() => openModule(key)}>{windowTitles[key].title}</button>)}</div></div>
            <AnimatePresence>{commandOpen && <CommandCenter store={store} close={() => setCommandOpen(false)} openModule={openModule} toggleFullscreen={toggleFullscreen} executeTerminal={executeTerminal} />}</AnimatePresence>
            <AnimatePresence>{openWindows.map((key) => <WindowFrame key={key} windowKey={key} title={windowTitles[key].title} kicker={windowTitles[key].kicker} windowState={store.windows[key]} onClose={() => store.closeWindow(key)} onMinimize={() => store.minimizeWindow(key)} onMaximize={() => store.toggleMaximize(key)} onFocus={() => store.focusWindow(key)} onDragStart={(event) => startDrag(key, event)}>{windowContent(key)}</WindowFrame>)}</AnimatePresence>
          </section>
          {store.settings.showSystemPanel && <aside className="right-panel">
            <div className="panel-title"><h2>System pulse</h2><span>LIVE / {String(store.uptime).padStart(2, '0')}s</span></div>
            <Metric label="Core load / simulated" value={values.cpu} barValue={values.cpu} unit="%" />
            <Metric label="Memory lattice / simulated" value={values.ram} barValue={values.ram} unit="%" />
            <Metric label="Storage / simulated" value={values.storage} barValue={values.storage} unit="%" tone="accent" />
            <Metric label="Network / simulated" value={values.network} barValue={values.network} unit=" Mbps" />
            <div className="telemetry-list"><div className="eyebrow">Telemetry</div><div className="telemetry-row"><span>processes</span><span>{store.agents.filter((agent) => agent.status === 'ONLINE').length + 11} active</span></div><div className="telemetry-row"><span>local nodes</span><span>03 online</span></div><div className="telemetry-row"><span>coherence</span><span>92.6%</span></div><div className="telemetry-row"><span>session</span><span>ephemeral</span></div></div>
            <div className="core-readout"><div className="large">NOMINAL</div><small>all local systems responding</small></div>
            <button className="action-button wide-button" onClick={store.runScan}><ScanLine size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 7 }} /> system scan</button>
          </aside>}
          <footer className="bottom-bar">
            <div className="bottom-prompt"><b>WEND://</b><span>{store.scan.active ? 'scanning local system...' : voiceState === 'listening' ? 'listening for a local command...' : 'awaiting your direction'}</span></div>
            <div className="window-tray">{minimizedWindows.map((key) => <button key={key} onClick={() => store.openWindow(key)}>{windowTitles[key].title}</button>)}</div>
            <div className="bottom-meta">CTRL + K&nbsp;&nbsp; COMMAND CENTER</div>
            <button className={`icon-button ${voiceState === 'listening' ? 'listening' : ''}`} onClick={startVoice} aria-label="Start voice command" data-testid="button-voice"><Headphones size={15} /></button>
          </footer>
        </div>
        <div className="notice-stack" aria-live="polite">{store.notices.map((notice) => <div className={`notice ${notice.type}`} key={notice.id} data-testid={`status-notice-${notice.id}`}><strong>{notice.text}</strong>{notice.detail && <small>{notice.detail}</small>}</div>)}</div>
      </main>
    </KeyboardControls>
  );
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