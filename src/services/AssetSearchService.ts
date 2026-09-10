/**
 * 资产测绘平台联动服务（EduSRC 增强）
 *
 * 把搜索引擎侧边栏的 site 目标域名一键转为各网络空间测绘平台的
 * 查询语法并构造跳转 URL，实现"搜索引擎猎洞 → 资产测绘深挖"的组合拳。
 *
 * 支持平台：
 * - Fofa     : domain="xxx.edu.cn"        (qbase64 编码)
 * - 360 Quake: domain:"xxx.edu.cn"
 * - 鹰图 Hunter: domain.suffix="xxx.edu.cn"
 * - ZoomEye  : site:"xxx.edu.cn"
 */

export type AssetPlatform = 'fofa' | 'quake' | 'hunter' | 'zoomeye';

interface PlatformConfig {
  name: string;
  buildUrl(domain: string): string;
}

const PLATFORMS: Record<AssetPlatform, PlatformConfig> = {
  fofa: {
    name: 'Fofa',
    buildUrl(domain: string): string {
      // Fofa 使用 qbase64 参数，查询语法为 domain="xxx"
      const query = `domain="${domain}"`;
      // 浏览器环境使用 btoa；对非 ASCII 域名做 UTF-8 安全编码
      const b64 = btoa(unescape(encodeURIComponent(query)));
      return `https://fofa.info/result?qbase64=${encodeURIComponent(b64)}`;
    }
  },
  quake: {
    name: '360 Quake',
    buildUrl(domain: string): string {
      const query = `domain:"${domain}"`;
      return `https://quake.360.net/quake/#/searchResult?searchVal=${encodeURIComponent(query)}`;
    }
  },
  hunter: {
    name: '鹰图 Hunter',
    buildUrl(domain: string): string {
      const query = `domain.suffix="${domain}"`;
      return `https://hunter.qianxin.com/home/dataSearch?searchValue=${encodeURIComponent(query)}`;
    }
  },
  zoomeye: {
    name: 'ZoomEye',
    buildUrl(domain: string): string {
      const query = `site:"${domain}"`;
      return `https://www.zoomeye.org/search?q=${encodeURIComponent(query)}`;
    }
  }
};

export class AssetSearchService {
  private static instance: AssetSearchService;

  private constructor() {}

  public static getInstance(): AssetSearchService {
    if (!AssetSearchService.instance) {
      AssetSearchService.instance = new AssetSearchService();
    }
    return AssetSearchService.instance;
  }

  /**
   * 获取平台显示名称
   */
  public getPlatformName(platform: AssetPlatform): string {
    return PLATFORMS[platform]?.name || platform;
  }

  /**
   * 构造平台搜索跳转 URL
   * @param platform 测绘平台标识
   * @param domain   目标域名（如 pku.edu.cn）
   */
  public buildSearchUrl(platform: AssetPlatform, domain: string): string {
    const config = PLATFORMS[platform];
    if (!config) {
      throw new Error(`未知的资产测绘平台: ${platform}`);
    }
    if (!domain) {
      throw new Error('目标域名为空，无法构造资产测绘查询');
    }
    return config.buildUrl(domain.trim());
  }

  /**
   * 判断平台是否支持
   */
  public isSupported(platform: string): platform is AssetPlatform {
    return platform in PLATFORMS;
  }
}
