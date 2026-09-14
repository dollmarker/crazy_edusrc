/**
 * 选项页
 *
 * 与 v1.0 的关键差异：
 * - 每个控件即时保存，且保存前先读取最新设置再合并 —— 从结构上杜绝「保存后丢字段」
 * - v1.0 里没有 UI 的 4 个设置项（分组 / 测绘面板 / 敏感高亮 / 批量上限）全部补齐
 * - 语法库支持搜索、分类筛选、分引擎开关、自定义增删、导入导出
 */

import { BUILTIN_DORKS, CATEGORY_META, CATEGORY_NAME } from '../constants/dorks';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants/defaults';
import { mergeDorkLibrary } from '../services/dorkLibrary';
import { storage } from '../services/storage';
import { escapeHtml, exportDorks, parseImportedDorks } from '../services/syntax';
import { applyIcons } from '../ui/applyIcons';
import { icon } from '../ui/icons';
import type { CategoryId, Dork, Engine, Risk, Settings, VisitedMap } from '../types';

let settings: Settings = { ...DEFAULT_SETTINGS };
let dorks: Dork[] = [];

// ==================== 基础设施 ====================

async function loadState(): Promise<void> {
  settings = await storage.getSettings();
  const raw = await storage.get<Dork[]>(STORAGE_KEYS.dorks, BUILTIN_DORKS);
  dorks = mergeDorkLibrary(raw);
}

/** 合并式保存：读最新 -> 覆盖补丁 -> 写回 */
async function patchSettings(patchData: Partial<Settings>): Promise<void> {
  const current = await storage.getSettings();
  settings = { ...current, ...patchData };
  await storage.set(STORAGE_KEYS.settings, settings);
  applyTheme();
}

async function persistDorks(): Promise<void> {
  await storage.set(STORAGE_KEYS.dorks, dorks);
}

function toast(message: string, kind: 'ok' | 'err' = 'ok'): void {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind === 'ok' ? 'check' : 'alert', 14)}<span>${escapeHtml(message)}</span>`;
  box.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 220);
  }, 1800);
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// ==================== 主题 ====================

function applyTheme(): void {
  const dark = settings.theme === 'dark';
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const button = document.getElementById('themeToggle');
  if (button) button.innerHTML = icon(dark ? 'sun' : 'moon', 16);
}

// ==================== 开关 ====================

function bindBoolSwitch(id: string, field: keyof Settings, after?: () => void): void {
  const node = document.getElementById(id) as HTMLButtonElement | null;
  if (!node) return;
  node.setAttribute('aria-checked', String(settings[field] !== false));
  node.addEventListener('click', () => {
    const next = node.getAttribute('aria-checked') !== 'true';
    node.setAttribute('aria-checked', String(next));
    void patchSettings({ [field]: next } as Partial<Settings>).then(() => {
      toast('已保存');
      after?.();
    });
  });
}

function refreshSwitches(): void {
  const map: Array<[string, keyof Settings]> = [
    ['swSidebar', 'sidebarEnabled'],
    ['swAutoMount', 'autoMount'],
    ['swGroup', 'groupByCategory'],
    ['swAsset', 'assetPanelEnabled'],
    ['swSensitive', 'sensitiveHighlightEnabled'],
    ['swVisited', 'showVisitedMarks'],
    ['swGoogle', 'googleEnabled'],
    ['swBaidu', 'baiduEnabled'],
    ['swBing', 'bingEnabled'],
    ['swNewTab', 'openInNewTab'],
    ['swFollowSystem', 'followSystemTheme']
  ];
  map.forEach(([id, field]) => {
    document.getElementById(id)?.setAttribute('aria-checked', String(settings[field] !== false));
  });
  document.getElementById('swDark')?.setAttribute('aria-checked', String(settings.theme === 'dark'));
}

// ==================== 语法库 ====================

function initCategorySelects(): void {
  const options = CATEGORY_META.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  el<HTMLSelectElement>('dorkFilter').innerHTML = `<option value="all">全部分类</option>${options}`;
  el<HTMLSelectElement>('newCategory').innerHTML = options;
}

function renderDorkList(): void {
  const keyword = el<HTMLInputElement>('dorkSearch').value.trim().toLowerCase();
  const category = el<HTMLSelectElement>('dorkFilter').value;
  const engine = el<HTMLSelectElement>('dorkEngine').value as Engine | 'all';

  const filtered = dorks.filter(d => {
    if (keyword && !(d.name.toLowerCase().includes(keyword) || d.template.toLowerCase().includes(keyword))) return false;
    if (category !== 'all' && d.category !== category) return false;
    if (engine !== 'all' && d.engineSettings[engine] === false) return false;
    return true;
  });

  const builtinCount = dorks.filter(d => d.builtin).length;
  const customCount = dorks.length - builtinCount;
  const enabledCount = dorks.filter(d => d.enabled !== false).length;

  el('dorkStats').innerHTML = `
    <div>内置 <b>${builtinCount}</b> 条</div>
    <div>自定义 <b>${customCount}</b> 条</div>
    <div>已启用 <b>${enabledCount}</b> 条</div>
    <div>当前筛选 <b>${filtered.length}</b> 条</div>
  `;

  const list = el('dorkList');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty">没有匹配的语法</div>';
    return;
  }

  list.innerHTML = filtered
    .map(d => {
      const pill = (target: Engine, text: string) =>
        `<button class="engine-pill" data-engine="${target}" aria-pressed="${d.engineSettings[target] !== false}" title="${target}">${text}</button>`;
      return `
        <div class="dork-row" data-id="${escapeHtml(d.id)}">
          <div class="name">
            <b>${escapeHtml(d.name)}${d.builtin ? '' : ' <span class="chip">自定义</span>'}</b>
            <code title="${escapeHtml(d.template)}">${escapeHtml(d.template)}</code>
          </div>
          <span class="chip ${d.risk}">${CATEGORY_NAME[d.category] ?? d.category} · ${d.risk}</span>
          <div class="engine-toggles">${pill('google', 'G')}${pill('baidu', '百')}${pill('bing', 'B')}</div>
          <button class="sw" data-enable role="switch" aria-checked="${d.enabled !== false}" title="启用 / 停用"></button>
          ${d.builtin ? '' : '<button class="btn danger sm" data-del title="删除">删除</button>'}
        </div>`;
    })
    .join('');
}

function bindDorkList(): void {
  el('dorkList').addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const row = target.closest('.dork-row') as HTMLElement | null;
    if (!row) return;
    const dork = dorks.find(d => d.id === row.dataset.id);
    if (!dork) return;

    const enginePill = target.closest('[data-engine]') as HTMLElement | null;
    if (enginePill) {
      const engine = enginePill.getAttribute('data-engine') as Engine;
      const next = enginePill.getAttribute('aria-pressed') !== 'true';
      dork.engineSettings = { ...dork.engineSettings, [engine]: next };
      enginePill.setAttribute('aria-pressed', String(next));
      void persistDorks();
      return;
    }

    if (target.closest('[data-enable]')) {
      dork.enabled = dork.enabled === false;
      target.closest('[data-enable]')!.setAttribute('aria-checked', String(dork.enabled));
      void persistDorks();
      renderDorkList();
      return;
    }

    if (target.closest('[data-del]')) {
      dorks = dorks.filter(d => d.id !== dork.id);
      void persistDorks();
      renderDorkList();
      toast('已删除');
    }
  });

  el<HTMLInputElement>('dorkSearch').addEventListener('input', renderDorkList);
  el<HTMLSelectElement>('dorkFilter').addEventListener('change', renderDorkList);
  el<HTMLSelectElement>('dorkEngine').addEventListener('change', renderDorkList);
}

function bindAddDork(): void {
  el('addDork').addEventListener('click', () => {
    const name = el<HTMLInputElement>('newName').value.trim();
    const template = el<HTMLInputElement>('newTemplate').value.trim();
    const category = el<HTMLSelectElement>('newCategory').value as CategoryId;
    const risk = el<HTMLSelectElement>('newRisk').value as Risk;

    if (!name || !template) {
      toast('名称与模板都不能为空', 'err');
      return;
    }
    if (!template.includes('{target_domain}')) {
      toast('模板必须包含 {target_domain}', 'err');
      return;
    }

    dorks = [
      ...dorks,
      {
        id: `custom_${Date.now()}`,
        name: name.slice(0, 60),
        template: template.slice(0, 500),
        risk,
        category,
        builtin: false,
        enabled: true,
        engineSettings: { google: true, baidu: true, bing: true }
      }
    ];
    void persistDorks();
    el<HTMLInputElement>('newName').value = '';
    el<HTMLInputElement>('newTemplate').value = '';
    renderDorkList();
    toast('已添加');
  });
}

function bindImportExport(): void {
  el('exportDorks').addEventListener('click', () => {
    const blob = new Blob([exportDorks(dorks)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crazyedusrc-dorks-${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    toast('已导出');
  });

  const fileInput = el<HTMLInputElement>('importFile');
  el('importDorks').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { imported, errors } = parseImportedDorks(text);

    if (imported.length === 0) {
      toast(errors[0] || '没有可导入的语法', 'err');
      return;
    }

    const existing = new Set(dorks.map(d => d.id));
    const deduped = imported.map(d => (existing.has(d.id) ? { ...d, id: `${d.id}_${Date.now()}` } : d));
    dorks = [...dorks, ...deduped];
    await persistDorks();
    renderDorkList();
    toast(`已导入 ${deduped.length} 条${errors.length ? `，跳过 ${errors.length} 条` : ''}`);
    fileInput.value = '';
  });
}

// ==================== 绑定 ====================

function bindSections(): void {
  document.querySelectorAll<HTMLElement>('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('is-active', n === item));
      document.querySelectorAll('.section').forEach(s => s.classList.toggle('is-active', s.id === section));
    });
  });
}

function bindFields(): void {
  const limit = el<HTMLInputElement>('batchLimit');
  limit.addEventListener('change', () => {
    const value = Math.min(20, Math.max(1, Number(limit.value) || 5));
    limit.value = String(value);
    void patchSettings({ batchTabLimit: value }).then(() => toast('已保存'));
  });

  const delay = el<HTMLInputElement>('batchDelay');
  delay.addEventListener('change', () => {
    const value = Math.min(10000, Math.max(300, Number(delay.value) || 1200));
    delay.value = String(value);
    void patchSettings({ batchDelayMs: value }).then(() => toast('已保存'));
  });

  document.querySelectorAll<HTMLInputElement>('input[name="urlAction"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        void patchSettings({ urlClickAction: radio.value === 'open' ? 'open' : 'copy' }).then(() => toast('已保存'));
      }
    });
  });

  const blacklist = el<HTMLTextAreaElement>('urlBlacklist');
  blacklist.addEventListener('change', () => {
    const list = blacklist.value.split('\n').map(l => l.trim()).filter(Boolean);
    void patchSettings({ urlBlacklist: list }).then(() => toast(`已保存 ${list.length} 条规则`));
  });

  el('themeToggle').addEventListener('click', () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    void patchSettings({ theme: next, followSystemTheme: false }).then(() => {
      refreshSwitches();
      toast(next === 'dark' ? '已切换深色' : '已切换浅色');
    });
  });

  const darkSwitch = el('swDark');
  darkSwitch.addEventListener('click', () => {
    const next = darkSwitch.getAttribute('aria-checked') !== 'true';
    darkSwitch.setAttribute('aria-checked', String(next));
    void patchSettings({ theme: next ? 'dark' : 'light' }).then(() => toast('已保存'));
  });

  el('clearVisited').addEventListener('click', async () => {
    await storage.set(STORAGE_KEYS.visited, {} as VisitedMap);
    toast('已清空执行记录');
  });

  el('resetSettings').addEventListener('click', async () => {
    const customOnly = dorks.filter(d => !d.builtin);
    dorks = mergeDorkLibrary(customOnly);
    await persistDorks();
    settings = { ...DEFAULT_SETTINGS };
    await storage.set(STORAGE_KEYS.settings, settings);
    syncUiFromSettings();
    renderDorkList();
    toast('已恢复默认');
  });
}

function syncUiFromSettings(): void {
  refreshSwitches();
  applyTheme();
  el<HTMLInputElement>('batchLimit').value = String(settings.batchTabLimit);
  el<HTMLInputElement>('batchDelay').value = String(settings.batchDelayMs);
  el<HTMLTextAreaElement>('urlBlacklist').value = settings.urlBlacklist.join('\n');
  document.querySelectorAll<HTMLInputElement>('input[name="urlAction"]').forEach(radio => {
    radio.checked = radio.value === settings.urlClickAction;
  });
}

async function init(): Promise<void> {
  applyIcons();
  await loadState();

  initCategorySelects();
  bindSections();
  bindFields();
  bindDorkList();
  bindAddDork();
  bindImportExport();

  bindBoolSwitch('swSidebar', 'sidebarEnabled');
  bindBoolSwitch('swAutoMount', 'autoMount');
  bindBoolSwitch('swGroup', 'groupByCategory');
  bindBoolSwitch('swAsset', 'assetPanelEnabled');
  bindBoolSwitch('swSensitive', 'sensitiveHighlightEnabled');
  bindBoolSwitch('swVisited', 'showVisitedMarks');
  bindBoolSwitch('swGoogle', 'googleEnabled');
  bindBoolSwitch('swBaidu', 'baiduEnabled');
  bindBoolSwitch('swBing', 'bingEnabled');
  bindBoolSwitch('swNewTab', 'openInNewTab');
  bindBoolSwitch('swFollowSystem', 'followSystemTheme', applyTheme);

  syncUiFromSettings();
  renderDorkList();

  const manifest = chrome.runtime.getManifest();
  el('versionText').textContent = `v${manifest.version}`;
  el('aboutVersion').textContent = `v${manifest.version}`;
  const homepage = manifest.homepage_url || '#';
  el<HTMLAnchorElement>('githubLink').href = homepage;
  el<HTMLAnchorElement>('aboutGithub').href = homepage;
}

void init();
