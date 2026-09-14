/**
 * 弹窗：只做最常用的几个开关
 * 开关状态写入使用「读取最新值 + 合并」的方式，不会覆盖其他设置字段
 */

import { STORAGE_KEYS } from '../constants/defaults';
import { storage } from '../services/storage';
import { applyIcons } from '../ui/applyIcons';
import { icon } from '../ui/icons';
import type { Settings } from '../types';

type SwitchId = 'swSidebar' | 'swGoogle' | 'swBaidu' | 'swBing' | 'swSensitive';

const SWITCH_FIELD: Record<SwitchId, keyof Settings> = {
  swSidebar: 'sidebarEnabled',
  swGoogle: 'googleEnabled',
  swBaidu: 'baiduEnabled',
  swBing: 'bingEnabled',
  swSensitive: 'sensitiveHighlightEnabled'
};

async function patch(patchData: Partial<Settings>): Promise<void> {
  const current = await storage.getSettings();
  await storage.set(STORAGE_KEYS.settings, { ...current, ...patchData });
}

function toast(message: string, kind: 'ok' | 'err' = 'ok'): void {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind === 'ok' ? 'check' : 'alert', 14)}<span>${message}</span>`;
  box.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 220);
  }, 1600);
}

function bindSwitch(id: SwitchId, initial: boolean): void {
  const el = document.getElementById(id) as HTMLButtonElement | null;
  if (!el) return;
  el.setAttribute('aria-checked', String(initial));
  el.addEventListener('click', async () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', String(next));
    await patch({ [SWITCH_FIELD[id]]: next } as Partial<Settings>);
    toast('已保存');
  });
}

async function init(): Promise<void> {
  applyIcons();

  const settings = await storage.getSettings();
  (Object.keys(SWITCH_FIELD) as SwitchId[]).forEach(id => {
    const field = SWITCH_FIELD[id];
    bindSwitch(id, settings[field] !== false);
  });

  document.documentElement.setAttribute('data-theme', settings.theme === 'dark' ? 'dark' : 'light');
  document.body.setAttribute('data-theme', settings.theme === 'dark' ? 'dark' : 'light');

  const versionEl = document.getElementById('versionText');
  if (versionEl) versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

  document.getElementById('openOptions')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

void init();
