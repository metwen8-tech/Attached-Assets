import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type PanelKey,
  type ScanState,
  type VirtualFile,
  type WendAgent,
  type WendMemory,
  type WendNotice,
  type WendSettings,
  type WendWindow,
  type WindowKey,
  type NoticeType,
  type OrbState,
} from '@/types/wend';

const STORAGE_VERSION = 2;
const storagePrefix = 'wend:metellus:v2:';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${storagePrefix}${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { version?: number; data?: T };
    return parsed.version === STORAGE_VERSION && parsed.data !== undefined
      ? parsed.data
      : fallback;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(
      `${storagePrefix}${key}`,
      JSON.stringify({ version: STORAGE_VERSION, data: value }),
    );
  } catch {
    // The UI remains usable in session memory when storage is blocked.
  }
}

const defaultSettings: WendSettings = {
  theme: 'dark',
  particles: true,
  grid: true,
  glow: true,
  animations: true,
  performance: 'medium',
  sidebarExpanded: false,
  showSystemPanel: true,
  showClock: true,
  debug: false,
};

const defaultWindows: Record<WindowKey, WendWindow> = {
  terminal: { open: false, minimized: false, maximized: false, x: 148, y: 88, z: 1 },
  files: { open: false, minimized: false, maximized: false, x: 176, y: 112, z: 2 },
  agents: { open: false, minimized: false, maximized: false, x: 204, y: 136, z: 3 },
  memory: { open: false, minimized: false, maximized: false, x: 232, y: 160, z: 4 },
  system: { open: false, minimized: false, maximized: false, x: 260, y: 184, z: 5 },
  settings: { open: false, minimized: false, maximized: false, x: 288, y: 208, z: 6 },
  notifications: { open: false, minimized: false, maximized: false, x: 316, y: 232, z: 7 },
  network: { open: false, minimized: false, maximized: false, x: 344, y: 256, z: 8 },
};

const defaultFiles: VirtualFile[] = [
  { id: 'root', name: 'WEND', kind: 'folder', parentId: null, modified: 'now', size: '--' },
  ...['Projects', 'Documents', 'Code', 'AI', 'Media', 'System'].map((name, index) => ({
    id: `folder-${name.toLowerCase()}`,
    name,
    kind: 'folder' as const,
    parentId: 'root',
    modified: index === 0 ? 'now' : 'today',
    size: '--',
  })),
  { id: 'file-field-notes', name: 'field-notes.wnd', kind: 'file', parentId: 'folder-documents', content: 'A quiet interface for thinking inside the system.', modified: '4m ago', size: '12.4 KB' },
  { id: 'file-manifest', name: 'manifest.json', kind: 'file', parentId: 'folder-system', content: '{ "mode": "local", "safe": true }', modified: 'read only', size: '8.8 KB' },
  { id: 'file-atlas', name: 'atlas.profile', kind: 'file', parentId: 'folder-ai', content: 'Synthesis / ready', modified: 'online', size: '3.1 KB' },
  { id: 'file-nodes', name: 'local-nodes.map', kind: 'file', parentId: 'folder-media', content: 'METELLUS loopback / 127.0.0.1', modified: 'simulated', size: '2.0 KB' },
];

const defaultAgents: WendAgent[] = [
  { id: 'nexus', name: 'NEXUS', description: 'General intelligence and synthesis', status: 'ONLINE', level: 86, lastActivity: 'standing by' },
  { id: 'sigma', name: 'SIGMA', description: 'Coding intelligence and systems', status: 'ONLINE', level: 74, lastActivity: 'watching the code field' },
  { id: 'phantom', name: 'PHANTOM', description: 'Voice intelligence and listening', status: 'STANDBY', level: 41, lastActivity: 'voice channel idle' },
];

const defaultMemories: WendMemory[] = [
  { id: 'memory-wend', title: 'WEND 3D', content: 'Main interface project.', date: 'today', category: 'PROJECT', pinned: true },
  { id: 'memory-local', title: 'Local-first boundary', content: 'Nothing in this prototype reaches the host filesystem or external network.', date: 'today', category: 'SYSTEM', pinned: true },
  { id: 'memory-field', title: 'Field note 001', content: 'The core responds to attention through light, motion, and quiet signal.', date: 'yesterday', category: 'NOTE', pinned: false },
];

const defaultTerminalLines = [
  'METELLUS local shell v0.8.4',
  'Safe mode enabled. No host filesystem access.',
  'Type help to see available commands.',
];

export function useWendStore() {
  const [settings, setSettingsState] = useState(() => readStored('settings', defaultSettings));
  const [files, setFiles] = useState(() => readStored('files', defaultFiles));
  const [agents, setAgents] = useState(() => readStored('agents', defaultAgents));
  const [memories, setMemories] = useState(() => readStored('memories', defaultMemories));
  const [notificationHistory, setNotificationHistory] = useState<WendNotice[]>(() => readStored('notification-history', []));
  const [windows, setWindows] = useState<Record<WindowKey, WendWindow>>(() => readStored('windows', defaultWindows));
  const [activeWindow, setActiveWindow] = useState<PanelKey>('home');
  const [notices, setNotices] = useState<WendNotice[]>([]);
  const [terminalLines, setTerminalLines] = useState(defaultTerminalLines);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanState>({ active: false, step: 0, health: 98 });
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [startedAt] = useState(() => Date.now());
  const [uptime, setUptime] = useState(0);

  useEffect(() => writeStored('settings', settings), [settings]);
  useEffect(() => writeStored('files', files), [files]);
  useEffect(() => writeStored('agents', agents), [agents]);
  useEffect(() => writeStored('memories', memories), [memories]);
  useEffect(() => writeStored('notification-history', notificationHistory.slice(-60)), [notificationHistory]);
  useEffect(() => writeStored('windows', windows), [windows]);
  useEffect(() => {
    const timer = window.setInterval(() => setUptime(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const pulseOrb = useCallback((state: OrbState, duration = 1600) => {
    setOrbState(state);
    window.setTimeout(() => setOrbState('idle'), duration);
  }, []);

  const notify = useCallback((text: string, detail?: string, type: NoticeType = 'info') => {
    const notice: WendNotice = {
      id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
      text,
      detail,
      type,
      timestamp: new Date().toISOString(),
    };
    setNotices((current) => [...current.slice(-3), notice]);
    setNotificationHistory((current) => [...current, notice].slice(-60));
    pulseOrb(type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'processing');
    window.setTimeout(() => setNotices((current) => current.filter((item) => item.id !== notice.id)), 4400);
  }, [pulseOrb]);

  const updateSettings = useCallback((patch: Partial<WendSettings>) => {
    setSettingsState((current) => ({ ...current, ...patch }));
  }, []);

  const focusWindow = useCallback((key: WindowKey) => {
    setWindows((current) => {
      const top = Math.max(...Object.values(current).map((window) => window.z), 0) + 1;
      return { ...current, [key]: { ...current[key], z: top, minimized: false } };
    });
    setActiveWindow(key);
  }, []);

  const openWindow = useCallback((key: WindowKey) => {
    setWindows((current) => ({ ...current, [key]: { ...current[key], open: true, minimized: false } }));
    focusWindow(key);
  }, [focusWindow]);

  const closeWindow = useCallback((key: WindowKey) => {
    setWindows((current) => ({ ...current, [key]: { ...current[key], open: false, minimized: false } }));
    setActiveWindow('home');
  }, []);

  const closeAllWindows = useCallback(() => {
    setWindows((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, open: false, minimized: false }])) as Record<WindowKey, WendWindow>);
    setActiveWindow('home');
    notify('All windows closed', 'The WEND desktop is ready.', 'success');
  }, [notify]);

  const minimizeWindow = useCallback((key: WindowKey) => {
    setWindows((current) => ({ ...current, [key]: { ...current[key], minimized: true } }));
    setActiveWindow('home');
  }, []);

  const toggleMaximize = useCallback((key: WindowKey) => {
    setWindows((current) => ({ ...current, [key]: { ...current[key], maximized: !current[key].maximized } }));
    focusWindow(key);
  }, [focusWindow]);

  const moveWindow = useCallback((key: WindowKey, x: number, y: number) => {
    setWindows((current) => ({ ...current, [key]: { ...current[key], x: Math.max(12, x), y: Math.max(12, y) } }));
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<VirtualFile>) => {
    setFiles((current) => current.map((file) => file.id === id ? { ...file, ...patch, modified: 'just now' } : file));
  }, []);

  const addFile = useCallback((parentId: string, name: string, kind: VirtualFile['kind']) => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const id = `${kind}-${Date.now()}`;
    setFiles((current) => [...current, { id, name: cleanName, kind, parentId, content: kind === 'file' ? '' : undefined, modified: 'just now', size: kind === 'file' ? '0 KB' : '--' }]);
    return true;
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((current) => {
      const ids = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        current.forEach((file) => {
          if (file.parentId && ids.has(file.parentId) && !ids.has(file.id)) {
            ids.add(file.id);
            changed = true;
          }
        });
      }
      return current.filter((file) => !ids.has(file.id));
    });
  }, []);

  const updateAgent = useCallback((id: string, patch: Partial<WendAgent>) => {
    setAgents((current) => current.map((agent) => agent.id === id ? { ...agent, ...patch } : agent));
  }, []);

  const addMemory = useCallback((memory: Omit<WendMemory, 'id' | 'date' | 'pinned'>) => {
    setMemories((current) => [{ ...memory, id: `memory-${Date.now()}`, date: 'just now', pinned: false }, ...current]);
  }, []);

  const updateMemory = useCallback((id: string, patch: Partial<WendMemory>) => {
    setMemories((current) => current.map((memory) => memory.id === id ? { ...memory, ...patch } : memory));
  }, []);

  const removeMemory = useCallback((id: string) => {
    setMemories((current) => current.filter((memory) => memory.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotices([]);
    setNotificationHistory([]);
  }, []);

  const runScan = useCallback(() => {
    if (scan.active) return;
    setScan({ active: true, step: 0, health: 98 });
    pulseOrb('processing', 3200);
    const steps = ['INITIALIZING', 'CHECKING CORE', 'CHECKING MEMORY', 'CHECKING NETWORK', 'CHECKING INTERFACE', 'FINALIZING'];
    steps.forEach((_, index) => {
      window.setTimeout(() => setScan((current) => ({ ...current, active: index < steps.length - 1, step: index + 1 })), 420 * (index + 1));
    });
    window.setTimeout(() => {
      setScan({ active: false, step: steps.length, health: 98 });
      notify('System scan complete', 'All local interface nodes are nominal.', 'success');
    }, 420 * (steps.length + 1));
  }, [notify, pulseOrb, scan.active]);

  const resetInterface = useCallback(() => {
    setSettingsState(defaultSettings);
    setWindows(defaultWindows);
    setActiveWindow('home');
    notify('Interface reset', 'Persistent settings returned to defaults.', 'success');
  }, [notify]);

  return {
    settings, updateSettings, files, updateFile, addFile, removeFile,
    agents, updateAgent, memories, addMemory, updateMemory, removeMemory,
    notificationHistory, notices, notify, clearNotifications,
    windows, activeWindow, setActiveWindow, openWindow, closeWindow, closeAllWindows,
    minimizeWindow, toggleMaximize, focusWindow, moveWindow,
    terminalLines, setTerminalLines, terminalHistory, setTerminalHistory,
    scan, runScan, orbState, pulseOrb, uptime, resetInterface,
  };
}