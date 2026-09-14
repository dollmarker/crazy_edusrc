/**
 * 全局状态服务
 *
 * 设计要点（这也是 v1.0「点击不流畅」的根因修复）：
 * 设置、语法库、已执行记录全部在启动时一次性读入内存，
 * 点击语法按钮时**同步**取用，不再 await chrome.storage，
 * 因此 window.open 仍在用户手势上下文内，不会被弹窗拦截，也没有延迟感。
 */

import { BUILTIN_DORKS } from '../constants/dorks';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants/defaults';
import { storage } from './storage';
import { mergeDorkLibrary } from './dorkLibrary';
import type { Dork, PanelPos, Settings, Theme, VisitedMap } from '../types';

export type StateKey = 'settings' | 'dorks' | 'visited' | 'pos';

type Listener = (key: StateKey) => void;

class StateService {
  settings: Settings = { ...DEFAULT_SETTINGS };
  dorks: Dork[] = BUILTIN_DORKS.map(d => ({ ...d, engineSettings: { ...d.engineSettings } }));
  visited: VisitedMap = {};
  pos: PanelPos | null = null;

  private listeners = new Set<Listener>();
  private hydrated = false;

  /** 启动时读取一次全部状态，并补齐内置语法（新增的内置语法会自动出现） */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;

    const data = await storage.getMany([
      STORAGE_KEYS.settings,
      STORAGE_KEYS.dorks,
      STORAGE_KEYS.visited,
      STORAGE_KEYS.panelPos
    ]);

    this.settings = { ...DEFAULT_SETTINGS, ...((data[STORAGE_KEYS.settings] as Partial<Settings>) || {}) };
    this.visited = (data[STORAGE_KEYS.visited] as VisitedMap) || {};
    this.pos = (data[STORAGE_KEYS.panelPos] as PanelPos) || null;

    this.dorks = mergeDorkLibrary(data[STORAGE_KEYS.dorks] as Dork[] | undefined);

    this.subscribeStorage();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(key: StateKey): void {
    this.listeners.forEach(fn => fn(key));
  }

  /** 局部更新设置：合并写回，绝不覆盖未提及的字段 */
  patchSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    void storage.set(STORAGE_KEYS.settings, this.settings);
    this.emit('settings');
  }

  async saveDorks(): Promise<void> {
    await storage.set(STORAGE_KEYS.dorks, this.dorks);
    this.emit('dorks');
  }

  // ===== 已执行记录 =====
  isVisited(domain: string, dorkId: string): boolean {
    if (!this.settings.showVisitedMarks) return false;
    return (this.visited[domain] || []).includes(dorkId);
  }

  visitedCount(domain: string): number {
    return (this.visited[domain] || []).length;
  }

  markVisited(domain: string, dorkId: string): void {
    if (!domain) return;
    const list = this.visited[domain] || [];
    if (list.includes(dorkId)) return;
    this.visited[domain] = [...list, dorkId];
    void storage.set(STORAGE_KEYS.visited, this.visited);
  }

  clearVisited(domain?: string): void {
    if (domain) delete this.visited[domain];
    else this.visited = {};
    void storage.set(STORAGE_KEYS.visited, this.visited);
    this.emit('visited');
  }

  // ===== 面板位置 =====
  savePos(pos: PanelPos): void {
    this.pos = pos;
    void storage.set(STORAGE_KEYS.panelPos, pos);
  }

  // ===== 主题 =====
  resolveTheme(): Theme {
    if (this.settings.followSystemTheme && this.settings.theme === 'light') {
      const dark = typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (dark) return 'dark';
    }
    return this.settings.theme;
  }

  /** 监听其他页面（选项页 / popup）的修改，保持多标签同步 */
  private subscribeStorage(): void {
    storage.onChanged(changes => {
      if (changes[STORAGE_KEYS.settings]) {
        this.settings = { ...DEFAULT_SETTINGS, ...(changes[STORAGE_KEYS.settings].newValue as Partial<Settings> || {}) };
        this.emit('settings');
      }
      if (changes[STORAGE_KEYS.dorks]) {
        this.dorks = mergeDorkLibrary(changes[STORAGE_KEYS.dorks].newValue as Dork[] | undefined);
        this.emit('dorks');
      }
      if (changes[STORAGE_KEYS.visited]) {
        this.visited = (changes[STORAGE_KEYS.visited].newValue as VisitedMap) || {};
        this.emit('visited');
      }
    });
  }
}

export const appState = new StateService();
