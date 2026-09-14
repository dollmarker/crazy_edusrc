/**
 * 资产测绘联动（声明式配置）
 *
 * 四档查询模式，覆盖高校资产最容易遗漏的入口：
 * - domain      : 主域名资产
 * - cert        : 证书拓线 —— 找同一张证书下的旁站 / 隐藏域名（高校边缘资产重灾区）
 * - fingerprint : 组件指纹 —— 直接定位爆洞组件（Nacos / Druid / 泛微 / 致远 …）
 * - icp         : 备案主体 —— 按单位名找该校名下全部备案域名
 */

import type { AssetMode } from '../types';

export interface AssetTarget {
  domain: string;
  keyword: string;
}

export interface PlatformDef {
  id: string;
  name: string;
  /** 需要登录 / 有查询次数限制的提示 */
  tip: string;
  query: Partial<Record<AssetMode, (t: AssetTarget) => string>>;
  url: (query: string) => string;
}

function utf8Base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fp(t: AssetTarget): string {
  return t.keyword.trim();
}

export const PLATFORMS: PlatformDef[] = [
  {
    id: 'fofa',
    name: 'Fofa',
    tip: '免费账号有查询条数限制',
    query: {
      domain: t => `domain="${t.domain}"`,
      cert: t => `cert="${t.domain}"`,
      fingerprint: t => `domain="${t.domain}" && (title="${fp(t)}" || body="${fp(t)}")`,
      icp: t => `icp="${fp(t)}"`
    },
    url: q => `https://fofa.info/result?qbase64=${encodeURIComponent(utf8Base64(q))}`
  },
  {
    id: 'quake',
    name: '360 Quake',
    tip: '需登录；不支持按备案主体检索',
    query: {
      domain: t => `domain:"${t.domain}"`,
      cert: t => `cert:"${t.domain}"`,
      fingerprint: t => `domain:"${t.domain}" && (title:"${fp(t)}" || app:"${fp(t)}")`
    },
    url: q => `https://quake.360.net/quake/#/searchResult?searchVal=${encodeURIComponent(q)}`
  },
  {
    id: 'hunter',
    name: '鹰图 Hunter',
    tip: '需登录且消耗积分',
    query: {
      domain: t => `domain.suffix="${t.domain}"`,
      cert: t => `cert="${t.domain}"`,
      fingerprint: t => `domain.suffix="${t.domain}" && (web.title="${fp(t)}" || web.body="${fp(t)}")`
    },
    url: q => `https://hunter.qianxin.com/home/dataSearch?searchValue=${encodeURIComponent(q)}`
  },
  {
    id: 'zoomeye',
    name: 'ZoomEye',
    tip: '免费账号每日查询次数有限',
    query: {
      domain: t => `site:"${t.domain}"`,
      cert: t => `ssl:"${t.domain}"`,
      fingerprint: t => `site:"${t.domain}" && (title:"${fp(t)}" || app:"${fp(t)}")`,
      icp: t => `icp:"${fp(t)}"`
    },
    url: q => `https://www.zoomeye.org/searchResult?q=${encodeURIComponent(q)}`
  }
];

export const ASSET_MODES: Array<{ id: AssetMode; name: string; hint: string; needsKeyword: boolean }> = [
  { id: 'domain', name: '主域', hint: '查询该域名下的全部资产', needsKeyword: false },
  { id: 'cert', name: '证书拓线', hint: '查同一张 TLS 证书下的旁站与隐藏域名', needsKeyword: false },
  { id: 'fingerprint', name: '组件指纹', hint: '在关键词里填组件名，如 Nacos / Druid / 泛微', needsKeyword: true },
  { id: 'icp', name: '备案主体', hint: '在关键词里填单位名称，如 北京大学', needsKeyword: true }
];

export interface ExtraSource {
  id: string;
  name: string;
  hint: string;
  build: (domain: string) => string;
}

/** 非测绘类但同样是 EDU 侦察刚需的入口 */
export const EXTRA_SOURCES: ExtraSource[] = [
  {
    id: 'crtname',
    name: 'crt.name',
    hint: '证书透明日志枚举子域名（国内直连，比 crt.sh 快）',
    build: d => `https://crt.name/v1/search?apex=${encodeURIComponent(d)}`
  },
  {
    id: 'wayback',
    name: 'Wayback',
    hint: '历史快照，找回已下线的老系统',
    build: d => `https://web.archive.org/web/*/${encodeURIComponent(d)}/*`
  },
  {
    id: 'virustotal',
    name: 'VirusTotal',
    hint: '子域与解析记录',
    build: d => `https://www.virustotal.com/gui/domain/${encodeURIComponent(d)}/relations`
  },
  {
    id: 'shodan',
    name: 'Shodan',
    hint: '海外资产与开放服务',
    build: d => `https://www.shodan.io/search?query=${encodeURIComponent(d)}`
  },
  {
    id: 'aiqicha',
    name: '爱企查',
    hint: '查主办单位与关联域名',
    build: d => `https://aiqicha.baidu.com/s?q=${encodeURIComponent(d)}`
  },
  {
    id: 'beian',
    name: 'ICP 备案',
    hint: '工信部备案查询',
    build: () => 'https://beian.miit.gov.cn/#/Integrated/recordQuery'
  }
];

export function getPlatform(id: string): PlatformDef | undefined {
  return PLATFORMS.find(p => p.id === id);
}

export function supportsMode(platform: PlatformDef, mode: AssetMode): boolean {
  return typeof platform.query[mode] === 'function';
}

/** 生成某平台某模式下的跳转 URL；不支持时返回 null */
export function buildAssetUrl(platformId: string, mode: AssetMode, target: AssetTarget): string | null {
  const platform = getPlatform(platformId);
  if (!platform) return null;
  const builder = platform.query[mode];
  if (!builder) return null;
  if (!target.domain) return null;
  if ((mode === 'fingerprint' || mode === 'icp') && !target.keyword.trim()) return null;
  try {
    return platform.url(builder({ domain: target.domain, keyword: target.keyword }));
  } catch {
    return null;
  }
}
