/**
 * EduSRC 专用语法库（二开新增）
 *
 * 面向教育行业(EduSRC)的搜索引擎猎洞语法，按攻击面分类组织：
 * - leak_docs : 敏感文档泄露（学籍/成绩/名单，常含身份证号）
 * - pii       : 个人敏感信息特征
 * - panel     : 后台与管理入口
 * - sso       : 统一认证与边界入口（CAS/WebVPN/SSO/邮箱）
 * - component : 教育行业常见系统组件指纹（正方/强智/青果/Prism等）
 * - config    : 配置、备份与数据库文件泄露
 * - directory : 目录遍历与开放目录
 * - general   : 通用侦察
 */

import { SyntaxLibrary } from '../types/syntax';

export const EDU_SYNTAX: SyntaxLibrary = [
  // ============================================
  // 敏感文档泄露（EduSRC 高危，文档常含身份证号/手机号）
  // ============================================
  {
    id: "edu_student_roster",
    name: "学生名单/花名册",
    template: "site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:csv) (学生名单 OR 花名册 OR 学籍 OR 名单)",
    enabled: true,
    risk: "high",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_id_card_docs",
    name: "身份证号文档",
    template: "site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:doc OR filetype:pdf) (身份证 OR 身份证号 OR 证件号)",
    enabled: true,
    risk: "high",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_admission",
    name: "录取/招生名单",
    template: "site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:pdf) (录取 OR 拟录取 OR 新生 OR 招生名单 OR 报到)",
    enabled: true,
    risk: "high",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_score_docs",
    name: "成绩单文档",
    template: "site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:pdf) (成绩 OR 分数线 OR 绩点 OR 挂科 OR 补考)",
    enabled: true,
    risk: "medium",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_scholarship",
    name: "奖学金/助学金公示",
    template: "site:{target_domain} (奖学金 OR 助学金 OR 贫困生 OR 补助) (名单 OR 公示 OR filetype:xls OR filetype:xlsx)",
    enabled: true,
    risk: "medium",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_teacher_info",
    name: "教职工信息",
    template: "site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:doc) (职工 OR 教师 OR 员工) (电话 OR 联系方式 OR 工资 OR 待遇)",
    enabled: true,
    risk: "medium",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_party_docs",
    name: "党员/组织信息",
    template: "site:{target_domain} (党员 OR 入党 OR 组织关系) (名单 OR filetype:xls OR filetype:xlsx)",
    enabled: true,
    risk: "medium",
    category: "leak_docs",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },

  // ============================================
  // 个人敏感信息特征（PII）
  // ============================================
  {
    id: "edu_pii_keyword",
    name: "身份证/手机号关键词",
    template: "site:{target_domain} (\"身份证\" AND \"手机\" AND \"姓名\") -招聘 -模板",
    enabled: true,
    risk: "high",
    category: "pii",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_resume_leak",
    name: "简历泄露",
    template: "site:{target_domain} (filetype:doc OR filetype:pdf OR filetype:docx) (简历 OR 个人简历 OR 履历)",
    enabled: true,
    risk: "medium",
    category: "pii",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_exam_papers",
    name: "试题/答案泄露",
    template: "site:{target_domain} (filetype:pdf OR filetype:doc) (试题 OR 试卷 OR 答案 OR 期末)",
    enabled: true,
    risk: "low",
    category: "pii",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },

  // ============================================
  // 后台与管理入口
  // ============================================
  {
    id: "edu_admin_login",
    name: "管理后台入口",
    template: "site:{target_domain} (inurl:admin OR inurl:manage OR inurl:guanli) OR intitle:(管理 OR 后台 OR 登录)",
    enabled: true,
    risk: "medium",
    category: "panel",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_oa_system",
    name: "OA 办公系统",
    template: "site:{target_domain} (inurl:oa OR intitle:OA OR 办公系统 OR 协同办公)",
    enabled: true,
    risk: "medium",
    category: "panel",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_card_system",
    name: "一卡通系统",
    template: "site:{target_domain} (一卡通 OR inurl:card OR inurl:ykt)",
    enabled: true,
    risk: "medium",
    category: "panel",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_library_system",
    name: "图书馆系统",
    template: "site:{target_domain} (图书馆 OR inurl:lib OR inurl:opac)",
    enabled: true,
    risk: "low",
    category: "panel",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_dorm_system",
    name: "宿舍/后勤系统",
    template: "site:{target_domain} (宿舍 OR 后勤 OR inurl:sushe OR inurl:dorm OR 公寓管理)",
    enabled: true,
    risk: "medium",
    category: "panel",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_pay_system",
    name: "缴费/财务系统",
    template: "site:{target_domain} (缴费 OR 收费 OR 财务 OR inurl:pay OR inurl:caiwu)",
    enabled: true,
    risk: "medium",
    category: "panel",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },

  // ============================================
  // 统一认证与边界入口（拿下即通杀全校）
  // ============================================
  {
    id: "edu_cas_login",
    name: "CAS 统一认证",
    template: "site:{target_domain} inurl:cas OR (intitle:统一身份认证 OR intitle:统一认证)",
    enabled: true,
    risk: "high",
    category: "sso",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_webvpn",
    name: "WebVPN 入口",
    template: "site:{target_domain} (webvpn OR inurl:vpn OR intitle:VPN)",
    enabled: true,
    risk: "high",
    category: "sso",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_sso_portal",
    name: "SSO 门户",
    template: "site:{target_domain} (inurl:sso OR inurl:login OR intitle:登录 OR 门户)",
    enabled: true,
    risk: "medium",
    category: "sso",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_mail_system",
    name: "邮箱系统",
    template: "site:{target_domain} (mail OR 邮箱 OR inurl:mail OR intitle:mail)",
    enabled: true,
    risk: "medium",
    category: "sso",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },

  // ============================================
  // 教育行业常见系统组件指纹（历史漏洞高发区）
  // ============================================
  {
    id: "edu_zf_jw",
    name: "正方教务系统",
    template: "site:{target_domain} (inurl:zfca OR intitle:正方 OR 教务系统 OR inurl:jwc)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_qz_jw",
    name: "强智教务系统",
    template: "site:{target_domain} (inurl:qzgd OR 强智 OR intitle:教务管理)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_kg_jw",
    name: "青果教务系统",
    template: "site:{target_domain} (青果 OR inurl:kingsun OR inurl:kg)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_prism_employment",
    name: "招生就业系统",
    template: "site:{target_domain} (就业 OR 招生 OR inurl:jiuye OR inurl:zhaosheng OR 就业信息网)",
    enabled: true,
    risk: "medium",
    category: "component",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_nacos",
    name: "Nacos 注册中心",
    template: "site:{target_domain} (intitle:nacos OR inurl:nacos)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_druid_monitor",
    name: "Druid 监控台",
    template: "site:{target_domain} (inurl:druid OR intitle:druid)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_swagger_api",
    name: "Swagger 接口文档",
    template: "site:{target_domain} (inurl:swagger OR inurl:api-docs OR intitle:swagger)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_jenkins_ci",
    name: "Jenkins 构建台",
    template: "site:{target_domain} (intitle:jenkins OR inurl:jenkins)",
    enabled: true,
    risk: "high",
    category: "component",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },

  // ============================================
  // 配置、备份与数据库泄露
  // ============================================
  {
    id: "edu_sql_dump",
    name: "数据库备份文件",
    template: "site:{target_domain} (filetype:sql OR filetype:db OR filetype:mdb OR inurl:dump)",
    enabled: true,
    risk: "high",
    category: "config",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_backup_files",
    name: "网站备份文件",
    template: "site:{target_domain} (inurl:backup OR inurl:bak OR inurl:www.zip OR inurl:web.zip OR \"index.php.bak\")",
    enabled: true,
    risk: "high",
    category: "config",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_env_config",
    name: "环境配置文件",
    template: "site:{target_domain} (inurl:.env OR inurl:config.php OR inurl:web.config OR inurl:application.yml)",
    enabled: true,
    risk: "high",
    category: "config",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_git_svn",
    name: "版本控制泄露",
    template: "site:{target_domain} (inurl:.git OR inurl:.svn OR \"Index of /.git\")",
    enabled: true,
    risk: "high",
    category: "config",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },

  // ============================================
  // 目录遍历
  // ============================================
  {
    id: "edu_open_dir",
    name: "开放目录列表",
    template: "site:{target_domain} intitle:\"index of\" OR \"parent directory\"",
    enabled: true,
    risk: "medium",
    category: "directory",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: false, bing: true },
    builtin: true
  },
  {
    id: "edu_upload_dir",
    name: "上传目录",
    template: "site:{target_domain} (inurl:upload OR inurl:uploads OR inurl:file) \"index of\"",
    enabled: true,
    risk: "medium",
    category: "directory",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: false, bing: true },
    builtin: true
  },

  // ============================================
  // 通用侦察
  // ============================================
  {
    id: "edu_error_info",
    name: "报错信息泄露",
    template: "site:{target_domain} (\"fatal error\" OR \"syntax error\" OR \"mysql error\" OR \"stack trace\" OR \"sql语法错误\")",
    enabled: true,
    risk: "high",
    category: "general",
    engines: ["google", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_test_env",
    name: "测试/旧系统",
    template: "site:{target_domain} (inurl:test OR inurl:dev OR inurl:old OR 测试 OR 旧版)",
    enabled: true,
    risk: "medium",
    category: "general",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  },
  {
    id: "edu_forum_bbs",
    name: "论坛/社区系统",
    template: "site:{target_domain} (inurl:bbs OR inurl:forum OR 论坛 OR 社区)",
    enabled: true,
    risk: "low",
    category: "general",
    engines: ["google", "baidu", "bing"],
    engineSettings: { google: true, baidu: true, bing: true },
    builtin: true
  }
];

/**
 * 分类元数据：显示名称与图标（用于侧边栏分组渲染）
 */
export const CATEGORY_META: Record<string, { name: string; icon: string; order: number }> = {
  leak_docs: { name: "📄 敏感文档", icon: "📄", order: 0 },
  pii:       { name: "🆔 个人信息", icon: "🆔", order: 1 },
  panel:     { name: "🔐 后台入口", icon: "🔐", order: 2 },
  sso:       { name: "🔑 统一认证", icon: "🔑", order: 3 },
  component: { name: "🧩 组件指纹", icon: "🧩", order: 4 },
  config:    { name: "💾 配置泄露", icon: "💾", order: 5 },
  directory: { name: "📁 目录遍历", icon: "📁", order: 6 },
  general:   { name: "🔍 通用侦察", icon: "🔍", order: 7 }
};

/**
 * Edu 全局快捷搜索（跨校猎洞场景）
 * 不限定具体学校，直接对全量 edu.cn 资产执行高危语法，
 * 用于发现批量化的同组件/同类型漏洞（EduSRC 刷洞利器）。
 */
export interface EduGlobalQuery {
  id: string;
  name: string;
  template: string;
}

export const EDU_GLOBAL_QUICKSEARCH: EduGlobalQuery[] = [
  {
    id: "global_leak_docs",
    name: "全 edu 敏感文档",
    template: "site:edu.cn (filetype:xls OR filetype:xlsx) (学生名单 OR 花名册 OR 学籍 OR 身份证)"
  },
  {
    id: "global_panel",
    name: "全 edu 后台入口",
    template: "site:edu.cn (inurl:admin OR intitle:管理登录 OR intitle:后台登录)"
  },
  {
    id: "global_cas",
    name: "全 edu CAS认证",
    template: "site:edu.cn (inurl:cas/login OR intitle:统一身份认证)"
  },
  {
    id: "global_dir",
    name: "全 edu 目录遍历",
    template: "site:edu.cn intitle:\"index of\""
  },
  {
    id: "global_error",
    name: "全 edu 报错泄露",
    template: "site:edu.cn (\"mysql error\" OR \"syntax error\" OR \"fatal error\")"
  },
  {
    id: "global_jw",
    name: "全 edu 教务系统",
    template: "site:edu.cn (inurl:zfca OR 教务系统 OR intitle:教务)"
  },
  {
    id: "global_webvpn",
    name: "全 edu WebVPN",
    template: "site:edu.cn (webvpn OR intitle:webvpn)"
  }
];
