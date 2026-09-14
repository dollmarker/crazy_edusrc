# Changelog

## v2.0.0

> 全量重构版本。相对 v1.0 属于结构级重写：面板架构、样式体系、状态管理、提取逻辑全部换掉，
> 因此主版本号从 1.x 直接升为 2.0.0。

### 重构 / 性能
- 面板改为 **Shadow DOM + 独立 fixed 宿主**，不再改写宿主页面的 `#rhs` / `#content_right` / `#b_context`，
  也不再向页面注入任何 CSS
- 点击路径去异步化：设置 / 语法库 / 执行记录启动时一次性入内存，点击时**完全同步**取用
  —— 这是「点击不流畅」的根治
- 事件统一为面板级委托（1 个 listener 取代 N 个）
- 导航监听从 `document` 全量 `subtree` MutationObserver 改为 1 秒 href 字符串比较 + popstate
- 暗色主题改为 CSS 变量，删除 176 条 `!important` 覆盖与递归 `data-theme` 写入
- 图标体系统一为内联 SVG，移除 Font Awesome 依赖与字体文件

### 样式
- **实心白底 + 清晰描边**，去掉全部半透明填充与大面积模糊阴影（消除"毛玻璃"观感）
- **每条语法是一张独立的圆角描边卡片**；hover 描边变蓝并上浮 1px，点击缩放回弹 + 描边闪烁
- 执行过的卡片整体转为浅绿底 + 绿色勾选
- 标签页改为分段控件，分类与扩展入口改为胶囊标签，悬浮球改为圆角方形
- 设置页与弹窗不再依赖 CDN，纯本地 CSS

### 新增
- **已执行记录**：按域名记录跑过的语法，跨会话保留，悬浮球显示进度
- **语法搜索与分类筛选**，面板内 `/` 快速聚焦
- **资产测绘四档查询**：主域 / **证书拓线** / 组件指纹 / 备案主体，平台配置声明化
- 扩展侦察入口：**crt.name**、Wayback、VirusTotal、Shodan、爱企查、ICP 备案
- **队列式一键跑高危**：全量入队、分批推进、随机抖动延迟、进度条与停止
- 快捷键 `Alt+Shift+S` / `R` / `U`
- 敏感 URL 三级分级着色 + 导出 CSV
- 语法库导入 / 导出 JSON（含结构与占位符校验）
- 面板可拖拽 + 位置记忆 + 收起为悬浮球
- 首次使用合规提示（关于页）

### 修复
- **「提取 URL 没用」**，三个原因一起修掉：
  1. 排除选择器过于宽泛（照搬 v1.0 的 `.o3j99` / `.bj9MHd` 等，可能是结果的祖先节点，一刀切掉整页结果）
  2. Google 遗留结果是相对路径 `/url?q=<真实地址>`，用 `a[href^="http"]` 匹配不到，
     且会被误判成"搜索引擎自身链接"丢弃
  3. 只有一层选择器，没有兜底
  现在改为三层策略（引擎选择器 → 结果区容器 → 全页），并在空结果时显示诊断计数 + 提供「强制全页扫描」按钮
- 选项页保存设置会丢失 4 个设置项（`groupByCategory` / `assetPanelEnabled` /
  `sensitiveHighlightEnabled` / `batchTabLimit`）→ 改为合并式保存
- `sensitiveHighlightEnabled` 定义了但从未被读取 → 现已生效并补齐 UI
- 侧边栏内 Font Awesome 图标全部空白 → 内联 SVG
- 复制 URL 后敏感标签结构被抹掉 → 重建完整结构
- 复制到剪贴板在文档失焦时 `navigator.clipboard` 抛错 → 回退 `execCommand`
- `site:` 目标域名未清洗（引号 / 通配符 / 路径 / 端口）→ 统一 `cleanDomain()`
- 切换测绘查询模式时整块重建按钮导致焦点丢失 → 改为就地更新类名
- 打包产物混入 56 个无用 `.d.ts` / `.d.ts.map`
- 权限冗余（`tabs` / `scripting` 未使用）与无用的 `web_accessible_resources`
- 语法名未转义即写入 innerHTML
- 仓库缺少 LICENSE 文件

### 变更
- `crt.sh` 入口替换为 **`crt.name`**：`https://crt.name/v1/search?apex=<域名>`（国内直连，返回子域名清单）
- 语法库扩展到 60+ 条，补充教务新版本（jwglxt / jsxsd）、Spring Boot、泛微 / 致远 / 通达、用友、深信服 WebVPN 等指纹
- 最低 Chrome 版本 102

## v1.0.0

- 首个公开版本：Edu 专用语法库（40+）、Fofa/Quake/Hunter/ZoomEye 联动、一键跑高危、敏感 URL 高亮
