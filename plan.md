# Export YouTube Playlist：上线执行计划

最后更新：2026-07-22

## 1. 首发目标

在一周内将英文版 `Export YouTube Playlist` 部署到 Cloudflare Workers，并绑定：

- 正式域名：`https://exportyoutubeplaylist.com`
- 支持邮箱：`support@exportyoutubeplaylist.com`
- 数据库：Cloudflare D1
- 数据来源：官方 YouTube Data API v3

首发核心流程：

> 粘贴公开播放列表 URL → 选择 CSV/XLSX → Export → 下载文件或 ZIP → 显示成功提示与撒花效果

## 2. 已确认的产品决策

- 英文优先；i18n key 仍同时维护英文和中文，避免破坏构建。
- 匿名用户可以直接导出，登录不是导出的前置条件。
- 登录只开放 Google OAuth，不开放邮箱密码和 GitHub 登录。
- 登录功能为未来付费去广告权益保留；付款前不保存导出历史。
- 首发不保存播放列表 URL、视频数据或导出文件。
- 用户后台模块代码全部保留；首版隐藏 Billing、Payments、Credits、API Keys、Tickets 等导航，只展示 Profile。
- 用户可以退出登录和自助删除账号。
- 首发只支持公开播放列表，不申请读取用户 YouTube 私人数据的 OAuth 权限。
- 单个播放列表最多导出 500 条；对标站的 5,000 条支持放到稳定期评估。
- 首发格式为 CSV 和 XLSX；多选或未选择格式时下载 ZIP。
- Pricing 保留 Free 和 `Pro — Coming soon`；价格与计费周期待定，不启用付款按钮。
- AdSense 不阻塞上线；上线后申请，获批前不展示空广告位。
- 访问统计使用 Cloudflare Web Analytics，暂不接 Google Analytics 或 Sentry。
- 匿名导出接口使用 Cloudflare Turnstile 和生产可用的限流保护。
- 对外页面包括 Privacy、Terms、About、Contact，以及一篇英文导出指南。

## 3. 当前已完成

- [x] 英文产品首页及核心 Load → Export 交互
- [x] CSV/XLSX 多格式 ZIP 下载与成功提示
- [x] 19 列丰富元数据导出
- [x] YouTube URL 校验、官方 API 分页和服务端密钥读取
- [x] 单列表 500 条服务端限制
- [x] 不持久化用户播放列表或导出结果
- [x] Pricing 展示 Free + Pro Coming Soon
- [x] E Logo 与 favicon
- [x] Privacy Policy 与 Terms of Service 基础页面
- [x] 核心导出自动化测试

## 4. 上线前 P0 工作

### A. 登录和账户

- [x] 默认关闭邮箱密码、GitHub 和 Google One Tap，只开放 Google OAuth 按钮
- [x] Google OAuth 未配置时显示清晰的暂不可用状态
- [x] 登录成功默认进入 `/settings/profile`
- [x] 隐藏非首发用户后台导航，但保留对应代码和路由
- [x] 增加自助删除账号，删除用户、会话和未来可关联的账户数据
- [ ] 验证退出登录、OAuth 回调和正式域名 Cookie

### B. 防滥用

- [ ] 在播放列表 Load 请求前嵌入 Cloudflare Turnstile managed widget
- [ ] 服务端调用官方 `siteverify`，仅在 `success === true` 时执行 YouTube API 请求
- [ ] `TURNSTILE_SECRET` 仅保存在本地环境和 Cloudflare Secret
- [ ] 将进程内两秒限流升级为 Cloudflare 生产可用的限流方案
- [ ] 覆盖 Turnstile 失败、过期、重复提交和 429 错误提示

### C. 内容、信任与 SEO

- [x] 校对 Privacy/Terms：正式域名、支持邮箱、不保存导出数据、Google 登录
- [x] 新增 `/about`
- [x] 新增 `/contact`
- [x] 新增英文指南 `/blog/how-to-export-a-youtube-playlist-to-csv-or-excel`
- [x] 删除或隐藏 ShipAny 示例博客文章
- [x] 更新 footer、sitemap、robots、llms.txt 和 canonical
- [x] 检查所有公开页面 title、description、OG 与唯一 H1

### D. Cloudflare 生产环境

- [x] 使用项目部署流程生成正式 `wrangler.jsonc`
- [x] 创建并绑定 D1 数据库
- [x] 生成、审查并应用生产数据库迁移
- [x] 配置 `AUTH_SECRET`、`CONFIG_ENCRYPTION_KEY`、`YOUTUBE_API_KEY`
- [ ] 创建 Turnstile widget 并配置 `TURNSTILE_SECRET`
- [ ] 将 YouTube API Key 限制为 YouTube Data API v3
- [ ] 配置 Google OAuth Client ID/Secret 及正式回调地址
- [x] 绑定 `exportyoutubeplaylist.com`、HTTPS 和 DNS
- [ ] 配置 `support@exportyoutubeplaylist.com` Email Routing
- [ ] 开启 Cloudflare Web Analytics

### E. 验收

- [ ] 测试 1、50、51、200、500 条播放列表
- [ ] 测试空链接、错误链接、私人列表、不可访问列表、删除视频和 API 配额错误
- [ ] 验证 CSV、XLSX、ZIP、文件名、Unicode 与公式注入防护
- [x] 验证 390px、768px、1440px 布局和键盘操作
- [ ] 验证 Google 登录、退出与删除账号
- [x] `pnpm exec tsc --noEmit` 通过
- [x] 自动化测试通过
- [x] `pnpm build` 和 Cloudflare 构建通过
- [x] security-scan 无 HIGH
- [x] launch-audit 的响应式、SEO、性能、安全检查无阻断项

## 5. 当前发布状态（2026-07-22）

- [x] Cloudflare Worker 已部署到正式域名：`https://exportyoutubeplaylist.com`
- [x] D1 数据库、生产迁移、RBAC 初始化和 Worker Secrets 已完成
- [x] 线上首页、Pricing、Blog、About、Contact、Sitemap 与公开配置接口均返回 200
- [x] 线上真实播放列表验证通过：`Python Programming Beginner Tutorials` 返回 26/26 条
- [x] 匿名 Load → Export 核心流程可用
- [x] 正式域名已切换到 Cloudflare nameserver
- [x] 使用 Worker Route 接管 `exportyoutubeplaylist.com/*`，HTTPS 与线上导出验收通过
- [ ] Google OAuth、Turnstile、Email Routing 和 Web Analytics 后续配置

## 6. 一周排期

### Day 1：账户与导航

- Google-only 登录配置
- 登录后默认进入 Profile
- 隐藏暂未使用的用户后台导航
- 自助删除账号

### Day 2：防滥用

- Turnstile 前端组件
- 服务端 `siteverify`
- Cloudflare 生产限流
- 防滥用测试

### Day 3：内容

- About、Contact
- 校对 Privacy、Terms
- 英文导出指南
- 清理示例博客和失效入口

### Day 4：Cloudflare

- D1、迁移、Secrets
- Google OAuth
- 域名、DNS、Email Routing、Web Analytics

### Day 5：端到端 QA

- 播放列表测试矩阵
- 手机端和桌面端
- 导出文件完整性
- 错误状态与无障碍

### Day 6：上线审计

- 构建、SEO、性能、安全、响应式
- 修复 P0/P1 问题
- 生产部署与烟雾测试

### Day 7：缓冲与发布

- 修复生产问题
- 提交 sitemap/Search Console
- 记录版本、已知限制和回滚方式

## 7. 需要用户提供或操作

- [x] 提供/配置 YouTube Data API Key
- [ ] 创建 Google OAuth Web Client；加入正式域名和回调地址
- [x] 授权 Cloudflare 账户操作，创建 D1 和 Worker
- [ ] 创建 Turnstile widget（当前 Wrangler OAuth 权限不足，需在控制台完成）
- [ ] 指定 `support@exportyoutubeplaylist.com` 要转发到的真实邮箱
- [x] 在 Cloudflare 添加 `exportyoutubeplaylist.com`，并在 Spaceship 替换为 Cloudflare 分配的两个 nameserver

任何密钥不得发到公开文档、Git、客户端 bundle 或聊天记录；优先写入本地 Secret/Cloudflare Secret。

## 8. 上线后工作

### AdSense

- 网站上线并积累真实内容后申请 AdSense
- 获批后增加 CMP/Cookie consent、`ads.txt` 和广告位
- 登录用户的付费去广告权益在支付功能上线后生效

### 付费

- 确认一次性买断或订阅，以及最终价格
- 接入 checkout、webhook、订单和权益
- 付费权益仅控制广告展示，不影响匿名导出

### 扩展

- 根据流量、Worker 限制和 YouTube 配额评估 5,000 条播放列表
- 每 7–10 天最多上线一个有真实搜索意图的工具内页
- 每个工具必须独立完成：功能、唯一内容、SEO、测试、sitemap、部署和 Search Console 请求收录
- 不复制对标站正文或视觉；只参考工具信息架构和用户搜索意图

## 9. Tools 内页扩展路线

参考清单：`https://export-youtube-playlist.vercel.app/tools/`

对标站当前包含 18 个站内工具和 3 个跳转到外部站的个人数据导出工具。首轮只规划 18 个公开数据工具；Liked Music、Liked Videos、Subscriptions 依赖用户 YouTube OAuth 和更严格的审核，暂不纳入。

### 9.1 扩展前置条件

- [ ] Google Search Console 验证 Domain Property，并提交 `/sitemap.xml`
- [ ] 开启 Cloudflare Web Analytics，建立页面访问与转化基线
- [ ] YouTube API Key 限制为仅允许 YouTube Data API v3
- [ ] 完成 Turnstile、服务端 `siteverify` 和生产限流
- [ ] 完成 1、50、51、200、500 条及异常播放列表测试矩阵
- [ ] 开启 HTTP → HTTPS 强制跳转

### 9.2 统一工具架构

- [x] 新建 `/tools` 工具目录页，首批仅展示已上线工具
- [x] 抽取统一 Tool Page Shell：输入区、状态、结果、使用说明、FAQ、相关工具
- [x] Playlist 工具统一复用现有 `/api/youtube-playlist` 数据，不重复请求 YouTube
- [x] Video 工具统一使用一个受保护的单视频服务
- [x] Channel 工具统一使用一个频道解析与分页服务
- [x] 对相同 playlist/video/channel ID 增加 5 分钟短期缓存，减少重复配额消耗
- [ ] 所有工具复用 Turnstile、限流、错误模型和隐私约束

### 9.3 第一批：Playlist 核心集群

这些页面与现有产品关联最强、数据已经具备，应优先建立主题权威。

1. [x] `/tools/youtube-playlist-link-extractor`
   - 复用现有播放列表结果
   - 支持复制纯链接、标题 + 链接和 TXT 下载
   - CSV 固定为对标站兼容的 `Index,URL` 结构
   - 上线后观察 7–10 天再进入下一页
2. [x] `/tools/youtube-playlist-title-extractor`
   - 复用现有播放列表结果
   - 支持复制标题、编号标题和 TXT/CSV
   - CSV 固定为对标站兼容的 `Index,Title` 结构
3. [x] `/tools/youtube-playlist-analyzer`
   - 覆盖 playlist length/duration calculator 搜索意图
   - 展示视频数、总时长、平均时长、1.25×/1.5×/2×观看时间、总/平均互动数据
   - 支持下载逐视频分析 CSV，便于数据核验与回归测试
   - 首版不做复杂图表，先验证搜索和使用需求

第一批数据验收（2026-07-23）：

- [x] 使用同一公开播放列表对比原站与当前站：
      `PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7`
- [x] 两边均返回 26/26 条，视频 ID、标题、URL、频道、时长、上传时间
      100% 一致
- [x] 浏览、点赞、评论等实时计数按 1% 相对误差容差核验，100% 一致
- [x] 稳定字段精确匹配；浏览量等实时计数采用 1% 相对误差容差，三个工具均为
      100%

### 9.4 第二批：Video 高意图工具

4. [x] `/tools/download-youtube-thumbnail`
   - 根据视频 ID 生成标准缩略图地址，优先避免 API 调用
5. [x] `/tools/youtube-tag-extractor`
   - 单视频查询并复制公开 tags
6. [x] `/tools/youtube-description-extractor`
   - 提取公开 description、链接和邮箱
7. [x] `/tools/youtube-embed-code-generator`
   - 客户端生成 iframe，支持尺寸、开始时间、自动播放和循环
8. [x] `/tools/youtube-region-restriction-checker`
   - 展示 API 返回的公开区域限制；地图视图放第二版

### 9.5 第三批：Channel 基础工具

先完成频道 URL、handle、channel ID 和 uploads playlist 的统一解析，再连续复用。

9. [x] `/tools/youtube-channel-id-finder`
10. [x] `/tools/youtube-channel-to-playlist`
11. [x] `/tools/youtube-subscribe-link-generator`
12. [x] `/tools/youtube-channel-playlist-extractor`
13. [x] `/tools/youtube-channel-video-link-extractor`
14. [x] `/tools/youtube-channel-title-extractor`

### 9.6 第四批：Channel 重型工具

这些工具分页更多、配额和页面复杂度更高，必须在真实流量与配额数据稳定后开发。

15. [x] `/tools/export-youtube-channel`
16. [x] `/tools/youtube-channel-analyzer`
17. [x] `/tools/youtube-channel-keywords`
18. [x] `/tools/youtube-channel-banner-and-logo-downloader`

剩余 15 个工具的数据验收（2026-07-23）：

- [x] 使用同一公开视频 `YYXdXT2l-Gg` 与同一公开频道
      `UCCezIgC97PvUuR4_gbFUs5g`（Corey Schafer）建立固定对标样本
- [x] 统一单视频服务覆盖缩略图、tags、description、embed 和地区限制
- [x] 统一频道服务覆盖 channel ID、uploads playlist、订阅链接、24 个公开播放列表和
      276 个公开视频，并支持最多 5,000 条分页
- [x] Channel CSV/XLSX 使用对标站兼容的 17 列结构；列表字段按内容集合比较，忽略
      原站 Python set 导致的不稳定顺序
- [x] 15 个工具共比较 8,215 个数据单元格，匹配 8,197 个，总一致率
      **99.78%**；每个工具均达到 95%，最低为频道完整导出的 **99.62%**
- [x] 对标脚本：`scripts/compare-public-tools-reference.ts`

全部 18 个站内工具的统一验收（2026-07-23）：

- [x] 将第一批 3 个 Playlist 工具和剩余 15 个 Video/Channel 工具纳入同一条可重复
      执行的对标命令
- [x] 18 个工具共比较 8,501 个数据单元格，匹配 8,483 个，总一致率
      **99.79%**
- [x] 17 个工具为 **100%**，最低的频道完整导出为 **99.62%**；每个工具均高于
      95% 门槛
- [x] 覆盖审计脚本确认：18 条工具路由、英文/中文唯一 SEO 文案、`/tools` 目录、
      header、sitemap、llms.txt 和 llms-full.txt 均已接线
- [x] Header Tools 菜单改为从统一工具定义生成，18 个工具均可点击，不再显示
      Coming Soon；桌面菜单支持视口内滚动
- [x] 本地真实输入烟雾测试：公开视频可返回 5 个缩略图尺寸，公开频道 handle 可解析为
      正确 Channel ID，非法 URL 可立即显示错误
- [x] 为依赖系统代理的本地开发环境增加 `pnpm dev:proxy`，避免 YouTube API 请求一直
      处于加载状态
- [x] 直接调用生产 SSR handler 渲染英文/中文共 36 个页面，全部返回 200，且逐页具有
      唯一 title/H1、description、canonical、结构化数据和可交互表单
- [x] 对标结果：`docs/research/public-tools-parity-report.md`
- [x] 覆盖脚本：`scripts/audit-public-tools-coverage.ts`
- [x] 生产运行时脚本：`scripts/audit-public-tools-runtime.ts`

### 9.7 每个内页的上线门槛

- [x] 一个页面只对应一个清晰搜索意图，避免和首页或其他工具页关键词互抢
- [x] 唯一 title、description、canonical、H1 和正文，不批量替换关键词生成薄页面
- [x] 提供可立即使用的真实功能，不发布 Coming Soon 或仅内容页
- [x] 至少包含使用步骤、输入示例、错误说明、隐私说明、FAQ 和相关工具内链
- [x] 增加 Breadcrumb 与 SoftwareApplication/WebApplication 结构化数据（适用时）
- [x] 更新导航、`/tools`、sitemap、robots/llms 和相关页面内链
- [x] 覆盖正常、错误、配额、移动端和键盘操作测试
- [x] 使用同一播放列表与对标站抽样对比；稳定字段精确匹配，实时计数允许
      1% 相对误差，总体可比单元格一致率不得低于 95%
- [x] `pnpm exec tsc --noEmit`、自动化测试、`pnpm build`、security-scan 通过
- [ ] 部署后完成线上真实输入烟雾测试
- [ ] 在 Search Console 请求收录，并记录发布日期、曝光、点击、CTR 和导出/复制转化

### 9.8 继续或停止规则

- 新页面上线后至少观察 7–10 天，再开发下一页
- 有曝光但 CTR 低：先调整 title/description，不立即新建相似页面
- 有点击但工具使用率低：先修输入、结果和速度
- 无曝光：检查收录、内链、搜索意图和内容质量；不靠批量页面解决
- 当日预计 YouTube 配额超过 70% 时暂停新重型工具，优先缓存、限流或申请官方配额扩展
