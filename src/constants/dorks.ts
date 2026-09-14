/**
 * EduSRC 专用语法库（v2.0 扩充版）
 *
 * 按攻击面分类组织，共 60+ 条。所有语法都支持 {target_domain} 占位符。
 * 相比 v1.0 补充了：教务新版本指纹、Spring Boot / Nacos / 泛微 / 致远 / 通达 / 用友
 * 等中间件指纹、WebVPN 指纹、工资表、心理咨询记录等高价值泄漏面。
 */

import type { CategoryId, CategoryMeta, Dork, Engine, GlobalQuery, Risk } from '../types';

const ALL_ENGINES: Engine[] = ['google', 'baidu', 'bing'];
/** 文件类型 / 目录索引类语法百度支持较差，只在 Google、Bing 启用 */
const EN: Engine[] = ['google', 'bing'];

type Row = [id: string, name: string, template: string, risk: Risk, engines?: Engine[]];

function seed(category: CategoryId, rows: Row[]): Dork[] {
  return rows.map(([id, name, template, risk, engines]) => {
    const list = engines ?? ALL_ENGINES;
    return {
      id,
      name,
      template,
      risk,
      category,
      builtin: true,
      enabled: true,
      engineSettings: {
        google: list.includes('google'),
        baidu: list.includes('baidu'),
        bing: list.includes('bing')
      }
    };
  });
}

const LEAK_DOCS = seed('leak_docs', [
  ['student_roster', '学生名单/花名册', 'site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:csv) (学生名单 OR 花名册 OR 学籍 OR 名单)', 'high'],
  ['id_card_docs', '身份证号文档', 'site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:doc OR filetype:pdf) (身份证 OR 身份证号 OR 证件号)', 'high'],
  ['full_pii_table', '全字段表格', 'site:{target_domain} filetype:xlsx (姓名 AND 身份证 AND 学号)', 'high'],
  ['salary_sheet', '工资/津贴/绩效表', 'site:{target_domain} (filetype:xls OR filetype:xlsx) (工资 OR 津贴 OR 绩效 OR 补贴) (名单 OR 表)', 'high'],
  ['admission', '录取/招生名单', 'site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:pdf) (录取 OR 拟录取 OR 新生 OR 招生名单 OR 报到)', 'high'],
  ['score_docs', '成绩单文档', 'site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:pdf) (成绩 OR 分数线 OR 绩点 OR 补考)', 'medium'],
  ['scholarship', '奖助学金公示', 'site:{target_domain} (奖学金 OR 助学金 OR 贫困生 OR 补助) (名单 OR 公示 OR filetype:xls OR filetype:xlsx)', 'medium'],
  ['teacher_info', '教职工信息', 'site:{target_domain} (filetype:xls OR filetype:xlsx OR filetype:doc) (职工 OR 教师 OR 员工) (电话 OR 联系方式 OR 工资 OR 待遇)', 'medium'],
  ['party_docs', '党员/组织信息', 'site:{target_domain} (党员 OR 入党 OR 组织关系) (名单 OR filetype:xls OR filetype:xlsx)', 'medium'],
  ['thesis_docs', '论文/毕业设计', 'site:{target_domain} (filetype:pdf OR filetype:doc) (毕业论文 OR 学位论文 OR 查重)', 'low']
]);

const PII = seed('pii', [
  ['pii_keyword', '身份证+手机号关键词', 'site:{target_domain} ("身份证" AND "手机" AND "姓名") -招聘 -模板', 'high'],
  ['student_discipline', '学籍异动/处分', 'site:{target_domain} (退学 OR 转专业 OR 学籍异动 OR 处分) (名单 OR 公示 OR filetype:xls)', 'medium'],
  ['counsel_record', '心理咨询/谈话记录', 'site:{target_domain} (心理咨询 OR 谈话记录 OR 重点关注学生) -文件 -下载', 'medium'],
  ['resume_leak', '简历泄露', 'site:{target_domain} (filetype:doc OR filetype:pdf OR filetype:docx) (简历 OR 个人简历 OR 履历)', 'medium'],
  ['exam_papers', '试题/答案泄露', 'site:{target_domain} (filetype:pdf OR filetype:doc) (试题 OR 试卷 OR 答案 OR 期末)', 'low'],
  ['pwd_in_doc', '文档内口令/账号', 'site:{target_domain} (filetype:xls OR filetype:doc OR filetype:pdf) ("初始密码" OR "默认密码" OR "账号密码")', 'high']
]);

const PANEL = seed('panel', [
  ['admin_login', '管理后台入口', 'site:{target_domain} (inurl:admin OR inurl:manage OR inurl:guanli OR intitle:管理 OR intitle:后台)', 'medium'],
  ['oa_system', 'OA 办公系统', 'site:{target_domain} (inurl:oa OR intitle:OA OR 办公系统 OR 协同办公)', 'medium'],
  ['card_system', '一卡通系统', 'site:{target_domain} (一卡通 OR inurl:card OR inurl:ykt)', 'medium'],
  ['library_system', '图书馆系统', 'site:{target_domain} (图书馆 OR inurl:lib OR inurl:opac)', 'low'],
  ['dorm_system', '宿舍/后勤系统', 'site:{target_domain} (宿舍 OR 后勤 OR inurl:sushe OR inurl:dorm OR 公寓管理)', 'medium'],
  ['pay_system', '缴费/财务系统', 'site:{target_domain} (缴费 OR 收费 OR 财务 OR inurl:pay OR inurl:caiwu)', 'medium'],
  ['jwc_panel', '教务处后台', 'site:{target_domain} (inurl:jwc OR inurl:jwcweb OR intitle:教务处 OR intitle:教务管理)', 'medium'],
  ['monitor_system', '监控/门禁/道闸', 'site:{target_domain} (监控 OR 门禁 OR 道闸 OR 人脸识别) (inurl:login OR inurl:admin OR intitle:登录)', 'medium'],
  ['lab_manage', '实验室/设备管理', 'site:{target_domain} (实验室管理 OR 设备管理 OR 资产管理) (inurl:login OR inurl:admin)', 'medium']
]);

const SSO = seed('sso', [
  ['cas_login', 'CAS 统一认证', 'site:{target_domain} (inurl:cas OR intitle:统一身份认证 OR intitle:统一认证)', 'high'],
  ['ehall_portal', '办事大厅/网上服务大厅', 'site:{target_domain} (inurl:ehall OR inurl:portal OR intitle:办事大厅 OR intitle:网上服务大厅)', 'high'],
  ['webvpn', 'WebVPN 入口', 'site:{target_domain} (webvpn OR inurl:vpn OR intitle:VPN)', 'high'],
  ['sangfor_vpn', '深信服 VPN 指纹', 'site:{target_domain} (inurl:por/login_psw.csp OR inurl:login_psw.csp OR "EasyConnect")', 'high', EN],
  ['sso_portal', 'SSO 门户', 'site:{target_domain} (inurl:sso OR inurl:login OR intitle:登录 OR 门户)', 'medium'],
  ['mail_system', '邮箱系统', 'site:{target_domain} (mail OR 邮箱 OR inurl:mail OR intitle:mail)', 'medium'],
  ['wechat_bind', '微信/企业微信入口', 'site:{target_domain} (inurl:wechat OR inurl:qywx OR 企业微信 OR 扫码登录)', 'low']
]);

const COMPONENT = seed('component', [
  ['zf_jw_new', '正方教务（新版 jwglxt）', 'site:{target_domain} (inurl:jwglxt OR inurl:jwglxt/xtgl OR intitle:正方)', 'high'],
  ['zf_jw', '正方教务（旧版）', 'site:{target_domain} (inurl:zfca OR intitle:正方 OR 教务系统 OR inurl:jwc)', 'high'],
  ['qz_jw', '强智教务系统', 'site:{target_domain} (inurl:jsxsd OR inurl:qzgd OR 强智 OR intitle:教务管理)', 'high'],
  ['kg_jw', '青果教务系统', 'site:{target_domain} (青果 OR inurl:kingsun)', 'high'],
  ['prism_employment', '招生就业系统', 'site:{target_domain} (就业 OR 招生 OR inurl:jiuye OR inurl:zhaosheng OR 就业信息网)', 'medium'],
  ['nacos', 'Nacos 注册中心', 'site:{target_domain} (intitle:nacos OR inurl:nacos)', 'high', EN],
  ['druid_monitor', 'Druid 监控台', 'site:{target_domain} (inurl:druid OR intitle:druid)', 'high', EN],
  ['swagger_api', 'Swagger 接口文档', 'site:{target_domain} (inurl:swagger OR inurl:api-docs OR intitle:swagger)', 'high', EN],
  ['spring_actuator', 'Spring Boot 端点', 'site:{target_domain} (inurl:actuator/env OR inurl:actuator/heapdump OR inurl:actuator/health)', 'high', EN],
  ['jenkins_ci', 'Jenkins 构建台', 'site:{target_domain} (intitle:jenkins OR inurl:jenkins)', 'high', EN],
  ['phpmyadmin', 'phpMyAdmin', 'site:{target_domain} (inurl:phpmyadmin OR intitle:phpMyAdmin)', 'high', EN],
  ['ueditor', 'UEditor 上传点', 'site:{target_domain} (inurl:ueditor OR inurl:umeditor OR inurl:ueditor/php)', 'medium', EN],
  ['weaver_oa', '泛微 OA (e-cology)', 'site:{target_domain} (inurl:/weaver/ OR inurl:/ecology/ OR intitle:泛微)', 'high', EN],
  ['seeyon_oa', '致远 OA (A8)', 'site:{target_domain} (inurl:/seeyon/ OR inurl:seeyon OR intitle:致远)', 'high', EN],
  ['tongda_oa', '通达 OA', 'site:{target_domain} (inurl:/general/ OR inurl:/ispirit/ OR intitle:通达OA)', 'high', EN],
  ['yonyou_nc', '用友 NC / U8', 'site:{target_domain} (inurl:/nc/ OR inurl:u8c OR inurl:yonbip OR intitle:用友)', 'high', EN]
]);

const CONFIG = seed('config', [
  ['sql_dump', '数据库备份文件', 'site:{target_domain} (filetype:sql OR filetype:db OR filetype:mdb OR inurl:dump)', 'high', EN],
  ['backup_files', '网站备份文件', 'site:{target_domain} (inurl:backup OR inurl:bak OR inurl:www.zip OR inurl:web.zip OR "index.php.bak")', 'high', EN],
  ['env_config', '环境配置文件', 'site:{target_domain} (inurl:.env OR inurl:config.php OR inurl:web.config OR inurl:application.yml)', 'high', EN],
  ['git_svn', '版本控制泄露', 'site:{target_domain} (inurl:.git OR inurl:.svn OR "Index of /.git")', 'high', EN],
  ['log_files', '日志文件', 'site:{target_domain} (filetype:log OR inurl:log OR inurl:logs) -blog -登录', 'medium', EN],
  ['container_conf', '容器 / K8s 配置', 'site:{target_domain} (inurl:docker-compose.yml OR inurl:.kube/config OR inurl:k8s OR inurl:helm)', 'medium', EN],
  ['db_conn_str', '数据库连接串泄露', 'site:{target_domain} ("connectionString" OR "数据库连接" OR "jdbc:mysql" OR "password=")', 'high', EN]
]);

const DIRECTORY = seed('directory', [
  ['open_dir', '开放目录列表', 'site:{target_domain} intitle:"index of" OR "parent directory"', 'medium', EN],
  ['upload_dir', '上传目录', 'site:{target_domain} (inurl:upload OR inurl:uploads OR inurl:file) "index of"', 'medium', EN],
  ['backup_dir', '备份目录', 'site:{target_domain} (inurl:backup/ OR inurl:bak/ OR inurl:wwwroot OR inurl:webroot)', 'medium', EN],
  ['excel_index', '目录索引中的表格', 'site:{target_domain} intitle:"index of" (xls OR xlsx OR csv)', 'medium', EN]
]);

const GENERAL = seed('general', [
  ['error_info', '报错信息泄露', 'site:{target_domain} ("fatal error" OR "syntax error" OR "mysql error" OR "stack trace" OR "sql语法错误")', 'high', EN],
  ['test_env', '测试/旧系统', 'site:{target_domain} (inurl:test OR inurl:dev OR inurl:old OR 测试 OR 旧版)', 'medium'],
  ['weak_admin', '弱口令/默认口令', 'site:{target_domain} ("默认密码" OR "初始密码" OR "admin123" OR "弱口令")', 'medium'],
  ['upload_endpoint', '上传接口暴露', 'site:{target_domain} (inurl:upload OR inurl:fileupload OR inurl:uploadify OR inurl:uploadfile)', 'medium', EN],
  ['forum_bbs', '论坛/社区系统', 'site:{target_domain} (inurl:bbs OR inurl:forum OR 论坛 OR 社区)', 'low'],
  ['api_doc', 'API 文档/接口清单', 'site:{target_domain} (inurl:api OR inurl:rest OR intitle:接口文档 OR "api documentation")', 'low', EN]
]);

export const CATEGORY_META: CategoryMeta[] = [
  { id: 'leak_docs', name: '敏感文档', order: 0 },
  { id: 'pii', name: '个人信息', order: 1 },
  { id: 'panel', name: '后台入口', order: 2 },
  { id: 'sso', name: '统一认证', order: 3 },
  { id: 'component', name: '组件指纹', order: 4 },
  { id: 'config', name: '配置泄露', order: 5 },
  { id: 'directory', name: '目录遍历', order: 6 },
  { id: 'general', name: '通用侦察', order: 7 }
];

export const CATEGORY_NAME: Record<CategoryId, string> = CATEGORY_META.reduce(
  (acc, meta) => {
    acc[meta.id] = meta.name;
    return acc;
  },
  {} as Record<CategoryId, string>
);

export const BUILTIN_DORKS: Dork[] = [
  ...LEAK_DOCS,
  ...PII,
  ...PANEL,
  ...SSO,
  ...COMPONENT,
  ...CONFIG,
  ...DIRECTORY,
  ...GENERAL
];

/** 跨校猎洞：不限定具体学校，直接对全量 edu.cn 资产执行高危语法 */
export const GLOBAL_QUERIES: GlobalQuery[] = [
  { id: 'global_docs', name: '敏感文档（xls/xlsx）', template: 'site:edu.cn (filetype:xls OR filetype:xlsx) (学生名单 OR 花名册 OR 学籍 OR 身份证)' },
  { id: 'global_admin', name: '后台登录入口', template: 'site:edu.cn (inurl:admin OR intitle:管理登录 OR intitle:后台登录)' },
  { id: 'global_cas', name: 'CAS 统一认证', template: 'site:edu.cn (inurl:cas/login OR intitle:统一身份认证)' },
  { id: 'global_jw', name: '教务系统指纹', template: 'site:edu.cn (inurl:jwglxt OR inurl:jsxsd OR intitle:教务系统)' },
  { id: 'global_webvpn', name: 'WebVPN 入口', template: 'site:edu.cn (inurl:webvpn OR intitle:webvpn)' },
  { id: 'global_dir', name: '开放目录', template: 'site:edu.cn intitle:"index of"' },
  { id: 'global_error', name: '报错信息泄露', template: 'site:edu.cn ("mysql error" OR "syntax error" OR "fatal error")' },
  { id: 'global_config', name: '配置/备份文件', template: 'site:edu.cn (filetype:sql OR inurl:.env OR inurl:.git)' },
  { id: 'global_druid', name: 'Druid / Swagger', template: 'site:edu.cn (inurl:druid OR inurl:swagger-ui.html)' }
];
