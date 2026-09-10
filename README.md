# crazyedusrc 🎯

**EduSRC 教育行业漏洞猎洞工具 —— 基于搜索引擎 Dork 的一键式侦察 Chrome 扩展**

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=google-chrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Author](https://img.shields.io/badge/author-dollmarker-black?style=flat-square)

</div>

---

## ⚠️ 免责声明

**本工具仅用于 EduSRC 等平台授权范围内的合法安全研究与漏洞挖掘。** 搜索引擎发现目标 ≠ 授权测试，实际测试前请确认目标在平台收录范围内并遵守相关法律法规。使用者对自身行为独立承担责任。

## 📖 简介

crazyedusrc 是一款面向 **EduSRC（教育行业漏洞报告平台）** 场景的 Chrome 扩展。在 Google / 百度 / Bing 的搜索结果页自动注入猎洞侧边栏，将教育行业漏洞挖掘中最常用的搜索引擎 Dork 武器化为一键操作：

- 输入 `site:目标大学.edu.cn` 触发侧边栏
- 按**攻击面分类**一键执行 40+ 条教育行业专用语法
- 搜索结果 URL 批量提取，敏感目标自动高亮
- 一键联动 Fofa / Quake / Hunter / ZoomEye 深挖资产

## ✨ 核心功能

### 🎯 Edu 专用语法库（40+ 条）

按攻击面分类组织，全部支持 `{target_domain}` 占位符适配任意目标：

| 分类 | 覆盖场景 |
|------|----------|
| 📄 敏感文档 | 学生名单/花名册/学籍、身份证号文档、录取名单、成绩单、奖学金公示、教职工信息 |
| 🆔 个人信息 | 身份证+手机号关键词组合、简历泄露、试题答案 |
| 🔐 后台入口 | 管理后台、OA 系统、一卡通、图书馆、宿舍后勤、缴费财务 |
| 🔑 统一认证 | CAS 统一认证、WebVPN、SSO 门户、邮箱系统 |
| 🧩 组件指纹 | 正方/强智/青果教务系统、招生就业系统、Nacos、Druid、Swagger、Jenkins |
| 💾 配置泄露 | 数据库备份、网站备份包、.env/config、.git/.svn |
| 📁 目录遍历 | 开放目录、上传目录 |
| 🔍 通用侦察 | 报错泄露、测试环境、论坛社区 |

### 🛰️ 资产测绘联动

把当前 `site:` 目标一键转为网络空间测绘平台查询语法并跳转，实现 **搜索引擎猎洞 → 资产测绘深挖** 组合拳：

| 平台 | 转换语法 |
|------|----------|
| Fofa | `domain="xxx.edu.cn"`（qbase64） |
| 360 Quake | `domain:"xxx.edu.cn"` |
| 鹰图 Hunter | `domain.suffix="xxx.edu.cn"` |
| ZoomEye | `site:"xxx.edu.cn"` |

### ⚡ 一键跑高危

按当前域名批量执行所有已启用的高危（high）语法，通过 Background Service Worker 并发打开标签页（默认上限 5 个，可配置），避免逐条手点。

### 🌐 Edu 全局跨校猎洞

侧边栏"Edu 全局"菜单直接对全量 `site:edu.cn` 资产执行 7 类高危语法（敏感文档 / 后台入口 / CAS 认证 / 目录遍历 / 报错泄露 / 教务系统 / WebVPN），适合发现批量化的同组件、同类型漏洞。

### 🔦 敏感 URL 特征高亮

URL 提取面板内置 8 类敏感特征识别（数据库 / 备份 / 配置 / 版本控制 / 后台 / 学生数据 / 证件信息 / 接口调试），命中的 URL 自动打红色标签，快速锁定高价值目标。

### 🗂️ 其他特性

- 语法按攻击面分组渲染（可关闭）
- 支持自定义语法 + 独立开关
- URL 黑名单（域名 / 通配符 / 正则）
- 明暗双主题自动适配
- 数据全部本地存储，零追踪

## 🚀 安装

### 方式一：从源码构建

```bash
git clone https://github.com/dollmarker/crazy_edusrc.git
cd crazy_edusrc
npm install
npm run build
```

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择 `dist/` 目录

### 方式二：直接加载

Release 中提供构建好的产物，解压后按上述步骤加载即可。

## 📖 使用指南

1. **定向猎洞**：在搜索引擎执行 `site:目标学校.edu.cn`，侧边栏自动出现
2. **逐面排查**：按分类点击语法按钮（敏感文档 → 后台 → 认证 → 组件 → 配置）
3. **提取 URL**：点击"提取URL"，红色标记即敏感目标
4. **组合拳**：⚡ 一键跑高危批量侦察 + 🛰️ 测绘平台深挖资产
5. **跨校扫描**：换目标学校，或用 🌐"Edu 全局"直接扫全 edu.cn 资产

> 💡 **提示**：百度对 edu.cn 中文文档收录较好，Google/Bing 支持 `intitle:`、`inurl:` 等高级语法，建议多引擎交叉使用。

## ⚙️ 设置项

| 设置 | 默认 | 说明 |
|------|------|------|
| `groupByCategory` | `true` | 语法按钮按攻击面分类分组 |
| `assetPanelEnabled` | `true` | 显示资产测绘联动面板 |
| `batchTabLimit` | `5` | 一键跑高危单次打开标签页上限 |
| `sensitiveHighlightEnabled` | `true` | 敏感 URL 特征高亮 |

## 🏗️ 技术栈

TypeScript 5 · Chrome Extension MV3 · Webpack 5 · 零运行时依赖

```
src/
├── constants/eduSyntax.ts      # Edu 专用语法库 + 分类元数据
├── constants/syntax.ts         # 基础语法库（合并导出）
├── services/AssetSearchService.ts  # 资产测绘平台联动
├── core/SidebarManager.ts      # 侧边栏核心（注入/事件/批量执行）
├── ui/SidebarRenderer.ts       # 分组渲染 + 资产面板
├── ui/UrlPanelRenderer.ts      # 敏感 URL 高亮
└── background/background.ts    # 批量标签页管理
```

## 🙏 致谢

本项目基于开源项目 [google-hacking-assistant](https://github.com/Pa55w0rd/google-hacking-assistant) 二次开发而来，感谢原项目的优秀架构与基础功能。

## 📄 License

[MIT](LICENSE) © dollmarker
