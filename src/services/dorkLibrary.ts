/**
 * 内置语法库合并逻辑（background 与内容脚本共用）
 *
 * 规则：
 * - 内置语法的名称 / 模板 / 危险等级以新版本为准（升级后自动拿到新语法）
 * - 用户在选项页里对内置语法的开关状态保留
 * - 用户自定义语法原样保留
 */

import { BUILTIN_DORKS } from '../constants/dorks';
import type { Dork } from '../types';

export function mergeDorkLibrary(stored: Dork[] | undefined): Dork[] {
  const source = Array.isArray(stored) ? stored : [];
  const custom = source
    .filter(d => !d.builtin)
    .map(d => ({ ...d, category: d.category || 'general' }));

  const storedById = new Map(source.filter(d => d.builtin).map(d => [d.id, d]));

  const builtin = BUILTIN_DORKS.map(fresh => {
    const previous = storedById.get(fresh.id);
    if (!previous) return { ...fresh, engineSettings: { ...fresh.engineSettings } };
    return {
      ...fresh,
      enabled: previous.enabled !== false,
      engineSettings: { ...fresh.engineSettings, ...(previous.engineSettings || {}) }
    };
  });

  return [...builtin, ...custom];
}
