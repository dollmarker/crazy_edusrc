/**
 * 设置相关类型定义
 */

import { UrlClickAction } from './index';

// 应用设置
export interface AppSettings {
  sidebarEnabled: boolean;
  googleEnabled: boolean;
  baiduEnabled: boolean;
  bingEnabled: boolean;
  openInNewTab: boolean;
  urlClickAction: UrlClickAction;
  urlBlacklist: string[];
  /** EduSRC 增强：是否显示语法分类分组 */
  groupByCategory?: boolean;
  /** EduSRC 增强：是否显示资产测绘联动面板（Fofa/Quake/Hunter/鹰图） */
  assetPanelEnabled?: boolean;
  /** EduSRC 增强：批量执行高危语法时单次打开标签页上限 */
  batchTabLimit?: number;
  /** EduSRC 增强：URL 面板敏感特征高亮 */
  sensitiveHighlightEnabled?: boolean;
}

// 主题设置
export interface ThemeSettings {
  currentTheme: 'light' | 'dark';
  userHasPreference: boolean;
}

// Chrome存储数据结构
export interface ChromeStorageData {
  searchHackingSettings?: AppSettings;
  syntaxLibrary?: import('./syntax').SyntaxLibrary;
  currentTheme?: 'light' | 'dark';
  userHasPreference?: boolean;
}

