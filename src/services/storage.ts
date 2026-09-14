/**
 * chrome.storage.local 的 Promise 封装 + 变更订阅
 */

import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants/defaults';
import type { Settings } from '../types';

export type StorageChanges = Record<string, chrome.storage.StorageChange>;

function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
}

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    if (!hasStorage()) return fallback;
    try {
      const data = await chrome.storage.local.get(key);
      const value = data[key];
      return (value === undefined || value === null ? fallback : value) as T;
    } catch {
      return fallback;
    }
  },

  async getMany(keys: string[]): Promise<Record<string, unknown>> {
    if (!hasStorage()) return {};
    try {
      return await chrome.storage.local.get(keys);
    } catch {
      return {};
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    if (!hasStorage()) return;
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (err) {
      console.warn('[crazyedusrc] 写入存储失败', key, err);
    }
  },

  /** 一次性写入多个键 */
  async setMany(values: Record<string, unknown>): Promise<void> {
    if (!hasStorage()) return;
    try {
      await chrome.storage.local.set(values);
    } catch (err) {
      console.warn('[crazyedusrc] 批量写入存储失败', err);
    }
  },

  onChanged(callback: (changes: StorageChanges) => void): void {
    if (!hasStorage() || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') callback(changes as StorageChanges);
    });
  },

  /** 读取设置并补齐缺失字段（永不因为少字段而丢配置） */
  async getSettings(): Promise<Settings> {
    const raw = await this.get<Partial<Settings>>(STORAGE_KEYS.settings, {});
    return { ...DEFAULT_SETTINGS, ...raw };
  }
};
