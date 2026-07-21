# Export YouTube Playlist：7 天上线计划

## 1. 目标与约束

### 上线目标

在 7 个自然日内，基于当前 ShipAny TanStack Start 模板上线英文版 YouTube Playlist 导出工具。首发只打透一个核心流程：

> 粘贴公开的 YouTube Playlist URL → 获取视频列表 → 预览结果 → 导出 CSV/XLSX 或复制全部视频链接。

### 已确认约束

- 目标市场：英文用户，默认语言为 English。
- 开发资源：个人开发，必须限制首周并行范围。
- 域名：全新域名，具体域名尚未确定。
- 数据来源：只使用官方 YouTube Data API，不做网页抓取。
- 商业模式：AdSense + 付费版。
- 当前缺口：YouTube API、生产环境、域名、Stripe/AdSense 配置均未准备。
- 参考站：`https://export-youtube-playlist.vercel.app/`，只参考信息架构、功能优先级和交互流程，不复制其品牌、文案或受保护资产。

### 技术决策

- 应用名称暂定：`Export YouTube Playlist`，Day 1 可一次性改名。
- 使用现有 TanStack Start + React 19 + shadcn/ui 模板，不重建认证、支付、SEO、博客、法务页和后台底座。
- 本地开发使用 SQLite；首发生产环境默认使用 Cloudflare Workers + D1。
- 核心导出流程首发允许匿名使用，不强制注册。
- 模板已有认证、支付和订阅模块，首周只做必要接线，不重写这些模块。
- 英文为公开主语言；新增 i18n key 仍同步维护 `messages/en.json` 与 `messages/zh.json`，避免破坏模板编译规则。

## 2. 一周上线的完成定义

Day 7 结束时必须同时满足：

1. 生产 URL 可访问；域名未完成时先用 `workers.dev` 地址上线。
2. 用户可以提交有效的公开 YouTube Playlist URL。
3. 页面展示播放列表标题、视频数量和视频预览表格。
4. 每个视频至少返回：标题、视频 URL、频道名称、发布日期、时长、播放量。
5. 用户可以下载 CSV 和 XLSX，并能一键复制全部视频链接。
6. 无效 URL、私密/不可访问列表、空列表、删除视频、API 超时和配额不足都有明确错误信息。
7. 首页、隐私政策、服务条款、联系入口、robots、sitemap 和基础 SEO 元数据可用。
8. 390px、768px、1440px 三档页面可用，无明显布局错误。
9. `pnpm build` 通过，安全扫描无 HIGH 级问题。
10. YouTube API Key 不进入客户端代码、日志、Git 或下载文件。

## 3. 首周范围

### P0：必须上线

- 英文首页与核心导出表单。
- YouTube Playlist URL 校验与 Playlist ID 提取。
- 官方 YouTube Data API 分页读取。
- 视频数据标准化、预览表格和状态反馈。
- CSV 下载。
- XLSX 下载。
- Copy All Links。
- 免费版单次视频数量上限，默认先设为 500，并通过服务端配置调整。
- 匿名请求限流、超时、最大分页数和基础滥用保护。
- 英文 About/Privacy/Terms/Contact 内容。
- Canonical、Open Graph、robots、sitemap、llms.txt。
- Google Analytics 或 Plausible 二选一。
- Cloudflare Workers + D1 生产部署。

### P1：凭证及时到位才上线

- Stripe 付费结账与订阅：只有 Stripe 凭证在 Day 2 前准备好才进入首发。
- Pricing 页面：凭证未到位时展示 `Pro — Coming Soon`，不提供失效的支付按钮。
- AdSense：只在账号和站点审核完成后启用；首周可预留组件，但默认不渲染广告位。
- Turnstile：只有出现明显滥用或 API 配额压力时启用，不阻塞首发。

### 首周明确不做

- YouTube Channel Export。
- Playlist/Channel Analyzer。
- 独立的 Link Extractor、Title Extractor 内页。
- JSON、XML、SQLite、Word、M3U 等扩展格式。
- 批量播放列表、导出历史、定时任务和邮件通知。
- 登录后 Dashboard 的产品化改造。
- 完整中文站运营。
- 复制参考站的图片、Logo、文案和广告布局。

## 4. 模板内的实施位置

### 项目配置

- `.env.development`：本地 URL、应用名、SQLite、AUTH_SECRET、YouTube API Key。
- `.env.example`：增加变量名称与说明，不写任何真实密钥。
- `src/config/index.ts`：增加服务端专用 YouTube 配置读取。
- `public/logo.svg`、`public/favicon.svg`：替换为产品字母标识，不重新引入模板二进制 Logo。
- `messages/en.json`、`messages/zh.json`：更新产品名、首页、工具、FAQ、错误和价格相关文案。

### 业务模块

- `src/modules/youtube-playlist/service.ts`
  - 解析并验证 Playlist ID。
  - 请求 YouTube API。
  - 处理分页和视频详情批量查询。
  - 统一返回结构并过滤不安全内容。
  - 统一错误类型，不把上游响应或密钥直接返回客户端。
- `src/routes/api/youtube-playlist.ts`
  - 使用 POST。
  - 校验 JSON body 和 URL 长度。
  - 应用限流、超时和视频数量上限。
  - 调用业务 service。
  - 使用 `respData` / `respErr` 返回。

### 前端

- `src/components/playlist-exporter.tsx`
  - 只接收内容 props，不直接读取 i18n。
  - 使用 TanStack Query mutation + `apiPost`，不使用裸 `fetch`。
  - 包含表单、loading、进度、错误、结果预览和导出操作。
- `src/blocks/export-tool.tsx`
  - 读取 i18n 文案并配置 `PlaylistExporter`。
- `src/lib/playlist-export.ts`
  - CSV 转义、文件名清洗、XLSX 生成、文本复制。
- `src/routes/index.tsx`
  - 重组为 Header → Hero/Export Tool → Features → How It Works → Pricing → FAQ → Blog/Guides → Footer。
- `src/blocks/*`
  - 重写模板 demo 内容；保留可复用的 `src/components/*` 与 `src/components/ui/*`。

### 内容与 SEO

- 更新 `src/content/pages/privacy-policy.{en,zh}.mdx`。
- 更新 `src/content/pages/terms-of-service.{en,zh}.mdx`。
- 新增 About/Contact 时使用模板的 static-page 模式。
- 更新 `src/routes/robots[.]txt.ts`、`src/routes/sitemap[.]xml.ts`、`src/routes/llms[.]txt.ts`。
- 首页提供真实工具说明、3 步使用流程、隐私/安全说明和 FAQ，避免关键词堆砌。

## 5. 7 天执行排期

### Day 1 — 模板启动与外部凭证

#### 开发任务

- 安装依赖并运行一次基线 `pnpm build`。
- 创建 `.env.development`，本地采用 SQLite。
- 运行 `pnpm db:setup`、`pnpm db:push`。
- 设置应用名、描述、Logo、favicon 和默认英文语言。
- 确认保留模块：Auth、Payment、Subscription、Config、Posts、Admin。
- 关闭首页未使用的模板 CTA，避免跳转到未完成 Dashboard。

#### 用户必须完成

- 创建 Google Cloud Project。
- 启用 YouTube Data API v3。
- 创建并限制 API Key。
- 决定产品名和拟购买域名；未决定不阻塞开发。
- 若首周要开付费，准备 Stripe 测试/生产账号。

#### 当日验收

- 模板可以本地启动和构建。
- YouTube API Key 可以从服务端成功请求一个测试播放列表。
- 浏览器构建产物中搜索不到 API Key。

### Day 2 — 参考结构与产品页面骨架

#### 开发任务

- 按本地 `clone-website` 流程提取参考站桌面、平板、移动端的信息架构与交互模型，并保存可审计的设计参考；不复制品牌内容与资产。
- 只保留首发需要的页面结构：Header、Hero、工具表单、价值点、使用步骤、Pricing、FAQ、Footer。
- 建立自己的颜色、字体和间距 token。
- 重写首页英文文案与导航，不复制参考站内容。
- 完成 1440px 与 390px 的首页骨架。

#### 当日验收

- 首页没有 ShipAny demo 文案或模板归因。
- 首页首屏直接出现 Playlist URL 输入框。
- 移动端用户不需要先滚动大段营销内容才能使用工具。

### Day 3 — YouTube Playlist 服务与 API

#### 开发任务

- 建立 `youtube-playlist` module 和 POST API route。
- 完成 URL/Playlist ID 解析、分页、视频详情查询和字段标准化。
- 实现服务端超时、数量上限、错误映射和最小间隔限流。
- 不持久化用户提交的 Playlist URL 或完整导出结果。
- 使用至少 10 个测试链接覆盖正常与异常情况。

#### 当日验收

- API 对公开列表返回稳定 JSON 结构。
- 50、51、200、500 视频的分页逻辑可工作。
- 私密、无效、空列表、删除视频不会导致 500 或泄漏上游错误。

### Day 4 — 核心交互与文件导出

#### 开发任务

- 完成表单提交、loading、错误提示和结果摘要。
- 完成移动端可用的结果预览表格。
- 实现 CSV、XLSX 和 Copy All Links。
- 文件名从播放列表标题生成并进行安全清洗。
- 加入重复提交保护和导出成功事件。

#### 当日验收

- 从粘贴 URL 到下载 CSV 的完整链路成功。
- CSV 可在 Excel/Google Sheets 正确打开，特殊字符、逗号、换行和 Unicode 不错列。
- XLSX 列名、数据类型和文件名正确。
- Copy All Links 的顺序与播放列表一致。

### Day 5 — SEO、法务与商业化接线

#### 开发任务

- 更新 title、description、canonical、OG、hreflang。
- 更新 sitemap、robots、llms.txt。
- 完成 Privacy、Terms、About、Contact。
- 接入 Analytics 事件：提交、成功、失败类型、CSV、XLSX、Copy Links。
- 完成 Pricing 页面状态：
  - Stripe 已准备：使用模板现有支付模块接线和测试。
  - Stripe 未准备：展示 Coming Soon/Waitlist，不渲染假 checkout。
- AdSense 组件保持 feature flag 关闭，审核通过后再启用。

#### 当日验收

- 所有首发 URL 有正确的英文 title/description。
- sitemap 只包含真实、可用、允许索引的页面。
- 页面不暴露 API Key、内部异常栈或用户 URL 历史。

### Day 6 — 全面 QA 与部署预演

#### 开发任务

- 在 390px、768px、1440px 检查响应式和主题。
- 测试公开列表、YouTube Music 列表、超长列表、删除视频、无效输入和重复点击。
- 运行 `pnpm build`。
- 运行项目 `security-scan`；修复全部 HIGH 问题。
- 运行 `launch-audit all`，优先修复移动端、SEO、性能和安全阻断项。
- 创建 `wrangler.jsonc`，创建 D1，生成/审查生产迁移。
- 准备 `.env.production`、AUTH_SECRET、CONFIG_ENCRYPTION_KEY。

#### 当日验收

- 生产 preset 构建通过。
- 安全扫描无 HIGH。
- 测试矩阵无 P0/P1 缺陷。
- D1、Worker、生产密钥和生产 URL 配置齐全。

### Day 7 — 发布与生产验证

#### 开发任务

- 经最终确认后运行模板规定的 Cloudflare 部署流程。
- 应用 D1 生产迁移和 RBAC 初始化。
- 绑定自定义域名；域名未就绪则先使用 `workers.dev`。
- 生产环境执行完整导出烟雾测试。
- 验证 canonical、robots、sitemap、404、隐私页和下载响应。
- 提交 Google Search Console，记录生产基线。

#### 当日验收

- 首页和核心 API 可从公网使用。
- 使用 3 个不同规模的真实播放列表完成 CSV/XLSX 下载。
- 生产日志没有密钥、完整用户输入或异常栈泄漏。
- 记录上线时间、版本、已知限制和回滚方式。

## 6. 上线门槛与测试矩阵

### 功能门槛

- 至少 20 个测试播放列表通过；有效公开列表成功率目标不低于 95%。
- 1、50、51、200、500 视频的分页和导出通过。
- CSV/XLSX/Copy Links 三个出口都使用同一份标准化数据。
- 用户连续点击不会产生并发风暴或重复下载。
- 服务端限制 URL 长度、最大视频数、超时和请求频率。

### 安全门槛

- API Key 仅在服务端配置。
- 不把用户输入拼接进 shell、SQL、HTML 或文件路径。
- 错误信息不包含上游原始响应、堆栈或密钥。
- CSV 防公式注入：以 `=`, `+`, `-`, `@` 开头的外部文本按安全策略转义。
- 下载文件名移除路径字符和控制字符。
- 提交前执行本项目 `security-scan`；有 HIGH 则禁止提交和发布。

### 体验与 SEO 门槛

- 首屏工具可在移动端直接使用。
- 没有空导航、空博客、无效支付按钮和未完成 Dashboard 链接。
- 每页只保留一个明确 H1。
- Canonical、Open Graph、favicon、robots、sitemap 正确。
- 重要按钮有 loading/disabled/error/success 状态。

## 7. 一周内的降级顺序

若时间不足，按以下顺序降级，不能牺牲核心导出可靠性：

1. 延后 AdSense 展示。
2. 延后 Stripe checkout，保留 Pricing + Coming Soon。
3. 延后博客区块，只保留一篇使用指南。
4. 延后 XLSX，确保 CSV + Copy Links 正式可用；XLSX 在 Day 8–10 补齐。
5. 使用 `workers.dev` 首发，之后再绑定自定义域名。

不能降级：官方 API、服务端密钥保护、错误处理、CSV 正确性、移动端、Privacy/Terms、生产构建和安全扫描。

## 8. 上线后的 30 天内页节奏

| 时间 | 页面/功能 | 上线条件 |
| --- | --- | --- |
| Day 10–12 | `/tools/youtube-playlist-link-extractor/` | 复用首页 API；核心服务稳定 |
| Day 14 | How to Export YouTube Playlist to Excel | 使用真实截图和真实导出步骤 |
| Day 18–21 | `/tools/youtube-playlist-title-extractor/` | 有真实标题复制/下载需求 |
| Day 24 | Notion 或 NotebookLM 使用指南 | 根据搜索与用户反馈二选一 |
| Day 30+ | YouTube Channel Export | 至少 100 次成功导出且配额成本可控 |

稳定期发布频率：每 7–10 天最多 1 个工具页，每周 1–2 篇真正有场景价值的文章。Analyzer 不早于第 8 周。

## 9. Day 1 前需要用户提供的资料

### 必须

- 最终产品名，或确认沿用 `Export YouTube Playlist`。
- Google Cloud 项目与 YouTube Data API Key。
- Cloudflare 账号授权。

### 可延后

- 自定义域名。
- Stripe 凭证、产品价格和 webhook 配置。
- AdSense Publisher ID 与审核结果。
- Google Analytics ID 或 Plausible 域名。
- 管理员邮箱和初始密码。

## 10. 首周成功指标

- 核心目标：上线后获得前 20 个真实成功导出。
- 可靠性：有效公开列表成功率 ≥ 95%。
- 产品：提交后成功下载或复制的完成率可被 Analytics 统计。
- 成本：能够看到每天请求量、失败原因和 YouTube API 配额消耗。
- 商业信号：记录 Pro 点击、价格页访问和批量/大列表需求，不以首周付费收入作为上线门槛。
