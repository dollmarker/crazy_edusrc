/**
 * 全局类型定义
 */

/** 支持的搜索引擎 */
export type Engine = 'google' | 'baidu' | 'bing';

/** 风险等级 */
export type Risk = 'high' | 'medium' | 'low' | 'info';

/** 攻击面分类 */
export type CategoryId =
  | 'leak_docs'
  | 'pii'
  | 'panel'
  | 'sso'
  | 'component'
  | 'config'
  | 'directory'
  | 'general';

/** 主题 */
export type Theme = 'light' | 'dark';

/** URL 点击动作 */
export type UrlClickAction = 'copy' | 'open';

/** 单条语法 */
export interface Dork {
  id: string;
  name: string;
  template: string;
  risk: Risk;
  category: CategoryId;
  builtin: boolean;
  enabled: boolean;
  engineSettings: Record<Engine, boolean>;
}

/** 分类元数据 */
export interface CategoryMeta {
  id: CategoryId;
  name: string;
  order: number;
}

/** 跨校全局查询 */
export interface GlobalQuery {
  id: string;
  name: string;
  template: string;
}

/** 插件设置 */
export interface Settings {
  /** 侧边栏总开关 */
  sidebarEnabled: boolean;
  googleEnabled: boolean;
  baiduEnabled: boolean;
  bingEnabled: boolean;
  /** 命中 site: 时自动挂载面板 */
  autoMount: boolean;
  openInNewTab: boolean;
  urlClickAction: UrlClickAction;
  urlBlacklist: string[];
  /** 语法按攻击面分组 */
  groupByCategory: boolean;
  /** 显示资产测绘面板 */
  assetPanelEnabled: boolean;
  /** 敏感 URL 高亮 */
  sensitiveHighlightEnabled: boolean;
  /** 显示「已执行」标记 */
  showVisitedMarks: boolean;
  /** 一键跑高危：每批打开标签页上限 */
  batchTabLimit: number;
  /** 一键跑高危：标签页间隔（毫秒） */
  batchDelayMs: number;
  theme: Theme;
  followSystemTheme: boolean;
}

/** 已执行记录：域名 -> 语法 id 列表 */
export type VisitedMap = Record<string, string[]>;

/** 面板位置 */
export interface PanelPos {
  x: number;
  y: number;
}

/** 面板标签页 */
export type PanelTab = 'dorks' | 'urls' | 'assets';

/** URL 命中等级 */
export type SensitiveLevel = 'critical' | 'warn' | 'info';

/** 敏感特征规则 */
export interface SensitiveRule {
  id: string;
  label: string;
  level: SensitiveLevel;
  test(url: string): boolean;
}

/** 提取到的 URL */
export interface ExtractedUrl {
  url: string;
  labels: string[];
  level: SensitiveLevel | null;
}

/** 资产测绘查询模式 */
export type AssetMode = 'domain' | 'cert' | 'fingerprint' | 'icp';

/** 后台消息 */
export interface RuntimeMessage {
  type: 'openOptions' | 'openUrls' | 'runCommand';
  urls?: string[];
  command?: string;
}
