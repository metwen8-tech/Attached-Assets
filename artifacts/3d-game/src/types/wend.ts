export type PanelKey =
  | 'home'
  | 'system'
  | 'files'
  | 'terminal'
  | 'agents'
  | 'memory'
  | 'network'
  | 'settings'
  | 'notifications';

export type WindowKey = Exclude<PanelKey, 'home'>;
export type Theme = 'dark' | 'light' | 'cyber' | 'minimal';
export type PerformanceMode = 'low' | 'medium' | 'high';
export type NoticeType = 'info' | 'success' | 'warning' | 'error';
export type OrbState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'success'
  | 'warning'
  | 'error';

export type WendSettings = {
  theme: Theme;
  particles: boolean;
  grid: boolean;
  glow: boolean;
  animations: boolean;
  performance: PerformanceMode;
  sidebarExpanded: boolean;
  showSystemPanel: boolean;
  showClock: boolean;
  debug: boolean;
};

export type WendWindow = {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  z: number;
};

export type VirtualFile = {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  parentId: string | null;
  content?: string;
  modified: string;
  size: string;
};

export type WendAgent = {
  id: string;
  name: string;
  description: string;
  status: 'ONLINE' | 'STANDBY' | 'OFFLINE';
  level: number;
  lastActivity: string;
};

export type WendMemory = {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'PROJECT' | 'NOTE' | 'KNOWLEDGE' | 'SYSTEM';
  pinned: boolean;
};

export type WendNotice = {
  id: string;
  text: string;
  detail?: string;
  type: NoticeType;
  timestamp: string;
};

export type ScanState = {
  active: boolean;
  step: number;
  health: number;
};