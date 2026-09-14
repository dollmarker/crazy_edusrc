/**
 * 敏感 URL 特征识别（分级）
 *
 * critical：数据库 / 备份 / 配置 / 版本控制 —— 直接可能拿到数据
 * warn    ：后台 / 接口调试 / 组件端点 —— 需要人工核验
 * info    ：学生数据 / 证件信息关键词 —— 中文资源泄漏面
 */

import type { SensitiveLevel, SensitiveRule } from '../types';

export const SENSITIVE_RULES: SensitiveRule[] = [
  { id: 'db', label: '数据库', level: 'critical', test: u => /\.(sql|db|mdb|dump|sqlite)(\?|$|&)/i.test(u) },
  { id: 'backup', label: '备份', level: 'critical', test: u => /(\.bak|\.old|\.zip|\.rar|\.7z|backup|www\.zip|web\.zip|site\.zip)(\?|$|&|\/)/i.test(u) },
  { id: 'config', label: '配置', level: 'critical', test: u => /(\.env|config\.php|web\.config|application\.ya?ml|\.ini|\.properties)(\?|$|&)/i.test(u) },
  { id: 'vcs', label: '版本控制', level: 'critical', test: u => /(\.git\/|\.svn\/|\.git$|\.svn$)/i.test(u) },
  { id: 'admin', label: '后台', level: 'warn', test: u => /(\/admin|\/manage|\/guanli|\/login|\/system)(\/|$|\?)/i.test(u) },
  { id: 'debug', label: '接口调试', level: 'warn', test: u => /(swagger|api-docs|druid|actuator|phpinfo|debug|nacos|jenkins)/i.test(u) },
  { id: 'upload', label: '上传点', level: 'warn', test: u => /(ueditor|umeditor|uploadify|fileupload|kindeditor)/i.test(u) },
  { id: 'student', label: '学生数据', level: 'info', test: u => /(学生|名单|花名册|学籍|录取|成绩|xueji|luqu|chengji)/i.test(safeDecode(u)) },
  { id: 'idcard', label: '证件信息', level: 'info', test: u => /(身份证|证件|idcard|id_card|sfz)/i.test(safeDecode(u)) },
  { id: 'doc', label: '文档', level: 'info', test: u => /\.(xls|xlsx|doc|docx|pdf|csv)(\?|$|&)/i.test(u) }
];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export interface ClassifiedUrl {
  labels: string[];
  level: SensitiveLevel | null;
}

const LEVEL_WEIGHT: Record<SensitiveLevel, number> = { critical: 0, warn: 1, info: 2 };

export function classify(url: string): ClassifiedUrl {
  const hits: SensitiveRule[] = [];
  for (const rule of SENSITIVE_RULES) {
    try {
      if (rule.test(url)) hits.push(rule);
    } catch {
      /* 忽略单条规则异常 */
    }
  }
  if (hits.length === 0) return { labels: [], level: null };
  hits.sort((a, b) => LEVEL_WEIGHT[a.level] - LEVEL_WEIGHT[b.level]);
  return { labels: hits.map(h => h.label), level: hits[0].level };
}
