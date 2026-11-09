# ChatGPT Bulk Delete 工程规格与协作规范 (AGENTS.md)

## 1. 项目定位与核心边界

- **项目定位**：ChatGPT 侧边栏对话与项目批量删除工具（Chrome Extension Manifest V3）。轻量原生体验增强，免额外浮窗面板，直接在侧边栏行级注入垃圾桶图标与多选复选框，支持单删与批量软删除（归档/隐藏）。
- **零权限设计（Least Privilege）**：`manifest.json` 中 `permissions` 与 `host_permissions` 保持缺省为空，不申请 `storage`、`identity`、`cookies` 等敏感权限，零外部网络请求。
- **数据安全硬红线**：
  - 严禁向任何第三方服务器回传用户 Token、会话历史、Prompt 或行为埋点。
  - 所有操作均依托当前页面已登录的会话上下文（Cookie / Bearer Token / Session）。
  - 删除请求仅对 ChatGPT 原生 `/backend-api/*` 接口发起同源调用。

## 2. 目录布局与文件职责 (Layout)

- `manifest.json`：声明 MV3 规范，匹配 `matches: ["https://chatgpt.com/*", "https://chat.openai.com/*"]`，声明 `world: "MAIN"` 和 `run_at: "document_start"`。
- `content.js`：核心主逻辑。在 MAIN 世界运行，监听侧边栏虚拟滚动列表、注入复选框与删除按钮、管理多选状态（支持 Shift 连选）、调用 ChatGPT 原生 session API 执行删除、执行请求间隔节流与风控规避。
- `content.css`：样式定义。原生对齐样式、垃圾桶图标高亮、暗黑与浅色主题适配（CSS 变量映射），严格约束命名空间为 `.cgbd-*`。
- `CONTRIBUTING.md`：贡献指南。包含无构建步骤的本地开发说明、基于 CDP 的 `test/run.mjs` 测试运行方式、PR 准则与提报规范。
- `GROWTH.md`：项目定位、受众、差异化竞争优势与开源分发规划。
- `test/`：离线回归测试套件。基于 Chrome DevTools Protocol (CDP) 驱动真实 `content.js` 对侧边栏静态 DOM 镜像运行断言。

## 3. 硬规则与不变式 (Invariants)

1. **零外部依赖与零回传**：代码库不得引入外部远程资源、CDN 脚本或遥测探针；禁止向非官方域名发送任何网络请求。
2. **像素级官方 UI 拟合**：
   - 界面视觉必须完全融入 ChatGPT 官方设计语言，严禁增加额外的说明文字、外挂条幅或 hover chip 等视觉杂质。
   - 垃圾桶图标优先克隆官方原生 SVG 标记（`applyTrashIcon()`），保持与原生 pin / edit / more 控件风格统一。
   - 适配宿主 CSS 变量（如 `--text-secondary` 等），自适应深浅主题，严禁硬编码破坏宿主规范。
3. **SPA 与虚拟列表稳健对抗**：
   - ChatGPT 侧栏基于 React / Next.js，具备路由动态切换、懒加载与虚拟滚动列表节点动态回收特征。
   - 采用持久化 `MutationObserver` 结合防抖（Debounce）监听 DOM 变化；定位目标容器使用多层级回退选择器（正则匹配 URL `/c/*` 与项目 `/g/*`），避免脆弱类名匹配。
   - 侧边栏折叠/收起时（`width <= 80`）静默跳过，避免在微标或移动端抽屉中误注入。
4. **风控规避与安全调用**：
   - 批量删除严禁无脑并发，必须设置模拟真实操作的请求间隔（200-300ms 节流队列）。
   - 遇到 HTTP 429 或限流状态时立即熔断并向用户反馈，避免触发账号封禁或 IP 封锁。
   - 单行删除异常不得阻塞后续队列执行。

## 4. 验证与调试流程

1. **本地解压加载**：
   - 打开 Chromium 浏览器（Chrome / Edge / Arc / Brave），进入 `chrome://extensions`。
   - 开启右上角“开发者模式（Developer mode）”。
   - 点击“加载已解压的扩展程序”，选择本仓库根目录。
   - 修改 `content.js` 或 `content.css` 后，在扩展管理卡片点击重新加载，并硬刷新 `chatgpt.com` 页面。
2. **场景实测验证清单**：
   - **登录态测试**：在 `chatgpt.com` 登录状态下，验证会话列表是否成功渲染复选框与单行垃圾桶按钮。
   - **主题切换**：分别在浅色（Light）与深色（Dark）模式下检查图标颜色与高亮状态，无样式割裂。
   - **多语言适配**：测试英文、中文、日文等语言界面下，“项目（Projects）”与普通对话的分组识别与删除功能。
   - **交互覆盖**：验证单条点击直接删除、多选勾选、`Shift + Click` 范围连选、顶部批量删除按钮唤起与执行确认。
3. **自动化回归套件**：
   - 本地 Node 22+ 环境运行基于 CDP 的回归测试：
     ```bash
     node test/run.mjs              # 核心回归测试（必须全部通过）
     node test/run.mjs --baseline   # 基线比对检测
     ```
4. **发布检查**：
   - 检查 `manifest.json` 版本号（SemVer）。
   - 检查仓库内无 `.DS_Store`、测试截图或临时脏数据。
   - 检查文档（`README.md` / `README.zh-CN.md`）功能描述同步。
