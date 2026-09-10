/**
 * URL面板渲染器（EduSRC 增强版）
 *
 * 二开增强：
 * - 敏感 URL 特征识别与高亮（数据库备份/配置文件/目录遍历/管理后台等），
 *   帮助在大量搜索结果中快速定位高价值猎洞目标
 */

import { createElement } from '../utils/dom';
import { getMessage } from '../utils/i18n';

/**
 * 敏感 URL 特征规则（EduSRC 增强）
 * 命中即打红色"敏感"标记，优先人工核验
 */
interface SensitivePattern {
  id: string;
  label: string;
  test(url: string): boolean;
}

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    id: 'db_dump',
    label: '数据库',
    test: (url) => /\.(sql|db|mdb|dump|bak)(\?|$|&)/i.test(url)
  },
  {
    id: 'backup',
    label: '备份',
    test: (url) => /(backup|\.bak|\.old|www\.zip|web\.zip|site\.zip|htdocs\.zip)/i.test(url)
  },
  {
    id: 'env_config',
    label: '配置',
    test: (url) => /(\.env|config\.php|web\.config|application\.yml|\.ini)(\?|$|&)/i.test(url)
  },
  {
    id: 'git_svn',
    label: '版本控制',
    test: (url) => /(\.git\/|\.svn\/)/i.test(url)
  },
  {
    id: 'admin_panel',
    label: '后台',
    test: (url) => /(\/admin|\/manage|\/guanli|\/login)/i.test(url)
  },
  {
    id: 'student_data',
    label: '学生数据',
    test: (url) => /(学生|名单|花名册|学籍|录取|成绩|xueji|luqu)/i.test(decodeURIComponent(url))
  },
  {
    id: 'id_card_file',
    label: '证件信息',
    test: (url) => /(身份证|证件|idcard|sfz)/i.test(decodeURIComponent(url))
  },
  {
    id: 'api_debug',
    label: '接口调试',
    test: (url) => /(swagger|api-docs|druid|phpinfo|debug)/i.test(url)
  }
];

export class UrlPanelRenderer {
  /**
   * 检测 URL 命中的敏感特征
   */
  public detectSensitivePatterns(url: string): string[] {
    const labels: string[] = [];
    for (const pattern of SENSITIVE_PATTERNS) {
      try {
        if (pattern.test(url)) {
          labels.push(pattern.label);
        }
      } catch {
        // decodeURIComponent 等异常时忽略该规则
      }
    }
    return labels;
  }

  /**
   * 渲染URL列表
   */
  public renderUrlList(urls: string[], urlListElement: HTMLElement): void {
    urlListElement.innerHTML = '';
    
    if (urls.length === 0) {
      this.renderEmptyState(urlListElement);
      return;
    }
    
    urls.forEach(url => {
      const urlItem = this.createUrlItem(url);
      urlListElement.appendChild(urlItem);
    });
  }

  /**
   * 创建单个URL项（EduSRC 增强：敏感特征高亮）
   */
  private createUrlItem(url: string): HTMLElement {
    // 检测敏感特征
    const sensitiveLabels = this.detectSensitivePatterns(url);
    
    const urlItem = createElement('div', {
      className: sensitiveLabels.length > 0 ? 'url-item url-item-sensitive' : 'url-item'
    });
    
    if (sensitiveLabels.length > 0) {
      // 命中敏感特征：打标记 + URL 展示
      const tagContainer = createElement('div', {
        className: 'url-sensitive-tags'
      });
      
      for (const label of sensitiveLabels) {
        const tag = createElement('span', {
          className: 'sensitive-tag',
          textContent: label
        });
        tagContainer.appendChild(tag);
      }
      
      const urlText = createElement('div', {
        className: 'url-text',
        textContent: url
      });
      
      urlItem.appendChild(tagContainer);
      urlItem.appendChild(urlText);
    } else {
      urlItem.textContent = url;
    }
    
    urlItem.title = url;
    urlItem.dataset.url = url;
    
    return urlItem;
  }

  /**
   * 渲染空状态
   */
  private renderEmptyState(container: HTMLElement): void {
    const emptyState = createElement('div', {
      className: 'url-debug-info',
      innerHTML: `
        <div class="debug-icon"><i class="fas fa-exclamation-circle"></i></div>
        <div class="debug-content">
          <div class="debug-title">无法提取URL</div>
          <div class="debug-tips">
            <p>${getMessage('urlExtractionErrorTips')}</p>
          </div>
        </div>
      `
    });
    
    container.appendChild(emptyState);
  }

  /**
   * 渲染加载状态
   */
  public renderLoadingState(container: HTMLElement): void {
    container.innerHTML = '<div class="url-item">正在提取URL...</div>';
  }

  /**
   * 更新URL计数
   */
  public updateUrlCount(count: number, countElement: HTMLElement): void {
    countElement.textContent = `(${count})`;
  }

  /**
   * 显示复制成功反馈
   */
  public showCopySuccess(element: HTMLElement, url: string): void {
    element.style.backgroundColor = '#e6f4ea';
    element.style.borderLeft = '3px solid #34a853';
    element.innerHTML = `<div class="copy-success"><i class="fas fa-check"></i> ${getMessage('copySuccess')}</div>`;
    
    setTimeout(() => {
      element.style.backgroundColor = '';
      element.style.borderLeft = '';
      // 恢复原始 URL 展示
      this.restoreUrlItem(element, url);
    }, 1200);
  }

  /**
   * 显示复制失败反馈
   */
  public showCopyError(element: HTMLElement, url: string): void {
    element.style.backgroundColor = '#fce8e6';
    element.style.borderLeft = '3px solid #ea4335';
    element.innerHTML = `<div class="copy-error"><i class="fas fa-times"></i> ${getMessage('copyError')}</div>`;
    
    setTimeout(() => {
      element.style.backgroundColor = '';
      element.style.borderLeft = '';
      this.restoreUrlItem(element, url);
    }, 1200);
  }

  /**
   * 恢复 URL 项展示（保持敏感标记逻辑）
   */
  private restoreUrlItem(element: HTMLElement, url: string): void {
    element.innerHTML = '';
    element.textContent = url;
  }
}
