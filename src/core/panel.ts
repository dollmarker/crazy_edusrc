/**
 * 猎洞面板（Shadow DOM 隔离）
 *
 * 设计要点：
 * 1. 白底 + 细边框 + 大圆角，只对 transform / opacity / background-color 做过渡
 * 2. 全部 UI 在 Shadow DOM 内，宿主页面样式打不进来，也污染不出去
 * 3. 点击语法按钮完全同步：设置早已在内存里，直接 window.open（无 await、无延迟、不被拦截）
 * 4. 事件用一根委托监听器，不再给每个按钮挂 listener
 */

import panelCss from '../styles/panel.css';
import { ASSET_MODES, EXTRA_SOURCES, PLATFORMS, buildAssetUrl, supportsMode } from '../services/assetSearch';
import { CATEGORY_META, CATEGORY_NAME, GLOBAL_QUERIES } from '../constants/dorks';
import { appState } from '../services/state';
import { escapeHtml, fillTemplate, filterByEngine, highRisk, search } from '../services/syntax';
import { extractUrls, type ExtractDiagnostics } from '../services/urlExtractor';
import { BatchRunner, type BatchItem } from './batch';
import { ENGINES } from './engine';
import { icon } from '../ui/icons';
import { createToaster } from '../ui/toast';
import type { AssetMode, CategoryId, Dork, Engine, ExtractedUrl, PanelTab, Risk } from '../types';

export interface PanelOptions {
  engine: Engine;
  target: string;
  onOpenOptions: () => void;
  onRequestClose: () => void;
}

const RISK_TEXT: Record<Risk, string> = { high: 'high', medium: 'mid', low: 'low', info: 'info' };

export class Panel {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private root!: HTMLElement;
  private notify!: ReturnType<typeof createToaster>;
  private unsubscribe: (() => void) | null = null;

  private engine: Engine;
  private target: string;

  private keyword = '';
  private category: CategoryId | 'all' = 'all';
  private globalMode = false;
  private urls: ExtractedUrl[] = [];
  private urlStats = '';
  private diag: ExtractDiagnostics | null = null;
  private assetMode: AssetMode = 'domain';
  private assetKeyword = '';
  private urlsLoaded = false;

  private batch = new BatchRunner();
  private collapsed = false;
  private destroyed = false;
  private pill: HTMLElement | null = null;

  constructor(private options: PanelOptions) {
    this.engine = options.engine;
    this.target = options.target;
    this.host = document.createElement('div');
    this.host.id = 'ces-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });
  }

  // ==================== 挂载 ====================

  mount(): void {
    const style = document.createElement('style');
    style.textContent = panelCss;
    this.shadow.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'ces-root';
    this.root.innerHTML = this.template();
    this.shadow.appendChild(this.root);

    // 宿主挂到页面上（内容脚本在 document_end 执行，body 一定已存在）
    const parent = document.body || document.documentElement;
    parent.appendChild(this.host);

    this.notify = createToaster(this.query('[data-role="toasts"]') as HTMLElement);

    this.positionHost();
    this.applyTheme();
    this.renderTarget();
    this.renderCats();
    this.renderModes();
    this.renderPlatforms();
    this.renderExtras();
    this.renderDorks();
    this.renderUrlPane();
    this.renderAssetQuery();
    this.wire();

    this.unsubscribe = appState.subscribe(key => {
      if (this.destroyed) return;
      if (key === 'settings') {
        this.applyTheme();
        this.renderCats();
        this.renderDorks();
        this.renderUrlPane();
      }
      if (key === 'dorks') this.renderDorks();
      if (key === 'visited') this.renderDorks();
    });
  }

  /** 当前激活的标签页 */
  switchTab(tab: PanelTab): void {
    this.queryAll('[data-tab]').forEach(el => {
      el.classList.toggle('is-active', el.getAttribute('data-tab') === tab);
    });
    this.queryAll('[data-pane]').forEach(el => {
      el.classList.toggle('is-active', el.getAttribute('data-pane') === tab);
    });
  }

  toggleCollapse(): void {
    if (this.collapsed) this.expand();
    else this.collapse();
  }

  /** 供快捷键调用 */
  triggerHighRisk(): void {
    const button = this.query('[data-act="run-high"]') as HTMLElement | null;
    if (button) {
      this.switchTab('dorks');
      this.runHighRisk(button);
    }
  }

  /** 供快捷键调用 */
  triggerExtract(): void {
    this.switchTab('urls');
    this.loadUrls(false);
  }

  destroy(): void {
    this.destroyed = true;
    this.batch.stop();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.host.remove();
  }

  get element(): HTMLElement {
    return this.host;
  }

  /** 位于面板外的宿主定位：用 !important 顶掉页面可能存在的 div 通用样式 */
  private positionHost(): void {
    const pos = appState.pos;
    const style = this.host.style;
    style.setProperty('all', 'initial', 'important');
    style.setProperty('position', 'fixed', 'important');
    style.setProperty('z-index', '2147483646', 'important');
    style.setProperty('top', `${pos ? pos.y : 84}px`, 'important');
    style.setProperty('right', pos ? 'auto' : '18px', 'important');
    style.setProperty('left', pos ? `${pos.x}px` : 'auto', 'important');
    style.setProperty('display', 'block', 'important');
    style.setProperty('margin', '0', 'important');
  }

  private clampPosition(x: number, y: number): { x: number; y: number } {
    const width = this.host.offsetWidth || 344;
    const height = this.host.offsetHeight || 420;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - Math.min(height, window.innerHeight - 16) - 8);
    return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
  }

  private applyTheme(): void {
    this.root.setAttribute('data-theme', appState.resolveTheme());
  }

  private query<T extends Element = HTMLElement>(selector: string): T | null {
    return this.root.querySelector(selector) as T | null;
  }

  private queryAll<T extends Element = HTMLElement>(selector: string): T[] {
    return Array.from(this.root.querySelectorAll(selector)) as T[];
  }

  // ==================== 模板 ====================

  private version(): string {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return '2.0.0';
    }
  }

  private homepage(): string {
    try {
      return chrome.runtime.getManifest().homepage_url || '#';
    } catch {
      return '#';
    }
  }

  private template(): string {
    return `
      <header class="ces-head" data-role="drag">
        <div class="ces-brand">${icon('logo', 15)}<span>crazyedusrc</span><em>v${this.version()}</em></div>
        <div class="ces-actions">
          <button class="ces-iconbtn" data-act="collapse" title="收起为悬浮球 (Esc)">${icon('collapse')}</button>
          <button class="ces-iconbtn" data-act="options" title="设置">${icon('sliders')}</button>
          <button class="ces-iconbtn" data-act="close" title="关闭">${icon('close')}</button>
        </div>
      </header>

      <div class="ces-target" data-role="target"></div>

      <nav class="ces-tabs">
        <button class="ces-tab is-active" data-tab="dorks">语法<em data-role="count-dorks"></em></button>
        <button class="ces-tab" data-tab="urls">URL<em data-role="count-urls"></em></button>
        <button class="ces-tab" data-tab="assets">测绘</button>
      </nav>

      <div class="ces-body">
        <section class="ces-pane is-active" data-pane="dorks">
          <div class="ces-search">
            ${icon('search', 14)}
            <input data-role="search" type="text" placeholder="搜索语法" />
            <kbd>/</kbd>
          </div>
          <div class="ces-cats" data-role="cats"></div>
          <div class="ces-toolbar">
            <button class="ces-btn is-accent" data-act="run-high">${icon('bolt', 13)}一键跑高危</button>
            <button class="ces-btn" data-act="global">${icon('globe', 13)}跨校猎洞</button>
          </div>
          <div class="ces-progress" data-role="progress"><i></i></div>
          <div data-role="global-banner"></div>
          <div data-role="dork-list"></div>
        </section>

        <section class="ces-pane" data-pane="urls">
          <div class="ces-urlbar">
            <button class="ces-btn is-primary" data-act="extract">${icon('refresh', 13)}提取本页 URL</button>
            <button class="ces-iconbtn" data-act="copy-all" title="复制全部">${icon('copy', 15)}</button>
            <button class="ces-iconbtn" data-act="export" title="导出 CSV">${icon('download', 15)}</button>
          </div>
          <p class="ces-hint" data-role="url-stats"></p>
          <div data-role="url-list"></div>
        </section>

        <section class="ces-pane" data-pane="assets">
          <div class="ces-section-title">${icon('filter', 12)}查询模式</div>
          <div class="ces-modes" data-role="modes"></div>
          <p class="ces-hint" data-role="mode-hint"></p>
          <div class="ces-field" data-role="keyword-wrap" hidden>
            <input data-role="keyword" type="text" placeholder="组件名 / 单位名" />
          </div>
          <div class="ces-section-title">${icon('radar', 12)}测绘平台</div>
          <div class="ces-platforms" data-role="platforms"></div>
          <div class="ces-query" data-role="query"></div>
          <div class="ces-section-title">${icon('link', 12)}扩展侦察</div>
          <div class="ces-links" data-role="extras"></div>
        </section>
      </div>

      <div class="ces-toasts" data-role="toasts"></div>

      <footer class="ces-foot">
        <span>v${this.version()} · 仅限授权范围</span>
        <a href="#" data-act="clear-visited" title="清空当前域名的已执行标记">${icon('trash', 12)}</a>
        <a href="${this.homepage()}" target="_blank" rel="noopener noreferrer">${icon('github', 12)}GitHub</a>
      </footer>
    `;
  }

  // ==================== 渲染 ====================

  private renderTarget(): void {
    const wrap = this.query('[data-role="target"]') as HTMLElement;
    if (this.target) {
      wrap.innerHTML = `
        <span class="ces-target-label">${icon('target', 12)}目标</span>
        <span class="ces-target-value" title="${escapeHtml(this.target)}">${escapeHtml(this.target)}</span>
        <button class="ces-iconbtn" data-act="copy-target" title="复制域名">${icon('copy', 14)}</button>
      `;
    } else {
      wrap.innerHTML = `
        <span class="ces-target-label">${icon('target', 12)}目标</span>
        <div class="ces-field" style="flex:1;min-width:0">
          <input data-role="target-input" type="text" placeholder="输入目标域名，如 pku.edu.cn" />
        </div>
      `;
    }
  }

  setTarget(domain: string): void {
    if (domain === this.target) return;
    this.target = domain;
    this.renderTarget();
    this.renderDorks();
    this.renderAssetQuery();
  }

  getTarget(): string {
    return this.target;
  }

  private renderCats(): void {
    const wrap = this.query('[data-role="cats"]') as HTMLElement;
    if (!appState.settings.groupByCategory) {
      wrap.innerHTML = '';
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const items: Array<{ id: CategoryId | 'all'; name: string }> = [
      { id: 'all', name: '全部' },
      ...CATEGORY_META.map(m => ({ id: m.id as CategoryId | 'all', name: m.name }))
    ];
    wrap.innerHTML = items
      .map(item => `<button class="ces-cat${this.category === item.id ? ' is-active' : ''}" data-cat="${item.id}">${item.name}</button>`)
      .join('');
  }

  private currentDorks(): Dork[] {
    const all = filterByEngine(appState.dorks, this.engine);
    const filtered = search(all, this.keyword);
    if (this.category === 'all') return filtered;
    return filtered.filter(d => d.category === this.category);
  }

  private renderDorks(): void {
    const list = this.query('[data-role="dork-list"]') as HTMLElement;
    const banner = this.query('[data-role="global-banner"]') as HTMLElement;
    const countEl = this.query('[data-role="count-dorks"]') as HTMLElement;

    if (this.globalMode) {
      banner.innerHTML = `
        <div class="ces-urlbar" style="margin-bottom:8px">
          <span class="ces-stats" style="font-size:11px;color:var(--ces-text-3)">跨校模式：直接搜全量 edu.cn 资产</span>
          <button class="ces-btn" data-act="global" style="flex:0 0 auto;padding:0 10px">${icon('expand', 12)}退出</button>
        </div>
      `;
      // .ces-stats 只在 .ces-urlbar 内生效，这里补一层行内兜底
      countEl.textContent = String(GLOBAL_QUERIES.length);
      list.innerHTML = `
        <div class="ces-group">
          <div class="ces-group-head"><span>全局高危语法</span><em>${GLOBAL_QUERIES.length}</em></div>
          ${GLOBAL_QUERIES.map(q => `
            <button class="ces-dork" data-global-id="${q.id}" title="${escapeHtml(q.template)}">
              <span class="ces-dot is-high"></span>
              <span class="ces-dork-name">${escapeHtml(q.name)}</span>
              ${icon('external', 12)}
            </button>`).join('')}
        </div>
      `;
      return;
    }

    banner.innerHTML = '';

    const dorks = this.currentDorks();
    countEl.textContent = String(dorks.length);

    if (dorks.length === 0) {
      list.innerHTML = `
        <div class="ces-empty">
          ${icon('search', 26)}
          <p>没有匹配的语法<br />试试清空搜索词或切换分类</p>
        </div>`;
      return;
    }

    if (appState.settings.groupByCategory && this.category === 'all') {
      list.innerHTML = CATEGORY_META
        .map(meta => {
          const items = dorks.filter(d => d.category === meta.id);
          if (items.length === 0) return '';
          return `
            <div class="ces-group">
              <div class="ces-group-head"><span>${meta.name}</span><em>${items.length}</em></div>
              ${items.map(d => this.dorkHtml(d)).join('')}
            </div>`;
        })
        .join('');
      return;
    }

    list.innerHTML = `<div class="ces-group">${dorks.map(d => this.dorkHtml(d)).join('')}</div>`;
  }

  private dorkHtml(dork: Dork): string {
    const visited = this.target ? appState.isVisited(this.target, dork.id) : false;
    const cat = this.category === 'all' && !appState.settings.groupByCategory ? `${CATEGORY_NAME[dork.category]} · ` : '';
    return `
      <button class="ces-dork${visited ? ' is-visited' : ''}" data-dork-id="${dork.id}"
        title="${escapeHtml(cat + dork.template)}">
        <span class="ces-dot is-${dork.risk}"></span>
        <span class="ces-dork-name">${escapeHtml(dork.name)}</span>
        <span class="ces-chip is-${dork.risk}">${RISK_TEXT[dork.risk]}</span>
        <span class="ces-check">${icon('check', 13)}</span>
      </button>`;
  }

  private renderUrlPane(): void {
    const listEl = this.query('[data-role="url-list"]') as HTMLElement;
    const statsEl = this.query('[data-role="url-stats"]') as HTMLElement;
    const countEl = this.query('[data-role="count-urls"]') as HTMLElement;
    countEl.textContent = this.urls.length ? String(this.urls.length) : '';

    statsEl.textContent = this.urlStats;

    if (!this.urlsLoaded) {
      listEl.innerHTML = `
        <div class="ces-empty">
          ${icon('link', 26)}
          <p>点击上方按钮提取当前搜索结果页的 URL<br />敏感目标会按危险程度标色</p>
        </div>`;
      return;
    }

    if (this.urls.length === 0) {
      const d = this.diag;
      const detail = d
        ? `扫描 ${d.scanned} 个链接 · 排除容器 ${d.byExcluded} · 引擎自身 ${d.byEngine} · 黑名单 ${d.byBlacklist}`
        : '';
      listEl.innerHTML = `
        <div class="ces-empty">
          ${icon('alert', 26)}
          <p>没有提取到 URL</p>
          ${detail ? `<p class="ces-diag">${escapeHtml(detail)}</p>` : ''}
          <button class="ces-btn" data-act="extract-wide" style="flex:0 0 auto;padding:0 12px">
            ${icon('search', 13)}强制全页扫描
          </button>
        </div>`;
      return;
    }

    const highlight = appState.settings.sensitiveHighlightEnabled;
    listEl.innerHTML = this.urls
      .map(item => {
        const level = highlight && item.level ? item.level : null;
        const tags = level
          ? `<div class="ces-url-tags">${item.labels.map(l => `<span class="ces-tag is-${level}">${escapeHtml(l)}</span>`).join('')}</div>`
          : '';
        return `
          <button class="ces-url${level ? ` is-${level}` : ''}" data-url="${escapeHtml(item.url)}" title="点击复制 / 可切换为打开">
            ${tags}
            <span class="ces-url-text">${escapeHtml(item.url)}</span>
          </button>`;
      })
      .join('');
  }

  /** 模式按钮只在挂载时构建一次 */
  private renderModes(): void {
    const wrap = this.query('[data-role="modes"]') as HTMLElement;
    wrap.innerHTML = ASSET_MODES
      .map(m => `<button class="ces-mode" data-mode="${m.id}">${m.name}</button>`)
      .join('');
    this.syncMode();
  }

  /** 切换模式时就地更新状态，避免整块重建导致焦点丢失 */
  private syncMode(): void {
    const mode = ASSET_MODES.find(m => m.id === this.assetMode)!;
    this.queryAll('[data-mode]').forEach(el => {
      el.classList.toggle('is-active', el.getAttribute('data-mode') === mode.id);
    });
    (this.query('[data-role="mode-hint"]') as HTMLElement).textContent = mode.hint;
    (this.query('[data-role="keyword-wrap"]') as HTMLElement).hidden = !mode.needsKeyword;
    this.renderPlatforms();
    this.renderAssetQuery();
  }

  private renderPlatforms(): void {
    const wrap = this.query('[data-role="platforms"]') as HTMLElement;
    wrap.innerHTML = PLATFORMS
      .map(p => {
        const ok = supportsMode(p, this.assetMode) && !!this.target
          && (!ASSET_MODES.find(m => m.id === this.assetMode)!.needsKeyword || !!this.assetKeyword.trim());
        return `
          <button class="ces-plat" data-platform="${p.id}" title="${escapeHtml(p.tip)}"${ok ? '' : ' disabled'}>
            <span>${escapeHtml(p.name)}</span>
            <i>${icon('external', 12)}</i>
          </button>`;
      })
      .join('');
  }

  private renderExtras(): void {
    const wrap = this.query('[data-role="extras"]') as HTMLElement;
    wrap.innerHTML = EXTRA_SOURCES
      .map(s => `<button class="ces-linkbtn" data-extra="${s.id}" title="${escapeHtml(s.hint)}">${escapeHtml(s.name)}</button>`)
      .join('');
  }

  private renderAssetQuery(): void {
    const el = this.query('[data-role="query"]') as HTMLElement;
    if (!this.target) {
      el.textContent = '先确定目标域名，再生成测绘查询语句';
      return;
    }
    const firstOk = PLATFORMS.find(p => supportsMode(p, this.assetMode));
    if (!firstOk) {
      el.textContent = '当前模式暂不支持查询';
      return;
    }
    const url = buildAssetUrl(firstOk.id, this.assetMode, { domain: this.target, keyword: this.assetKeyword });
    if (!url) {
      el.textContent = '填写关键词后生成查询语句';
      return;
    }
    try {
      const q = decodeURIComponent(new URL(url).searchParams.get('qbase64') || '');
      el.textContent = q ? atob(q) : `${firstOk.name} · ${this.assetMode}`;
    } catch {
      el.textContent = `${firstOk.name} · ${this.assetMode}`;
    }
  }

  // ==================== 事件 ====================

  private wire(): void {
    this.root.addEventListener('click', e => this.onClick(e as MouseEvent));
    this.root.addEventListener('keydown', e => this.onKeydown(e as KeyboardEvent));
    this.root.addEventListener('input', e => this.onInput(e as Event));
    this.root.addEventListener('change', e => this.onInput(e as Event));

    const searchInput = this.query<HTMLInputElement>('[data-role="search"]');
    searchInput?.addEventListener('input', () => {
      this.keyword = searchInput.value;
      this.renderDorks();
    });

    this.wireDrag();
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    const role = el.getAttribute('data-role');
    if (role === 'search') {
      this.keyword = el.value;
      this.renderDorks();
    }
    if (role === 'keyword') {
      this.assetKeyword = el.value;
      this.renderPlatforms();
      this.renderAssetQuery();
    }
  }

  private onClick(e: MouseEvent): void {
    const hit = (e.target as HTMLElement).closest(
      '[data-act],[data-tab],[data-cat],[data-dork-id],[data-global-id],[data-platform],[data-extra],[data-mode],[data-url]'
    ) as HTMLElement | null;
    if (!hit) return;
    if (hit.tagName === 'A') e.preventDefault();

    const el = hit;
    const act = el.getAttribute('data-act');
    if (act) {
      this.handleAction(act, el);
      return;
    }

    const tab = el.getAttribute('data-tab');
    if (tab) {
      this.switchTab(tab as PanelTab);
      return;
    }

    const cat = el.getAttribute('data-cat');
    if (cat) {
      this.category = cat as CategoryId | 'all';
      this.renderCats();
      this.renderDorks();
      return;
    }

    const dorkId = el.getAttribute('data-dork-id');
    if (dorkId) {
      this.runDork(dorkId, el);
      return;
    }

    const globalId = el.getAttribute('data-global-id');
    if (globalId) {
      const query = GLOBAL_QUERIES.find(q => q.id === globalId);
      if (query) {
        this.openUrl(ENGINES[this.engine].buildUrl(query.template));
        this.notify(`已执行：${query.name}`, 'ok');
      }
      return;
    }

    const platform = el.getAttribute('data-platform');
    if (platform) {
      this.openPlatform(platform);
      return;
    }

    const extra = el.getAttribute('data-extra');
    if (extra) {
      this.openExtra(extra);
      return;
    }

    const mode = el.getAttribute('data-mode');
    if (mode) {
      this.assetMode = mode as AssetMode;
      this.syncMode();
      return;
    }

    const url = el.getAttribute('data-url');
    if (url) this.handleUrlClick(url, el);
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.options.onRequestClose();
      return;
    }
    if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT') {
      e.preventDefault();
      this.query<HTMLInputElement>('[data-role="search"]')?.focus();
      return;
    }
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      if (target.getAttribute('data-role') === 'target-input' && target.value.trim()) {
        this.setTarget(target.value.trim().toLowerCase());
        this.notify('目标域名已更新', 'ok');
      }
    }
  }

  private handleAction(act: string, el: HTMLElement): void {
    switch (act) {
      case 'options':
        this.options.onOpenOptions();
        break;
      case 'close':
        this.options.onRequestClose();
        break;
      case 'collapse':
        this.collapse();
        break;
      case 'copy-target':
        this.copy(this.target, '域名已复制');
        break;
      case 'run-high':
        this.runHighRisk(el);
        break;
      case 'global':
        this.globalMode = !this.globalMode;
        this.renderDorks();
        break;
      case 'extract':
        this.loadUrls(false);
        break;
      case 'extract-wide':
        this.loadUrls(true);
        break;
      case 'copy-all':
        this.copy(this.urls.map(u => u.url).join('\n'), `已复制 ${this.urls.length} 条 URL`);
        break;
      case 'export':
        this.exportCsv();
        break;
      case 'clear-visited':
        appState.clearVisited(this.target || undefined);
        this.renderDorks();
        this.notify('已清空执行记录', 'ok');
        break;
      default:
        break;
    }
  }

  // ==================== 行为 ====================

  /** 同步执行，不做任何 await —— 这是「点击不流畅」的根治 */
  private runDork(id: string, el?: HTMLElement): void {
    const dork = appState.dorks.find(d => d.id === id);
    if (!dork) return;
    if (!this.target) {
      this.notify('请先填写目标域名', 'warn');
      return;
    }

    const url = ENGINES[this.engine].buildUrl(fillTemplate(dork.template, this.target));
    this.openUrl(url);

    appState.markVisited(this.target, id);
    if (appState.settings.showVisitedMarks && el) {
      el.classList.add('is-visited', 'is-flash');
      window.setTimeout(() => el.classList.remove('is-flash'), 560);
    }
  }

  private runHighRisk(button: HTMLElement): void {
    if (this.batch.isRunning) {
      this.batch.stop();
      return;
    }
    if (!this.target) {
      this.notify('请先填写目标域名', 'warn');
      return;
    }

    const items: BatchItem[] = highRisk(filterByEngine(appState.dorks, this.engine)).map(d => ({
      id: d.id,
      label: d.name,
      url: ENGINES[this.engine].buildUrl(fillTemplate(d.template, this.target))
    }));

    if (items.length === 0) {
      this.notify('当前引擎没有可用的高危语法', 'warn');
      return;
    }

    const progress = this.query('[data-role="progress"]') as HTMLElement;
    const bar = progress.querySelector('i') as HTMLElement;
    const { batchTabLimit, batchDelayMs } = appState.settings;

    button.classList.add('is-running');
    button.innerHTML = `${icon('stop', 13)}停止`;

    this.batch
      .run(items, batchTabLimit, batchDelayMs, {
        onStart: total => {
          progress.classList.add('is-active');
          bar.style.width = '0%';
          this.notify(`开始执行 ${total} 条高危语法`, 'info');
        },
        onProgress: (done, total, current) => {
          bar.style.width = `${Math.round((done / total) * 100)}%`;
          this.notify(`${done}/${total} · ${current}`, 'info', 1200);
          const executed = items[done - 1];
          if (executed) appState.markVisited(this.target, executed.id);
        },
        onFinish: (done, total, reason) => {
          progress.classList.remove('is-active');
          button.classList.remove('is-running');
          button.innerHTML = `${icon('bolt', 13)}一键跑高危`;
          this.renderDorks();
          this.notify(
            reason === 'stopped' ? `已停止（已执行 ${done}/${total}）` : `全部完成：${done} 条`,
            reason === 'stopped' ? 'warn' : 'ok',
            2600
          );
        }
      })
      .catch(() => {
        button.classList.remove('is-running');
        button.innerHTML = `${icon('bolt', 13)}一键跑高危`;
      });
  }

  private loadUrls(forcePageWide = false): void {
    const listEl = this.query('[data-role="url-list"]') as HTMLElement;
    listEl.innerHTML = '<div class="ces-skeleton"></div><div class="ces-skeleton" style="width:70%"></div><div class="ces-skeleton" style="width:85%"></div>';

    window.requestAnimationFrame(() => {
      try {
        const engine = ENGINES[this.engine];
        const result = extractUrls({
          selectors: engine.resultSelectors,
          containers: engine.containerSelectors,
          excluded: engine.excludedSelectors,
          blacklist: appState.settings.urlBlacklist,
          statsSelectors: engine.statsSelectors,
          classifyResults: appState.settings.sensitiveHighlightEnabled,
          forcePageWide
        });
        this.urls = result.items;
        this.diag = result.diag;
        this.urlStats = result.stats ? `共 ${result.items.length} 条 · ${result.stats}` : `共 ${result.items.length} 条`;
      } catch (err) {
        this.urls = [];
        this.diag = null;
        this.urlStats = '';
        console.warn('[crazyedusrc] 提取 URL 失败', err);
      }
      this.urlsLoaded = true;
      this.renderUrlPane();

      const sensitive = this.urls.filter(u => u.level === 'critical').length;
      if (this.urls.length === 0) {
        this.notify('没有提取到 URL，可试试点「强制全页扫描」', 'warn');
      } else {
        this.notify(
          sensitive > 0 ? `提取 ${this.urls.length} 条，其中 ${sensitive} 条高危` : `提取 ${this.urls.length} 条 URL`,
          'ok'
        );
      }
    });
  }

  private handleUrlClick(url: string, el: HTMLElement): void {
    if (appState.settings.urlClickAction === 'open') {
      this.openUrl(url);
      return;
    }
    this.copy(url, '已复制');
    el.classList.add('is-copied');
    window.setTimeout(() => el.classList.remove('is-copied'), 600);
  }

  private exportCsv(): void {
    if (this.urls.length === 0) {
      this.notify('没有可导出的 URL', 'warn');
      return;
    }
    const rows = [['url', 'level', 'labels'].join(',')].concat(
      this.urls.map(u => [u.url, u.level || '', u.labels.join('|')].map(v => `"${v.replace(/"/g, '""')}"`).join(','))
    );
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crazyedusrc-${this.target || 'urls'}-${Date.now()}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    this.notify(`已导出 ${this.urls.length} 条`, 'ok');
  }

  private openPlatform(platformId: string): void {
    if (!this.target) {
      this.notify('请先填写目标域名', 'warn');
      return;
    }
    const url = buildAssetUrl(platformId, this.assetMode, { domain: this.target, keyword: this.assetKeyword });
    if (!url) {
      this.notify('该平台不支持当前查询模式', 'warn');
      return;
    }
    this.openUrl(url);
  }

  private openExtra(id: string): void {
    const source = EXTRA_SOURCES.find(s => s.id === id);
    if (!source) return;
    if (!this.target) {
      this.notify('请先填写目标域名', 'warn');
      return;
    }
    if (id === 'beian') this.copy(this.target, '域名已复制，粘贴到备案查询框');
    this.openUrl(source.build(this.target));
  }

  private openUrl(url: string): void {
    if (appState.settings.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  private copy(text: string, successMessage: string): void {
    if (!text) {
      this.notify('没有可复制的内容', 'warn');
      return;
    }
    const done = () => this.notify(successMessage, 'ok');
    const fallback = () => {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', 'readonly');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        area.remove();
        if (ok) done();
        else this.notify('复制失败，请手动选择', 'err');
      } catch {
        this.notify('复制失败，请手动选择', 'err');
      }
    };

    // 内容脚本文档未获得焦点时 navigator.clipboard 会直接抛错，此时走 execCommand
    const canUseAsync = document.hasFocus() && !!navigator.clipboard?.writeText;
    if (canUseAsync) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  // ==================== 拖动 / 收起 ====================

  private wireDrag(): void {
    const handle = this.query('[data-role="drag"]') as HTMLElement;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let dragging = false;

    handle.addEventListener('pointerdown', e => {
      if ((e.target as HTMLElement).closest('button')) return;
      const rect = this.host.getBoundingClientRect();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      originX = rect.left;
      originY = rect.top;
      handle.classList.add('is-dragging');
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const next = this.clampPosition(originX + (e.clientX - startX), originY + (e.clientY - startY));
      this.host.style.setProperty('left', `${next.x}px`, 'important');
      this.host.style.setProperty('top', `${next.y}px`, 'important');
      this.host.style.setProperty('right', 'auto', 'important');
    });

    const finish = () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('is-dragging');
      const rect = this.host.getBoundingClientRect();
      appState.savePos(this.clampPosition(rect.left, rect.top));
    };

    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  collapse(): void {
    if (this.collapsed) return;
    this.collapsed = true;
    this.root.hidden = true;

    const pill = document.createElement('div');
    pill.className = 'ces-pill';
    pill.setAttribute('data-role', 'pill');
    pill.innerHTML = `${icon('logo', 20)}`;
    const visited = this.target ? appState.visitedCount(this.target) : 0;
    if (visited > 0) pill.innerHTML += `<b>${visited > 99 ? '99+' : visited}</b>`;
    pill.addEventListener('click', () => this.expand());

    this.host.style.setProperty('padding', '0', 'important');
    this.pill = pill;
    this.shadow.appendChild(pill);
  }

  private expand(): void {
    if (!this.collapsed) return;
    this.collapsed = false;
    this.pill?.remove();
    this.pill = null;
    this.root.hidden = false;
    this.renderDorks();
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }
}
