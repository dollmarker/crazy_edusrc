/**
 * 语法库操作：筛选、搜索、模板填充、导入导出
 */

import type { Dork, Engine, Risk } from '../types';

const RISK_WEIGHT: Record<Risk, number> = { high: 0, medium: 1, low: 2, info: 3 };

/** 汉字的 HTML 转义——语法名会进入 innerHTML，必须转义 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fillTemplate(template: string, domain: string): string {
  return template.replace(/\{target_domain\}/g, domain);
}

export function filterByEngine(dorks: Dork[], engine: Engine, onlyEnabled = true): Dork[] {
  return dorks.filter(d => {
    if (onlyEnabled && !d.enabled) return false;
    return d.engineSettings?.[engine] !== false;
  });
}

export function sortByRisk(dorks: Dork[]): Dork[] {
  return [...dorks].sort((a, b) => RISK_WEIGHT[a.risk] - RISK_WEIGHT[b.risk]);
}

/** 关键字过滤：名称与模板都参与匹配 */
export function search(dorks: Dork[], keyword: string): Dork[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return dorks;
  return dorks.filter(
    d => d.name.toLowerCase().includes(kw) || d.template.toLowerCase().includes(kw)
  );
}

export function highRisk(dorks: Dork[]): Dork[] {
  return dorks.filter(d => d.risk === 'high');
}

// ===== 导入导出 =====

export function exportDorks(dorks: Dork[]): string {
  return JSON.stringify(
    { type: 'crazyedusrc-dorks', version: 1, exportedAt: new Date().toISOString(), dorks },
    null,
    2
  );
}

export interface ImportResult {
  imported: Dork[];
  errors: string[];
}

/**
 * 解析导入文件。
 * 只接受结构完整的条目，并强制 builtin=false（导入的永远算自定义语法），
 * 同时对 name / template 做长度与类型校验，避免注入与脏数据。
 */
export function parseImportedDorks(json: string): ImportResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { imported: [], errors: ['不是合法的 JSON 文件'] };
  }

  const raw = Array.isArray(parsed)
    ? parsed
    : (parsed as { dorks?: unknown }).dorks;

  if (!Array.isArray(raw)) {
    return { imported: [], errors: ['未找到 dorks 数组'] };
  }

  const imported: Dork[] = [];
  raw.forEach((item, index) => {
    const d = item as Partial<Dork>;
    if (typeof d.name !== 'string' || typeof d.template !== 'string') {
      errors.push(`第 ${index + 1} 条缺少 name 或 template`);
      return;
    }
    if (!d.template.includes('{target_domain}')) {
      errors.push(`第 ${index + 1} 条模板缺少 {target_domain} 占位符`);
      return;
    }
    const risk: Risk = d.risk === 'high' || d.risk === 'medium' || d.risk === 'low' ? d.risk : 'info';
    imported.push({
      id: typeof d.id === 'string' && d.id ? d.id : `custom_${Date.now()}_${index}`,
      name: d.name.slice(0, 60),
      template: d.template.slice(0, 500),
      risk,
      category: d.category || 'general',
      builtin: false,
      enabled: d.enabled !== false,
      engineSettings: {
        google: d.engineSettings?.google !== false,
        baidu: d.engineSettings?.baidu !== false,
        bing: d.engineSettings?.bing !== false
      }
    });
  });

  return { imported, errors };
}
