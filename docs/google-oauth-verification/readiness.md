# YouTube 数据生命周期修复与上线验收

更新：2026-10-18。**经用户审查批准，生产数据库迁移及应用部署已完成，生产 Cron 维护任务已成功执行。** 真实 YouTube 重新授权、私有读取、Excel 导出与应用内断开清理已验证；外部 Google 撤销、账号删除、生产过期清理、邮件发送及完整私密页面网络检查仍待完成；Google 控制台此前保存的是旧 `Playlist Backup` / PB Logo、链接和范围，受众为 External / In production，旧品牌验证曾通过并发布，当前 `Playlist Expoter` 与原版 E 图标也已同步、验证并发布；敏感权限审核尚未完成。

**当前状态**：品牌严格使用 `Playlist Expoter`，原版 E 图标已恢复。生产版本 `3897fcb2-322a-4cc5-bf18-b7271e12327f` 于 `2026-10-18T14:56:46Z` 部署并承接 100% 流量；Google Console 已保存新名称和 E 图标，品牌验证通过并发布，最终回读“您的品牌已经过验证，正在向用户显示。”。下文 `Playlist Backup` / PB 内容保留为历史记录。最终 8:36 视频已完成并通过本地 QA，用户确认后已上传为 Unlisted：[演示视频](https://youtu.be/lFRCukfn3cg)。四类来源均已读取非空结果，用户批准的四条测试备份已于约 `2026-10-19 02:38 UTC` 断开并删除。869 字符权限理由和视频链接已在 Data access 保存成功。无痕窗口已验证视频实际播放；约 2026-10-19 02:58 UTC 已提交，Verification Center 回读“您的应用的数据访问权限正在审核中。”，尚未获批。

## 已实现

| 原问题                  | 修复位置与行为                                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disconnect 仅清空 token | [共享生命周期服务](../../src/core/youtube-lifecycle/service.ts)：原子保存加密撤销任务并删除连接，随后删除关联收藏/outbox；立即尝试 Google revoke，失败可跨重启重试                                                                                                      |
| 账号删除没有专项清理    | [Auth beforeDelete](../../src/core/auth/index.ts)：删除标记先封住新授权与备份写入，清理全部用户收藏/workspace/outbox；撤销任务不依赖用户外键而继续存活                                                                                                                  |
| 收藏仅软删除            | [Guard service](../../src/modules/playlist-guard/service.ts)：显式物理删除父子记录，不只依赖生产外键；维护任务清理历史软删除                                                                                                                                            |
| API 元数据无保存期限    | [Retention](../../src/lib/playlist-guard/retention.ts)：30 天按实际获取时间裁剪快照、missing、sourceTitle；不因暂停、失权或新扫描延长旧数据；读/导出和邮件也检查                                                                                                        |
| 外部撤销未周期核验      | [连接 service](../../src/modules/youtube-connections/service.ts)：独立安排授权核验与频道资料刷新；已知 invalid_grant/401 清理，无法核验超过 30 天失败关闭                                                                                                               |
| 删除后并发写回          | 一次性 OAuth nonce、用户删除标记、授权归属条件、凭据/版本/lease 条件写入，阻止旧 callback、refresh、scan 恢复记录                                                                                                                                                       |
| 邮件保留与发送缺口      | 删除时清理 outbox；发送前再次校验授权/用户/父记录版本；失败上限清空 payload，副本按最早 API 读取时间过期；已进入供应商的发送无法召回                                                                                                                                    |
| 清理依赖收费功能开关    | [内置任务](../../server/tasks/playlist-guard.ts) 每 5 分钟先做隐私维护，再判断商业监控开关；[维护编排](../../server/utils/youtube-maintenance.ts) 持久化分页游标，一阶段失败仍尝试其他阶段                                                                              |
| 私密 DOM 上运行可选脚本 | [路由分类/响应保护](../../src/lib/private-document.ts)、[root](../../src/routes/__root.tsx)、[server](../../src/server.ts)：忽略路径大小写，对重复斜杠等重写歧义路径失败关闭，语言前缀一致，跨公开/私密页面整页切换；禁止可选脚本，CSP 限制脚本/连接，私密响应 no-store |
| 政策与功能不符          | [披露对照](privacy-disclosures.md)：隐私政策、条款、联系页、断开确认和相关中英文文案已同步                                                                                                                                                                              |

## 数据库变更与生产应用记录

审查文件：[0002_youtube_lifecycle.sql](migrations/0002_youtube_lifecycle.sql)。由 `pnpm db:generate` 生成的 SQLite/D1 迁移原件为 `drizzle/0002_wooden_overlord.sql`；因为本仓库忽略 `/drizzle/`，特保存同内容的可跟踪审查副本。

变更只有：

1. 新增 `youtube_revocation` 撤销任务表和到期索引。凭据加密，七天到期清除；不加 user FK，确保用户删除后仍可撤销。
2. 为 `youtube_connection` 新增可空的 `verified_at`、`next_validation_at`、`validation_token` 和验证调度索引。
3. 没有 DROP、重建表或批量删除 SQL。

**迁移是增量的，但新程序的清理行为会永久删除旧数据。** 旧软删除收藏、超过 30 天或无法证明采集时间的元数据、失效授权关联数据会被清除；无时间来源的旧邮件副本会取消。有效但未有 verified_at 的旧连接会由独立核验任务补证，在此之前私有收藏读取失败关闭。部署后先确认授权核验正常，避免把旧数据标为已验证或随意重置日期来延长保留。

2026-10-18，经用户审查批准后，`wrangler d1 migrations apply DB --remote` 成功应用 `0002_wooden_overlord.sql`（7 条命令），随后迁移列表无待执行项。只读结构聚合确认 `migration_applied=1`、`revocation_table=1`、`validation_columns=3`。验收仅输出结构和聚合计数，不输出用户记录、凭据或游标中的记录 ID。

SQLite/D1 使用此 SQL；PostgreSQL/MySQL 模板也已同步字段，但必须为对应方言生成并审查迁移，不能直接运行本 SQL。不要为了部署调用 `db:push` 或重新应用历史建表文件。

## 发布与后续运行流程

1. 已核对实际 Worker、D1 binding、迁移记录及表结构。以后发布仍须先检查待执行迁移，不打印用户记录或凭据。
2. 已按仓库 AGENTS.md 规则取得用户对本次 SQL 的审查批准并应用迁移；未来新增迁移继续遵循该流程。
3. 已部署通过构建的应用，版本见下方生产记录。继续保留 `CONFIG_ENCRYPTION_KEY`；不能临时更换密钥或把所有旧连接改为新验证时间。
4. 已确认生产 `*/5 * * * *` Cron Trigger，并观察到实际执行。隐私维护不需要启用 `PLAYLIST_GUARD_SCHEDULER_ENABLED`，不需要发送邮件或让用户付费。外部 `/api/playlist-guard-run` 仅是商业监控入口，不能代替内置维护任务。
5. 检查 `youtube_privacy_maintenance` 日志中的 validate/revoke/cleanup 计数及失败 stage。每轮分页最多 25 个收藏与 25 封邮件；确认持续出现 sweepComplete=true。关注过期撤销任务 `expired` 指标（说明未在期限内确认 Google 完成撤销），及时处理任务积压和持续失败。
6. 使用专用测试账号完成下方真实 Google 验收，回读已发布政策，再录制演示视频、填写审核材料。

## 生产验收清单

- [x] EN/中文 privacy-policy、terms-of-service、contact 共六个页面公开返回 HTTP 200，显示 2026-10-18 日期。
- [x] 生产迁移、部署与实际 Cron 执行成功，维护游标完成扫描，生命周期聚合计数符合下方记录。
- [x] 大写登录路径、私密备份页及 API 响应返回 HTTP 200、private/no-store 和限制性 CSP。
- [x] Chrome DevTools 已确认已登录首页文档的 CSP 阻止 Cloudflare 注入的 beacon 加载。
- [x] 现有生产项目、唯一 Web 客户端、Client ID、JavaScript origin 与两条回调已从控制台核对，Client ID 与生产公开配置一致。
- [x] 用户最新确认目标品牌为 `Playlist Expoter` 并要求恢复原版 Logo；演示测试账号为 `stepan101dev@gmail.com`；OAuth 支持邮箱和开发者联系邮箱均沿用该 Gmail，网站支持邮箱保持不变。
- [x] 历史：`Playlist Backup` 更名及 PB Logo 曾部署，网站与控制台品牌、Logo 和完整链接已保存回读。
- [x] Data access 已保存回读三个非敏感登录范围、唯一敏感 `youtube.readonly`，受限范围为空；Audience 已确认 External / In production。
- [x] 历史：旧 `Playlist Backup` 品牌验证曾通过并完成 Publish branding；最终回读“您的品牌已经过验证，正在向用户显示。”。
- [x] `Playlist Expoter` 与原版 E 图标已部署到生产、同步 Google Console，品牌验证通过并完成发布，最终状态已回读。
- [x] 指定已验证邮箱的限时审核额度已实现并部署，server-only secret 已设置。
- [x] 浏览器回读演示账号 `2/10`、原有 Lite 计划、10 个限时审核额度和 Pacific 到期时间。
- [x] YouTube 原生 UI 已创建专用私享测试列表并确认其中 1 个公开视频。
- [x] 私有备份创建及首次读取保存成功；Excel 下载文件的内部 XML 与实际视频 ID、标题、频道一致。
- [x] 历史旧轮：用户批准后执行 Disconnect and delete backups，UI 与当时生产聚合计数确认连接和相关私有备份清除；本轮证据见下方。
- [x] 视频和材料已提交敏感权限验证，Google 显示数据访问权限正在审核中；其余独立生命周期用例仍按下方未勾选项验收。
- [x] 历史旧品牌重新授权成功；本轮新品牌英文普通登录与新 YouTube 只读授权也已现场演示；两段原始录屏已保存，最终成片已通过本地 QA 并上传。
- [x] 本轮私有备份读取与 Excel Quick Look 核对成功，Check now 成功且 Total runs 为 2。
- [x] 用户批准手动添加 YouTube 测试素材；补录中 Liked videos、Liked music、Subscriptions 第 3 次检查均成功并各读取 1 条真实结果。
- [x] 成片展示真实英文现有授权页、完整 Client ID 与只读权限详情；本地 QA 确认可读，复用现有 grant 的流程单独标明。
- [x] 主录屏 31:02.983 与补录 609 秒均已保存并确认媒体参数。
- [x] 最终 8:36 视频完成合并并通过本地 QA，用户确认条款及 Unlisted 后已上传：https://youtu.be/lFRCukfn3cg。
- [x] 869 字符权限理由和视频链接已在 Google Data access 保存成功。
- [x] Studio SD/HD 处理完成，退出登录无痕窗口实际播放至 0:09 / 8:36，无需额外观看权限。
- [x] 约 2026-10-19 02:58 UTC 点击 Submit for verification，Google 显示数据访问权限正在审核中；尚未获批。
- [x] 用户批准后已断开并删除本轮四条测试备份；重载页面显示无 YouTube 连接、1/10 个收藏、70 个保存条目。本轮没有新的 D1 聚合或 Google 侧独立撤销验证。
- [x] 本轮新 YouTube 授权仅请求 youtube.readonly；补充的真实 UI 操作显示只读权限详情，两段原始录屏已保存，最终成片已通过本地 QA 并上传。
- [ ] 生产回调 state/PKCE 与连接列表不返回凭据的独立验收；不由成功授权或 UI 演示推定。
- [ ] 独立测试断开确认的取消分支不会删除，以及单独删除收藏的结果；已执行确认断开的清理结果见下方。
- [ ] Google revoke 成功；不可用时只保存加密专用重试凭据，重新连接提示前次撤销未完成；七天硬截止清除凭据。
- [ ] 同一 OAuth client 的撤销影响按实际结果说明，不承诺只影响当前频道。
- [ ] Google 权限页撤销后独立任务发现失效并清除数据，暂停/失权/无收藏用户也覆盖。
- [ ] 删除收藏、账号后无新回调/扫描写回，无新的待发邮件开始发送；已经进入邮件供应商的发送无法召回。
- [ ] 30 天期限与遗留记录清理运行，含 snapshot/missing/sourceTitle/outbox；页面、导出和邮件都不返回过期数据。
- [ ] 生产浏览器验证：公开页至私密页整页加载，大小写/中文路径受保护；无 Clarity/GA/Plausible/广告/客服脚本请求，边缘注入脚本被阻止执行；本轮普通 Google 登录已成功，Turnstile 与完整网络检查仍需独立证据。已登录首页的 beacon 阻止已有浏览器证据；其他路径的完整第三方请求检查尚待验证。
- [ ] 支持邮箱可收信、删除请求可在七天内处理；恢复副本/技术日志/人员访问做法与政策一致。

## 验证记录

最终文档与媒体整理后，主代理再次执行 pnpm build，退出码 0；本轮未新增部署。

本地验证已完成：

- 80 项针对性回归测试全部通过，覆盖 OAuth nonce/PKCE、跨用户隔离、删除与回调/刷新/扫描并发、实际 SQLite 父子记录删除、7 天撤销凭据硬截止、30 天逐副本保留、邮件发送资格与私密路由分类。
- `pnpm build`、`pnpm cf:build`、`pnpm exec tsc --noEmit`、`wrangler deploy --dry-run`、`git diff --check` 通过。
- security-scan 扫描 51 个变更文件，未发现问题；独立审阅发现的大小写/重复斜杠路径绕过、撤销队列积压和大文档内存峰值已修复并回归。
- 隔离本地 D1 成功应用全部三份迁移。使用合成用户、旧软删除收藏/邮件、失效连接和过期撤销任务，调用实际 workerd scheduled handler：`validate.removed=1`、`revoke.revoked=1`、`revoke.expired=1`、`cleanup.cleaned=1`、`sweepComplete=true`、无失败 stage；四类记录最终计数都为零。此时商业监控开关为 false。
- 本地第二次执行为空且成功，验证重入。合成密钥配置后会话查询 HTTP 200；没有使用真实 Google 或邮件凭据。
- EN/ZH 隐私政策 HTTP 200、新版日期可见，中文页面排版检查正常；`/SIGN-IN`、备份页、带登录 Cookie 的公开页均返回 private/no-store 与 CSP，HTML 没有可选第三方脚本；浏览器从首页点击登录正常并发生文档请求。
- 本机已安装 workerd 仅支持到 2026-06-10；**仅隔离测试配置**使用此兼容日期，生产生成配置仍保留原来的 2026-07-22，并通过 dry-run。生产执行证据见下方；真实 Google grant 仍待端到端验收。

以上本地测试使用合成数据、假 Google/邮件发送器或隔离数据库，不代表真实 Google 撤销成功。

生命周期版本生产记录（2026-10-18）：

- `pnpm run cf:deploy` 成功，版本 `2835c194-ca9c-425e-8530-68638248ad91`，路由 `exportyoutubeplaylist.com/*`，Cron 为 `*/5 * * * *`。
- 实际 scheduled 执行时间为 **2026-10-18 13:35 UTC**，`outcome=ok`、`exceptions=[]`；`youtube_privacy_maintenance` 的 `failed=[]`。
- `validate`：`checked=0`、`verified=0`、`removed=0`、`deferred=0`；`revoke`：`attempted=0`、`revoked=0`、`retrying=0`、`expired=0`。本轮没有调用真实授权核验或 Google revoke，不能作为这些路径成功的证据。
- `cleanup`：`reviewed=2`、`cleaned=0`、`deliveriesReviewed=0`、`deliveriesCleaned=0`、`sweepComplete=true`；持久化游标聚合状态为 `sweep_complete`。
- 数据库聚合：`expired_revoke_credentials`、`revocations_due`、`invalid_or_expired_connections`、`legacy_unverified_connections`、`validations_due`、`expired_lifecycle_markers` 均为 0。此次未读取或输出用户原始记录和凭据；零计数表示检查时没有相应积压，不证明真实账户撤销或删除已经验收。
- 中英文隐私政策、条款、联系页共六页均为 HTTP 200，日期为 2026-10-18；大写登录路径、私密备份页及 API 均为 HTTP 200，返回 private/no-store 与限制性 CSP。
- Cloudflare 仍向 HTML 注入 beacon 标签。Chrome DevTools 在已登录首页 `https://exportyoutubeplaylist.com/` 的文档上下文确认：`https://static.cloudflareinsights.com/beacon.min.js/…` 违反 `script-src` 规则，浏览器报告 “The action has been blocked.”，证明携带登录 Cookie 的公开页也使用私密 CSP 并阻止该脚本加载。此证据不代表已完成所有私密路径的网络审计或真实 Google 登录、Turnstile 兼容性验收。

当前 `Playlist Expoter` / 原版 E 图标发布记录（2026-10-18）：

- `pnpm build` 与 `cf:deploy` 成功；当前 100% 生产版本为 `3897fcb2-322a-4cc5-bf18-b7271e12327f`，部署时间 `2026-10-18T14:56:46Z`。
- 页头恢复原 E 图形；favicon.ico/apple-touch-icon.png 恢复原始文件，logo.svg 使用原 E 图形，logo.png 为原 apple-touch-icon.png 字节。首页、工具、隐私页显示新品牌且 HTTP 200；线上 logo.png/favicon.ico 与恢复文件字节一致；robots/sitemap HTTP 200，首页搜索标题保留。
- Console 已保存精确名称 `Playlist Expoter` 和 E 图标，本次验证品牌通过，再点击发布品牌；最终 UI 明确“您的品牌已经过验证，正在向用户显示。”。最终演示视频已上传为 Unlisted，权限理由和视频 URL 已保存；最终敏感权限请求已提交并正在审核，尚未获批。

旧 `Playlist Backup` / PB 品牌生产记录（2026-10-18，历史）：

- 更名版本 `5d9288f2-7ee3-4ee9-8b37-c1e06e273008` 已部署，沿用前述生产迁移，无新增数据库迁移。
- 更名后 `pnpm build`、`pnpm exec tsc --noEmit` 及 7 项导出测试通过。
- 首页与 EN/ZH 隐私政策、条款、联系页共 7 个路径均返回 HTTP 200，包含 `Playlist Backup`；`/logo.png` 返回 HTTP 200、PNG 图片。
- 数据库 config 中 `app_name` 和 `app_logo` 没有覆盖项；已发布配置生效。当时 Google 控制台 PB Logo 已保存，并回读显示为应用徽标。

审核额度发布与真实重新授权记录（2026-10-18）：

- 43 项相关测试、`pnpm exec tsc --noEmit`、`pnpm build` 通过；额度代码部署版本为 `4070e000-7b05-4f93-bdac-9d759080242e`。
- 当时设置 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` 后的版本为 `33cf0e4c-6362-455d-8471-eefce06dec58`，时间 **2026-10-18 14:05:10 UTC**。无 Stripe 改动，无新数据库迁移。
- 仅 `stepan101dev@gmail.com` 在邮箱已验证且精确匹配时获得 10 个收藏额度，截止 `2026-11-17T23:59:59Z`；不改变 Stripe 或新增数据库迁移。名单保存在 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` Worker secret，公开配置和 UI 不暴露名单，用户界面只显示本人审核限额。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。
- 历史旧品牌重新授权已成功：英文 Google consent screen 显示 `Playlist Backup`，已有 1 项服务权限为 `View YouTube account`；点击 Continue 后返回 `/settings/collections?youtube=connected`，页面回读 `YouTube account connected` 和 `Stepan Connected`。本次复用已有 YouTube 只读权限，未新增范围；不是首次新增授权的录屏证据。
- 历史旧轮的私有读取、Excel 导出和应用内断开清理已观察；本轮最终成片已完成并上传；外部撤销和账号删除仍待独立验收。用户提供的 `WL`（Watch Later）不受支持。已在 YouTube 原生 UI 确认演示账号 `stepan101dev@gmail.com`，并按用户授权创建私享播放列表 `Playlist Backup OAuth Review`，加入 1 个公开视频 `Me at the zoo`（`jNQXAC9IVRw`）；UI 回读 Private、1 video。测试列表为 <https://www.youtube.com/playlist?list=PLA73ZS4HfS3c>。网站读取、导出与应用内断开结果见下方独立记录。
- 线上自动扫描未启用，UI 明确显示手动检查。不要把已运行的隐私维护 Cron、已保存频率或 offline 参数当作实际自动扫描成功证据。

持续验收应观察游标最终完成、`failed` 为空，并检查是否持续出现 `validate.deferred` 或 `revoke.retrying`。`revoke.expired>0` 表示七天截止后清除了重试凭据，不能记录为 Google 撤销成功。真实重新授权结果见上方；后续私有读取、Excel 导出与应用内断开记录见下方。外部撤销、账号删除、生产期限清理和邮件发送仍须使用专用测试账号单独记录。

## 真实读取、导出与应用内断开记录

2026-10-18，同一已获用户授权的演示账号完成以下观察；这些是实际 UI 和只读计数证据，不是录屏文件：

1. Private playlist 备份创建成功，测试 collection ID 为 `47c0436e-01d1-413a-8e1d-a7e042096b3f`。创建后的首次读取自动完成并保存；Latest version 1 显示 `Me at the zoo`、`jawed`、`0:19` 及 `jNQXAC9IVRw` 链接。这是创建触发的读取，不是定时自动扫描。
2. Export Excel 下载完成，文件 [Private-playlist-PLA73ZS4HfS3c-latest.xlsx](/Users/stepan/Downloads/Private-playlist-PLA73ZS4HfS3c-latest.xlsx) 大小为 2,971 bytes。读取本地 XLSX 内部 XML 后，视频 ID、标题和频道与真实快照一致；未据此声称 CSV/JSON 也完成了同一轮真实导出。
3. 紧接首次读取点击 Check now，出现预期的 60 秒限频提示。没有绕过限制；此结果不记作扫描失败，也不记作第二次成功读取。
4. 用户明确批准断开连接并永久删除旧 `Backup verification · Stepan subscriptions` 和新建私有测试备份。执行 Disconnect and delete backups 后，页面显示 `No YouTube accounts connected yet`、`1/10`，仅保留含 70 个条目的公开频道收藏。此前 `2/10` 是较早的额度回读，不能作为清理后的当前数量。
5. 生产 D1 只读聚合确认 `credential_rows=0`、`collection_rows=1`、`private_collection_rows=0`、`delivery_rows=0`、`revocation_rows=0`。此次真实应用内断开已清除凭据与关联私有收藏，队列没有积压；零队列本身不证明 Google revoke HTTP 响应或失败重试流程。
6. 在 Google My Account connections 搜索 `Playlist Backup` 没有结果，但该权限页邮箱尚未独立回读。这一观察不能代替同一 Google 账号的完整外部撤销验证。尚未执行从 Google 权限页主动撤销并观察维护检测的独立用例，也未执行网站账号删除或生产历史过期数据清理用例。
7. 历史首次录屏尝试：Screenshot app 启动报 `NSPOSIXError 162`，QuickTime / Cmd-Shift-5 未显示面板，当时没有生成视频。用户之后手动录制并保存主流程与补录，文件参数已确认，见下方；敏感权限申请已提交并正在审核，尚未获批。

上一轮两个获准删除的私有备份不能复用，原始 YouTube 测试列表未被删除。本轮已重新授权、新建四类备份，四类均已成功读取非空结果，并已完成获准的断开与删除。邮件、外部撤销、单独删除收藏及账号删除仍须独立验收。

## 本轮界面演示与录制文件状态

本轮使用真实生产品牌 `Playlist Expoter`，已操作英文普通 Google 登录及独立的新 `youtube.readonly` 授权。首授权的 Continue 与回调成功没有在前台连续录到；补录中的英文权限详情和完整 Client ID 展示复用了同一现有 grant，不能剪成一次连续的首次授权。真实地址栏展示的 Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，权限详情为 `View your YouTube account`。成片按独立流程区分主流程与现有授权复查，不表示连续首次授权。

主录屏 `/Users/stepan/Desktop/录屏2026-10-18 18.41.41.mov`（31:02.983）与补录 `/Users/stepan/Desktop/录屏2026-10-18 19.30.52.mov`（609 秒）均保留；两者为 2560×1440、H.264、无音轨。最终成片为 `/Users/stepan/Desktop/Playlist-Expoter-OAuth-Review/Playlist-Expoter-OAuth-Review.mp4`，**516.000 秒（8:36）**、**2196×1256**、**30 fps**、**12,138,663 bytes**，已取代 6:07 主流程草稿用于提交。最终视频已合并并通过本地 QA：章节边界与新转场未出现无关窗口，完整 Client ID 清晰可读，完整 ffmpeg 解码通过。用户在上传时明确确认 YouTube 条款及 Unlisted 发布，视频已上传为 [Google OAuth 演示](https://youtu.be/lFRCukfn3cg)。Studio SD/HD 均处理完成，退出登录无痕窗口已实际播放并确认 Unlisted。869 字符权限理由及该视频链接已保存到 Google Data access，UI 回读“已保存数据访问权限更改”；最终敏感权限审核请求已提交并正在审核，尚未获批。

最终提交前，Studio 的 SD/HD 均已处理完成。退出登录的 Chrome 无痕窗口显示 Sign in、Unlisted 标记及正确视频，实际播放到 0:02 后于 0:09 / 8:36 暂停，画面显示录制的网站；[视频](https://youtu.be/lFRCukfn3cg) 无需申请权限即可播放。约 2026-10-19 02:58 UTC（当地 2026-10-18 19:58 PDT），已确认 Prepare 表单，问卷中个人用途、内部用途、开发/测试专用、WordPress 四项均选择 No，确认阅读指南及有条件适用的 CASA 提示后点击 **Submit for verification**；本项目没有受限范围，不据此声称需要或通过 CASA。已提交 869 字符用途理由、视频链接及 966 字符审核补充说明，后者请 Google 提供审核邮箱以配置免费额度，不共享个人 Google 密码。最终 Verification Center 明确显示 **“您的应用的数据访问权限正在审核中。”** 并提供查看审核进度按钮；品牌仍为已验证并发布。此结果为 **已提交、审核中，尚未获批**。Google 审核员具体邮箱仍待其提供，不能声称已给审核员开通额度。

私享列表 `PLA73ZS4HfS3c` 读取 1 个 `Me at the zoo` 条目；本轮 Excel 为 2,972 bytes，Quick Look 已核对标题、`jawed`、链接和时长。当地 18:51 的 Check now 成功，Total runs 为 2。补录还在 YouTube 原生界面显示该列表为“私享”、1 个视频，历史测试列表名称仍为 `Playlist Backup OAuth Review`。

用户已明确允许添加测试素材；在 YouTube 原生页面手动点赞 **Beethoven - Für Elise**（Rousseau，`wfF0zHeU3Zs`）并订阅 Rousseau。网站没有写入 YouTube，仍仅申请 `youtube.readonly`。补录中 Liked videos 于当地 19:33、Liked music 和 YouTube subscriptions 于 19:34 完成第 3 次检查，Latest version 均为 1 条：前两类显示该音乐视频，订阅显示 Rousseau。三类初次读取为空的情况已由这些真实非空读取补充；当前单一音乐样本不证明非音乐条目排除的对照测试。

用户明确批准后，约 `2026-10-19 02:38 UTC` 已执行 **Disconnect and delete backups**，删除本轮 Private playlist、Liked videos、Liked music 和 YouTube subscriptions 四条测试备份。重新加载页面后显示 **No YouTube accounts connected yet**、**1/10** 个收藏、**70** 个保存条目，仅余原有公开频道收藏。原始 YouTube 列表、点赞及订阅仍保留。补录约 425–609 秒被 Codex 前台遮挡，不能作为可用的断开或清理结果录像；上述清理结论来自现场 UI 回读，最终视频不宣称展示该操作。本轮没有新增生产 D1 聚合检查，也未独立确认 Google 侧撤销结果；不能将上一轮数据库计数或应用 UI 清理作为本轮 Google revoke 成功的证据。

本轮记录标识：

| 来源             | 本轮 collection ID                     | 已观察结果                                                                                       |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Private playlist | `e4b877c8-6654-4f27-ba32-7e61c1591872` | 1 个 Me at the zoo；Excel 2,972 bytes；18:51 当地时间 Check now 成功，Total runs 2；已随断开删除 |
| Liked videos     | `0566d05b-6922-4df6-8c19-65223bf76e2a` | 第 3 次检查成功，1 条 Beethoven - Für Elise；当地 19:33；已随断开删除                            |
| Liked music      | `239fc633-e484-455d-88d0-b2be21ecca4d` | 第 3 次检查成功，1 条相同音乐视频；当地 19:34；已随断开删除                                      |
| Subscriptions    | `808693ed-7584-4c21-a7c8-e99f1248fc4f` | 第 3 次检查成功，1 条 Rousseau；当地 19:34；已随断开删除                                         |

四条记录均已在约 `2026-10-19 02:38 UTC` 的获准断开中删除，表内 ID 仅用于追溯本轮演示。主流程和补录原件保留，最终 8:36 成片已通过本地 QA 并上传，视频 URL 已保存到 Data access；退出登录视频页和实际播放均已确认。不得把补录的现有授权复查拼成连续首次授权。

## 限时审核访问的服务端维护

实现见 [review-access.ts](../../src/core/playlist-guard/review-access.ts)。仅在实际生产 Worker 的 Secrets 中维护 `PLAYLIST_GUARD_REVIEW_ACCESS`，不要放进 `VITE_*`、公开 `envConfigs`、管理员公开配置、截图或前端代码。以下只是虚构邮箱的结构示例，不是线上名单：

```json
[
  {
    "email": "reviewer@example.com",
    "expiresAt": "2026-11-17T23:59:59Z",
    "limit": 10
  }
]
```

- 用 Cloudflare 控制台的 Worker secret 编辑器，或 Wrangler 的交互式 `secret put PLAYLIST_GUARD_REVIEW_ACCESS` 更新 JSON；先确认正确 Worker/环境，保留其他 secrets。不要把真实值内联在命令、日志或仓库文件中。
- 每项仅包含 `email`、`expiresAt`、`limit`；最多 20 项，额度为 1–50 的整数，时间必须为有效 UTC ISO 日期。邮箱去除两端空白并转小写后精确匹配，同时要求网站账号 `emailVerified=true`；不支持通配符或整域授权。无效配置不授予额度。
- Google 提供审核员邮箱后，只为明确指定且已验证的邮箱配置适当截止时间，不能将开发者个人 Google 账号密码共享给审核员。当前已配置的演示邮箱并不意味着所有 Google 审核员均可访问。
- 更新后用对应普通账号回读本人 `review` 额度及到期时间，并验证创建/更新/扫描和邮件权限；不打印整个名单或任何 OAuth token。公开配置与 UI 不显示完整名单。
- 到期后或移除某项后，该项不再提供额外额度，原有真实订阅权益仍按自身状态计算。撤销全部临时额度可将 secret 更新为 `[]` 或删除该 secret；再次回读确认。不要通过 Stripe 假订阅、修改用户付费状态或重置验证时间延长访问。

## OAuth 提交记录与后续审核事项

Google 控制台配置与回读记录（2026-10-18；品牌项为本次改名之前的历史状态）：

- 项目 ID：`exportyoutubeplaylist-503312`。Clients 只有一个 Web 客户端 `export-youtube-playlist`，Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，与生产公开配置完全一致。项目编号未从 Client ID 前缀推测。
- JavaScript origin：`https://exportyoutubeplaylist.com`。两条已配置回调为 `https://exportyoutubeplaylist.com/api/youtube-connections/callback` 和 `https://exportyoutubeplaylist.com/api/auth/callback/google`，均与现有应用一致。
- Branding 保存出现成功提示；回访确认名称为 `Playlist Backup`，OAuth 联系邮箱保留用户确认的 Gmail，当时应用徽标为已保存的 PB Logo。完整链接为 `https://exportyoutubeplaylist.com/`、`https://exportyoutubeplaylist.com/privacy-policy`、`https://exportyoutubeplaylist.com/terms-of-service`。
- Audience 完成确认对话框后回读为 External / In production，用户计数为 `1/100`，仍提示需要验证。原 Testing 仅限测试用户的 403 门槛已解除；未验证应用警告及用户额度仍存在，不能称所有用户连接已经正常完成。
- 网站更名部署后，Verify Branding 已通过，并已点击 Publish branding；最终回读“您的品牌已经过验证，正在向用户显示。”。旧 Playlist Backup / PB 品牌验证与发布曾完成；敏感权限 Data access 申请已提交并正在审核。
- OAuth 支持邮箱和开发者联系邮箱均为 `stepan101dev@gmail.com`；支持邮箱下拉仅提供该 Gmail，没有 Google Group，`support@exportyoutubeplaylist.com` 当前不可选。网站支持邮箱保持不变；用户已确认 OAuth 支持邮箱和开发者联系邮箱均沿用该 Gmail。
- 用户最新确认名称 `Playlist Expoter` 并要求恢复原版 Logo，演示测试账号仍为 `stepan101dev@gmail.com`。旧 `Playlist Backup` / PB 曾部署并同步控制台，当前 `Playlist Expoter` / E 已完成生产部署和 Console 保存、验证、发布；真实重新授权、私有读取、Excel 导出与应用内断开清理已观察；最终视频已上传；退出登录实际播放已确认，其他独立验收仍待完成。不需要用户再次提供已核实的 project ID 或 Client ID，也不需要索取 Client Secret。
- Data access 保存出现成功提示并回读：三个非敏感范围 `openid`、`userinfo.email`、`userinfo.profile`；唯一敏感范围 `youtube.readonly`；受限范围为空。这只是登记现有普通登录的基础身份范围，不新增敏感范围。
- 两段原始录屏已保存，最终合并、QA 与 Unlisted 上传均已完成，退出登录视频页和实际播放均已确认。限时审核额度已实现并上线；仅 `stepan101dev@gmail.com` 在邮箱已验证且精确匹配时获得 10 个收藏额度，截止 `2026-11-17T23:59:59Z`；不改变 Stripe 或新增数据库迁移。名单保存在 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` Worker secret，公开配置和 UI 不暴露名单，用户界面只显示本人审核限额。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。具体 Google 审核员账号尚未安排，不能把演示账号额度写成审核员已经取得访问。

品牌链接及 External / In production 已配置。旧 `Playlist Backup` / PB 曾验证并发布；当前 `Playlist Expoter` 与原版 E 图标也已完成生产部署及 Console 同步、品牌验证和发布。演示账号额度、私有读取、Excel 导出和应用内断开清理已有记录；上一轮曾断开连接；本轮四类备份均已读取非空结果，并完成获准的断开与删除，当前 UI 为无连接、1/10 个收藏、70 个条目。继续独立验证外部撤销、账号删除和期限清理；最终视频已上传，869 字符权限理由和视频 URL 已保存到 Data access；退出登录实际播放已验证，敏感范围申请已提交并正在审核；具体审核员邮箱待 Google 提供；保留相关域名所有权及品牌结果作为审核证据。视频需完整展示英文授权过程及实际范围使用，文字解说可用，不强制录音。[品牌流程](https://support.google.com/cloud/answer/15549049?hl=en)、[视频要求](https://support.google.com/cloud/answer/15549135?hl=en)

品牌问题需与这些提交条件区分：YouTube API 专属规则限制整体应用名称和商标域名用法，OAuth 通用品牌页面存在不同命名示例。最终名称应统一且符合相关规则，但不能宣称现名或 `exportyoutubeplaylist.com` 一定导致 OAuth 拒绝，也不能承诺其一定通过；购买新域名不是 OAuth 通用表单的必选操作。域名所有权与具体品牌合规需要分别核对。[YouTube 品牌规则](https://developers.google.com/youtube/terms/branding-guidelines)、[OAuth 品牌说明](https://support.google.com/cloud/answer/15549049?hl=en)

本次代码发布不代替 Google 审核，也不保证绕过组织管理员的第三方应用限制。

## 官方依据

- [YouTube API 开发者政策](https://developers.google.com/youtube/terms/developer-policies)：API 数据保存、撤销和用户删除要求。
- [Google API 用户数据政策](https://developers.google.com/terms/api-services-user-data-policy)：用途、传输与 Limited Use。
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)：生产计划任务配置和测试。
