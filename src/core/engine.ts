/**
 * 搜索引擎适配（三个引擎共用一份实现，差异只体现在配置里）
 */

import { EXCLUDED_SELECTORS, RESULT_CONTAINERS, RESULT_SELECTORS, STATS_SELECTORS } from '../constants/selectors';
import type { Engine } from '../types';

export interface EngineDef {
  id: Engine;
  label: string;
  /** 查询参数名 */
  queryParam: string;
  /** 翻页参数名 */
  pageParam?: string;
  isHost(host: string): boolean;
  isSearchPath(path: string): boolean;
  buildUrl(query: string, page?: number): string;
  resultSelectors: string[];
  containerSelectors: string[];
  excludedSelectors: string[];
  statsSelectors: string[];
  hostLabel: string;
}

export const ENGINES: Record<Engine, EngineDef> = {
  google: {
    id: 'google',
    label: 'Google',
    queryParam: 'q',
    pageParam: 'start',
    hostLabel: 'www.google.com',
    isHost: host => /(^|\.)google\.[a-z.]+$/.test(host),
    isSearchPath: path => path === '/search' || path === '/webhp',
    buildUrl: (query, page) => {
      const url = new URL('https://www.google.com/search');
      url.searchParams.set('q', query);
      if (page && page > 0) url.searchParams.set('start', String(page * 10));
      return url.toString();
    },
    resultSelectors: RESULT_SELECTORS.google,
    containerSelectors: RESULT_CONTAINERS.google,
    excludedSelectors: EXCLUDED_SELECTORS.google,
    statsSelectors: STATS_SELECTORS.google
  },
  baidu: {
    id: 'baidu',
    label: '百度',
    queryParam: 'wd',
    pageParam: 'pn',
    hostLabel: 'www.baidu.com',
    isHost: host => /(^|\.)baidu\.com$/.test(host),
    isSearchPath: path => path.startsWith('/s') || path === '/baidu',
    buildUrl: (query, page) => {
      const url = new URL('https://www.baidu.com/s');
      url.searchParams.set('wd', query);
      if (page && page > 0) url.searchParams.set('pn', String(page * 10));
      return url.toString();
    },
    resultSelectors: RESULT_SELECTORS.baidu,
    containerSelectors: RESULT_CONTAINERS.baidu,
    excludedSelectors: EXCLUDED_SELECTORS.baidu,
    statsSelectors: STATS_SELECTORS.baidu
  },
  bing: {
    id: 'bing',
    label: 'Bing',
    queryParam: 'q',
    pageParam: 'first',
    hostLabel: 'www.bing.com',
    isHost: host => /(^|\.)bing\.(com|cn|[a-z]{2})$/.test(host),
    isSearchPath: path => path.startsWith('/search'),
    buildUrl: (query, page) => {
      const url = new URL('https://www.bing.com/search');
      url.searchParams.set('q', query);
      if (page && page > 0) url.searchParams.set('first', String(page * 10 + 1));
      return url.toString();
    },
    resultSelectors: RESULT_SELECTORS.bing,
    containerSelectors: RESULT_CONTAINERS.bing,
    excludedSelectors: EXCLUDED_SELECTORS.bing,
    statsSelectors: STATS_SELECTORS.bing
  }
};

export function detectEngine(href: string = location.href): Engine | null {
  let host: string;
  let path: string;
  try {
    const url = new URL(href);
    host = url.hostname.toLowerCase();
    path = url.pathname;
  } catch {
    return null;
  }
  for (const def of Object.values(ENGINES)) {
    if (def.isHost(host) && def.isSearchPath(path)) return def.id;
  }
  return null;
}

/**
 * 域名清洗 —— v1.0 的 site: 提取会把引号、通配符、路径、端口一起带出来，
 * 直接拼进测绘查询就废了，这里统一处理。
 */
export function cleanDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^\*\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .replace(/:\d+$/, '')
    .toLowerCase();
}

const SITE_PATTERN = /site:\s*("[^"]+"|'[^']+'|[^\s&|)]+)/i;

/** 从查询串中提取 site: 目标域名（带清洗），没有则返回空字符串 */
export function extractSiteTarget(query: string): string {
  const matched = query.match(SITE_PATTERN);
  return matched ? cleanDomain(matched[1]) : '';
}

/** 当前页面的目标域名 */
export function currentTarget(engine: Engine, href: string = location.href): string {
  const def = ENGINES[engine];
  try {
    const params = new URL(href).searchParams;
    const query = params.get(def.queryParam) || params.get('word') || '';
    return extractSiteTarget(query);
  } catch {
    return '';
  }
}
