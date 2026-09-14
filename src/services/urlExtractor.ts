/**
 * URL 提取服务
 *
 * 相比早期重构版本的改动：
 * 1. 三层取链策略：引擎选择器 → 结果区容器兜底 → 全页兜底，
 *    任何一层取到结果就停，避免"一个选择器过时就全空"
 * 2. 修复 Google /url?q= 跳转链接被当成"引擎自身链接"丢弃的问题
 * 3. 不再使用可能命中结果祖先节点的模糊排除选择器
 * 4. 输出诊断计数，UI 上能直接看到"扫描了多少 / 被谁过滤掉多少"
 */

import type { ExtractedUrl } from '../types';
import { classify } from './sensitive';

const EXCLUDE_DOMAINS = [
  'google.com', 'gstatic.com', 'googleusercontent.com', 'googleapis.com',
  'baidu.com', 'bdstatic.com', 'bdimg.com',
  'bing.com', 'bingapis.com', 'microsoft.com', 'msn.com',
  'w3.org', 'schema.org'
];

const TRACKING_PARAMS = [
  'ved', 'usg', 'ei', 'sa', 'cd', 'rct', 'cad', 'uact', 'aqs',
  'sourceid', 'sxsrf', 'gs_lcp', 'oq', 'gs_lcrp', 'sca_esv', 'sclient',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'spm'
];

interface CompiledBlacklist {
  regex: RegExp[];
  domains: Array<{ wildcard: boolean; domain: string }>;
}

function compileBlacklist(blacklist: string[]): CompiledBlacklist {
  const regex: RegExp[] = [];
  const domains: Array<{ wildcard: boolean; domain: string }> = [];

  for (const rule of blacklist) {
    const value = rule.trim();
    if (!value) continue;
    if (value.startsWith('/') && value.endsWith('/') && value.length > 2) {
      try {
        regex.push(new RegExp(value.slice(1, -1), 'i'));
      } catch {
        /* 无效正则忽略 */
      }
    } else if (value.startsWith('*.')) {
      domains.push({ wildcard: true, domain: value.slice(2).toLowerCase() });
    } else {
      domains.push({ wildcard: false, domain: value.toLowerCase() });
    }
  }
  return { regex, domains };
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

/** 搜索引擎自身域名 / 扩展页面 */
function isEngineUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (url.startsWith('chrome-extension://') || url.includes('webcache.googleusercontent.com')) return true;
  return EXCLUDE_DOMAINS.some(domain => hostMatches(host, domain));
}

/**
 * 规范化 URL：
 * - Google /url?q=、Bing /ck/a?u=、Baidu /link?url= 等跳转链接还原
 * - 去掉跟踪参数与 hash
 * - 无法还原的跳转链接返回空字符串（表示丢弃）
 */
export function normalizeUrl(raw: string): string {
  if (!raw) return '';

  // 百度跳转链接依赖短期 token，无法离线还原
  if (raw.includes('baidu.com/link?url=') || (raw.includes('www.baidu.com/') && raw.includes('/link?'))) {
    return '';
  }

  let urlObj: URL;
  try {
    urlObj = new URL(raw);
  } catch {
    return '';
  }

  const host = urlObj.hostname.toLowerCase();

  // Google：https://www.google.com/url?q=<真实地址>
  if (/google\.[a-z.]+$/.test(host) && urlObj.pathname === '/url') {
    const target = urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
    if (target && /^https?:\/\//i.test(target)) {
      try {
        urlObj = new URL(target);
      } catch {
        return '';
      }
    }
  }

  // Bing：https://www.bing.com/ck/a?...&u=a1aHR0cHM6...
  if (hostMatches(host, 'bing.com') && urlObj.pathname.includes('/ck/a')) {
    const encoded = urlObj.searchParams.get('u');
    if (encoded) {
      try {
        let decoded = atob(encoded.replace(/^a1/, ''));
        if (!/^https?:\/\//i.test(decoded)) decoded = 'https://' + decoded;
        urlObj = new URL(decoded);
      } catch {
        return '';
      }
    }
  }

  // 通用重定向参数
  const redirect = urlObj.searchParams.get('url') || urlObj.searchParams.get('target');
  if (redirect && /^https?:\/\//i.test(redirect)) {
    try {
      urlObj = new URL(redirect);
    } catch {
      /* 保持原样 */
    }
  }

  TRACKING_PARAMS.forEach(p => urlObj.searchParams.delete(p));
  urlObj.hash = '';
  return urlObj.toString();
}

/** 从元素上取真实链接 */
function linkFromElement(element: Element): string | null {
  const mu = element.getAttribute('mu') || element.closest('[mu]')?.getAttribute('mu');
  if (mu && mu.startsWith('http')) return mu;

  if (element.tagName === 'A' && element.hasAttribute('href')) {
    return (element as HTMLAnchorElement).href;
  }
  if (element.tagName === 'CITE') {
    const text = element.textContent?.trim();
    if (text && text.startsWith('http')) return text;
  }
  const anchor = element.closest('a[href]') as HTMLAnchorElement | null;
  return anchor ? anchor.href : null;
}

export interface ExtractDiagnostics {
  /** 参与扫描的候选链接数 */
  scanned: number;
  /** 最终保留数 */
  matched: number;
  /** 被 URL 黑名单过滤 */
  byBlacklist: number;
  /** 被判定为搜索引擎自身链接 / 无法还原的跳转链接 */
  byEngine: number;
  /** 落在排除容器内 */
  byExcluded: number;
  /** 命中的取链策略 */
  strategy: 'selectors' | 'container' | 'page';
}

export interface ExtractOptions {
  selectors: string[];
  excluded: string[];
  containers?: string[];
  blacklist: string[];
  statsSelectors?: string[];
  classifyResults: boolean;
  /** 跳过前两层，直接全页扫描（UI 上的"强制全页扫描"） */
  forcePageWide?: boolean;
}

export interface ExtractResult {
  items: ExtractedUrl[];
  stats: string;
  diag: ExtractDiagnostics;
}

function safeQueryAll(root: ParentNode, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

/** 收集候选链接元素，按三层策略依次尝试 */
function collectCandidates(options: ExtractOptions): { elements: Element[]; strategy: ExtractDiagnostics['strategy'] } {
  if (options.forcePageWide) {
    return { elements: safeQueryAll(document, 'a[href^="http"]'), strategy: 'page' };
  }

  // 第一层：引擎专用选择器
  const bySelector = new Set<Element>();
  for (const selector of options.selectors) {
    safeQueryAll(document, selector).forEach(el => bySelector.add(el));
  }
  if (bySelector.size > 0) return { elements: Array.from(bySelector), strategy: 'selectors' };

  // 第二层：结果区容器内的全部链接
  for (const container of options.containers || []) {
    const root = document.querySelector(container);
    if (!root) continue;
    const links = safeQueryAll(root, 'a[href^="http"]');
    if (links.length > 0) return { elements: links, strategy: 'container' };
  }

  // 第三层：全页兜底
  return { elements: safeQueryAll(document, 'a[href^="http"]'), strategy: 'page' };
}

export function extractUrls(options: ExtractOptions): ExtractResult {
  const list = compileBlacklist(options.blacklist);
  const { elements, strategy } = collectCandidates(options);

  const found = new Map<string, ExtractedUrl>();
  const diag: ExtractDiagnostics = {
    scanned: elements.length,
    matched: 0,
    byBlacklist: 0,
    byEngine: 0,
    byExcluded: 0,
    strategy
  };

  for (const element of elements) {
    if (options.excluded.some(sel => {
      try {
        return !!element.closest(sel);
      } catch {
        return false;
      }
    })) {
      diag.byExcluded += 1;
      continue;
    }

    const href = linkFromElement(element);
    if (!href) continue;

    const url = normalizeUrl(href);
    if (!url) {
      diag.byEngine += 1;
      continue;
    }
    if (found.has(url)) continue;

    if (isEngineUrl(url)) {
      diag.byEngine += 1;
      continue;
    }

    const host = new URL(url).hostname.toLowerCase();
    if (list.domains.some(rule => hostMatches(host, rule.domain)) || list.regex.some(re => re.test(url))) {
      diag.byBlacklist += 1;
      continue;
    }

    const hit = options.classifyResults ? classify(url) : { labels: [], level: null };
    found.set(url, { url, labels: hit.labels, level: hit.level });
  }

  const items = Array.from(found.values());
  diag.matched = items.length;

  // 敏感项排前面，同级保持提取顺序
  const weight = { critical: 0, warn: 1, info: 2 } as const;
  items.sort((a, b) => {
    const wa = a.level ? weight[a.level] : 3;
    const wb = b.level ? weight[b.level] : 3;
    return wa - wb;
  });

  return { items, stats: readStats(options.statsSelectors), diag };
}

function readStats(selectors?: string[]): string {
  if (!selectors || selectors.length === 0) return '';
  for (const sel of selectors) {
    const text = document.querySelector(sel)?.textContent?.trim();
    if (text) return text.replace(/\s+/g, ' ').slice(0, 60);
  }
  return '';
}
