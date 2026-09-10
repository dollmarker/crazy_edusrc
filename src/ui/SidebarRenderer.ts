/**
 * 侧边栏UI渲染器（EduSRC 增强版）
 *
 * 二开增强：
 * - 语法按钮按攻击面分类分组显示（leak_docs/pii/panel/sso/component/config/directory/general）
 * - 新增资产测绘联动面板（Fofa / Quake / Hunter鹰图 / 360空间测绘）
 * - 新增 Edu 工具栏（一键跑高危语法 / Edu 全局搜索）
 */

import { SyntaxItem } from '../types/syntax';
import { createElement } from '../utils/dom';
import { getMessage } from '../utils/i18n';
import { CATEGORY_META } from '../constants/eduSyntax';

export class SidebarRenderer {
  /**
   * 创建侧边栏容器
   */
  public createSidebar(): HTMLElement {
    const sidebar = createElement('div', {
      className: 'hacking-sidebar glass-morph'
    });
    
    sidebar.style.opacity = '0';
    sidebar.style.transform = 'translateX(20px)';
    sidebar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    return sidebar;
  }

  /**
   * 创建侧边栏头部（EduSRC 增强：加入批量执行与全局搜索按钮）
   */
  public createHeader(): HTMLElement {
    const linkIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>';
    const boltIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/></svg>';
    const globeIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.263 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.393-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/></svg>';
    
    const header = createElement('div', {
      className: 'sidebar-header',
      innerHTML: `
        <div class="sidebar-header-title">${getMessage('sidebarTitle')}</div>
        <div class="sidebar-header-actions edu-header-actions">
          <select id="syntaxSortOrder" class="sort-select" title="排序方式">
            <option value="default">默认顺序</option>
            <option value="risk">风险等级</option>
          </select>
          <button id="eduGlobalSearchBtn" class="sidebar-button edu-button" title="对 edu.cn 全局执行当前语法分类搜索">
            ${globeIcon} ${getMessage('eduQuickSearchBtn')}
          </button>
          <button id="batchHighRiskBtn" class="sidebar-button red-button" title="按当前域名批量执行全部高危语法">
            ${boltIcon} ${getMessage('batchHighRiskBtn')}
          </button>
          <button id="extractUrlBtn" class="sidebar-button blue-button">
            ${linkIcon} ${getMessage('extractUrlBtn')}
          </button>
        </div>
      `
    });
    
    return header;
  }

  /**
   * 创建资产测绘联动面板（EduSRC 增强）
   * 把当前 site 目标一键转为 Fofa / Quake / Hunter / 360 鹰图语法并跳转
   */
  public createAssetPanel(targetDomain: string): HTMLElement {
    const panel = createElement('div', {
      className: 'asset-panel',
      innerHTML: `
        <div class="asset-panel-title">🛰️ ${getMessage('assetPanelTitle')}</div>
        <div class="asset-panel-desc">${targetDomain}</div>
        <div class="asset-panel-buttons">
          <button class="asset-btn" data-platform="fofa">Fofa</button>
          <button class="asset-btn" data-platform="quake">360 Quake</button>
          <button class="asset-btn" data-platform="hunter">鹰图 Hunter</button>
          <button class="asset-btn" data-platform="zoomeye">ZoomEye</button>
        </div>
      `
    });
    
    return panel;
  }

  /**
   * 创建URL提取面板
   */
  public createUrlPanel(): HTMLElement {
    const chevronUpIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>';
    
    const panel = createElement('div', {
      id: 'urlExtractorPanel',
      className: 'url-panel',
      innerHTML: `
        <div class="url-panel-header">
          <div class="url-panel-title">${getMessage('urlPanelTitle')} <span id="urlCount" class="url-count">(0)</span></div>
          <div class="url-panel-actions">
            <button id="copyAllUrlsBtn" class="sidebar-button blue-button">
              ${getMessage('copyAllUrlsBtn')}
            </button>
            <button id="collapseUrlPanelBtn" class="sidebar-button gray-button">
              ${chevronUpIcon}
            </button>
          </div>
        </div>
        <div id="urlList" class="url-list"></div>
      `
    });
    
    panel.style.display = 'none';
    return panel;
  }

  /**
   * 创建语法按钮容器（EduSRC 增强：支持按分类分组）
   */
  public createSyntaxContainer(
    syntaxItems: SyntaxItem[],
    sortOrder: string = 'default',
    groupByCategory: boolean = false
  ): HTMLElement {
    const container = createElement('div', {
      className: 'syntax-container'
    });
    container.id = 'syntaxContainer';
    container.dataset.sortOrder = sortOrder;
    container.dataset.grouped = String(groupByCategory);
    
    // 区分内置和自定义语法
    const builtinItems = syntaxItems.filter(item => item.builtin);
    const customItems = syntaxItems.filter(item => !item.builtin);
    
    // 排序函数：按风险等级排序
    const sortByRisk = (items: SyntaxItem[]) => {
      const riskOrder = { high: 0, medium: 1, low: 2, info: 3 };
      return items.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
    };
    
    // 根据排序方式处理内置语法
    let sortedBuiltin = [...builtinItems];
    if (sortOrder === 'risk') {
      sortedBuiltin = sortByRisk(sortedBuiltin);
    }
    
    if (groupByCategory && sortOrder !== 'risk') {
      // === 分类分组渲染（EduSRC 增强） ===
      this.renderGroupedByCategory(container, sortedBuiltin);
    } else {
      // === 原有平铺渲染 ===
      sortedBuiltin.forEach(syntax => {
        container.appendChild(this.createSyntaxButton(syntax));
      });
    }
    
    // 如果有自定义语法，添加分隔线
    if (customItems.length > 0) {
      const divider = createElement('div', {
        className: 'syntax-divider',
        textContent: getMessage('customSyntaxDivider')
      });
      container.appendChild(divider);
      
      // 根据排序方式处理自定义语法
      let sortedCustom = [...customItems];
      if (sortOrder === 'risk') {
        sortedCustom = sortByRisk(sortedCustom);
      }
      
      // 添加自定义语法按钮
      sortedCustom.forEach(syntax => {
        container.appendChild(this.createSyntaxButton(syntax));
      });
    }
    
    return container;
  }

  /**
   * 按攻击面分类分组渲染语法按钮（EduSRC 增强）
   */
  private renderGroupedByCategory(container: HTMLElement, items: SyntaxItem[]): void {
    // 按 category 分桶
    const groups = new Map<string, SyntaxItem[]>();
    
    for (const item of items) {
      const category = item.category || 'general';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    }
    
    // 分类排序：已知分类按 CATEGORY_META.order，未知分类排在最后（按字母序）
    const knownOrder = (cat: string): number =>
      CATEGORY_META[cat] ? CATEGORY_META[cat].order : 999;
    
    const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
      const orderDiff = knownOrder(a) - knownOrder(b);
      return orderDiff !== 0 ? orderDiff : a.localeCompare(b);
    });
    
    // 渲染每组
    for (const category of sortedCategories) {
      const meta = CATEGORY_META[category];
      const groupEl = createElement('div', {
        className: 'syntax-group'
      });
      
      const groupHeader = createElement('div', {
        className: 'syntax-group-header',
        innerHTML: `
          <span class="syntax-group-title">${meta ? meta.name : category}</span>
          <span class="syntax-group-count">${groups.get(category)!.length}</span>
        `
      });
      
      const groupBody = createElement('div', {
        className: 'syntax-group-body'
      });
      
      // 组内按钮保持原有顺序（库定义顺序即攻击优先级）
      groups.get(category)!.forEach(syntax => {
        groupBody.appendChild(this.createSyntaxButton(syntax));
      });
      
      groupEl.appendChild(groupHeader);
      groupEl.appendChild(groupBody);
      container.appendChild(groupEl);
    }
  }

  /**
   * 创建单个语法按钮
   */
  public createSyntaxButton(syntax: SyntaxItem): HTMLElement {
    // 风险等级配置
    const riskConfig = {
      info: { label: 'info', color: '#007AFF' },
      low: { label: 'low', color: '#34C759' },
      medium: { label: 'medium', color: '#FF9500' },
      high: { label: 'high', color: '#FF3B30' }
    };
    
    const risk = riskConfig[syntax.risk];
    
    const button = createElement('div', {
      className: `syntax-btn risk-${syntax.risk}`,
      innerHTML: `
        <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${syntax.name}</span>
        <span style="margin-left: 8px; flex-shrink: 0; color: ${risk.color};">${risk.label}</span>
      `
    });
    
    button.dataset.syntaxId = syntax.id;
    button.dataset.template = syntax.template;
    
    return button;
  }

  /**
   * 创建侧边栏底部
   */
  public createFooter(): HTMLElement {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    const homepage = manifest.homepage_url || '#';
    
    const settingsIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/></svg>';
    const githubIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
    
    const footer = createElement('div', {
      className: 'sidebar-footer',
      innerHTML: `
        <div class="sidebar-footer-links">
          <a href="#" class="sidebar-footer-link settings-link">
            ${settingsIcon} ${getMessage('settingsBtn')}
          </a>
          <a href="${homepage}" class="sidebar-footer-link" target="_blank">
            ${githubIcon} ${getMessage('githubBtn')}
          </a>
        </div>
        <div class="sidebar-footer-version">v${version} · EduSRC</div>
      `
    });
    
    return footer;
  }

}
