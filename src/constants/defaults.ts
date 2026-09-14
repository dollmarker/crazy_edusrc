/**
 * 默认设置与存储键
 */

import type { Settings } from '../types';

export const STORAGE_KEYS = {
  settings: 'ces.settings',
  dorks: 'ces.dorks',
  visited: 'ces.visited',
  panelPos: 'ces.panelPos',
  installedAt: 'ces.installedAt'
} as const;

export const DEFAULT_SETTINGS: Settings = {
  sidebarEnabled: true,
  googleEnabled: true,
  baiduEnabled: true,
  bingEnabled: true,
  autoMount: true,
  openInNewTab: true,
  urlClickAction: 'copy',
  urlBlacklist: [],
  groupByCategory: true,
  assetPanelEnabled: true,
  sensitiveHighlightEnabled: true,
  showVisitedMarks: true,
  batchTabLimit: 5,
  batchDelayMs: 1200,
  theme: 'light',
  followSystemTheme: true
};

export const EXTENSION_NAME = 'crazyedusrc';

export const DEFAULT_BATCH_DELAY = 1200;
