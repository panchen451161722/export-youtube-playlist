# 隐私披露与实现对照

更新：2026-10-18。本文件替代前一版逐段草案。最终对外文本以仓库政策源文件为准，避免提交两份不一致的承诺。

**当前状态**：品牌严格使用 `Playlist Expoter`，原版 E 图标已恢复。生产版本 `3897fcb2-322a-4cc5-bf18-b7271e12327f` 于 `2026-10-18T14:56:46Z` 部署并承接 100% 流量；Google Console 已保存新名称和 E 图标，品牌验证通过并发布，最终回读“您的品牌已经过验证，正在向用户显示。”。下文 `Playlist Backup` / PB 内容保留为历史记录。最终 8:36 视频已完成并通过本地 QA，用户确认后已上传为 Unlisted：[演示视频](https://youtu.be/lFRCukfn3cg)。四类来源均已读取非空结果，用户批准的四条测试备份已于约 `2026-10-19 02:38 UTC` 断开并删除。869 字符权限理由和视频链接已在 Data access 保存成功。无痕窗口已验证视频实际播放；约 2026-10-19 02:58 UTC 已提交，Verification Center 回读“您的应用的数据访问权限正在审核中。”，尚未获批。

## 本轮界面演示与录制文件状态

本轮使用真实生产品牌 `Playlist Expoter`，已操作英文普通 Google 登录及独立的新 `youtube.readonly` 授权。首授权的 Continue 与回调成功没有在前台连续录到；补录中的英文权限详情和完整 Client ID 展示复用了同一现有 grant，不能剪成一次连续的首次授权。真实地址栏展示的 Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，权限详情为 `View your YouTube account`。成片按独立流程区分主流程与现有授权复查，不表示连续首次授权。

主录屏 `/Users/stepan/Desktop/录屏2026-10-18 18.41.41.mov`（31:02.983）与补录 `/Users/stepan/Desktop/录屏2026-10-18 19.30.52.mov`（609 秒）均保留；两者为 2560×1440、H.264、无音轨。最终成片为 `/Users/stepan/Desktop/Playlist-Expoter-OAuth-Review/Playlist-Expoter-OAuth-Review.mp4`，**516.000 秒（8:36）**、**2196×1256**、**30 fps**、**12,138,663 bytes**，已取代 6:07 主流程草稿用于提交。最终视频已合并并通过本地 QA：章节边界与新转场未出现无关窗口，完整 Client ID 清晰可读，完整 ffmpeg 解码通过。用户在上传时明确确认 YouTube 条款及 Unlisted 发布，视频已上传为 [Google OAuth 演示](https://youtu.be/lFRCukfn3cg)。Studio SD/HD 均处理完成，退出登录无痕窗口已实际播放并确认 Unlisted。869 字符权限理由及该视频链接已保存到 Google Data access，UI 回读“已保存数据访问权限更改”；最终敏感权限审核请求已提交并正在审核，尚未获批。

最终提交前，Studio 的 SD/HD 均已处理完成。退出登录的 Chrome 无痕窗口显示 Sign in、Unlisted 标记及正确视频，实际播放到 0:02 后于 0:09 / 8:36 暂停，画面显示录制的网站；[视频](https://youtu.be/lFRCukfn3cg) 无需申请权限即可播放。约 2026-10-19 02:58 UTC（当地 2026-10-18 19:58 PDT），已确认 Prepare 表单，问卷中个人用途、内部用途、开发/测试专用、WordPress 四项均选择 No，确认阅读指南及有条件适用的 CASA 提示后点击 **Submit for verification**；本项目没有受限范围，不据此声称需要或通过 CASA。已提交 869 字符用途理由、视频链接及 966 字符审核补充说明，后者请 Google 提供审核邮箱以配置免费额度，不共享个人 Google 密码。最终 Verification Center 明确显示 **“您的应用的数据访问权限正在审核中。”** 并提供查看审核进度按钮；品牌仍为已验证并发布。此结果为 **已提交、审核中，尚未获批**。Google 审核员具体邮箱仍待其提供，不能声称已给审核员开通额度。

私享列表 `PLA73ZS4HfS3c` 读取 1 个 `Me at the zoo` 条目；本轮 Excel 为 2,972 bytes，Quick Look 已核对标题、`jawed`、链接和时长。当地 18:51 的 Check now 成功，Total runs 为 2。补录还在 YouTube 原生界面显示该列表为“私享”、1 个视频，历史测试列表名称仍为 `Playlist Backup OAuth Review`。

用户已明确允许添加测试素材；在 YouTube 原生页面手动点赞 **Beethoven - Für Elise**（Rousseau，`wfF0zHeU3Zs`）并订阅 Rousseau。网站没有写入 YouTube，仍仅申请 `youtube.readonly`。补录中 Liked videos 于当地 19:33、Liked music 和 YouTube subscriptions 于 19:34 完成第 3 次检查，Latest version 均为 1 条：前两类显示该音乐视频，订阅显示 Rousseau。三类初次读取为空的情况已由这些真实非空读取补充；当前单一音乐样本不证明非音乐条目排除的对照测试。

用户明确批准后，约 `2026-10-19 02:38 UTC` 已执行 **Disconnect and delete backups**，删除本轮 Private playlist、Liked videos、Liked music 和 YouTube subscriptions 四条测试备份。重新加载页面后显示 **No YouTube accounts connected yet**、**1/10** 个收藏、**70** 个保存条目，仅余原有公开频道收藏。原始 YouTube 列表、点赞及订阅仍保留。补录约 425–609 秒被 Codex 前台遮挡，不能作为可用的断开或清理结果录像；上述清理结论来自现场 UI 回读，最终视频不宣称展示该操作。本轮没有新增生产 D1 聚合检查，也未独立确认 Google 侧撤销结果；不能将上一轮数据库计数或应用 UI 清理作为本轮 Google revoke 成功的证据。

## 已更新的公开页面源文件

- [英文隐私政策](../../src/content/pages/privacy-policy.en.mdx)、[中文隐私政策](../../src/content/pages/privacy-policy.zh.mdx)
- [英文条款](../../src/content/pages/terms-of-service.en.mdx)、[中文条款](../../src/content/pages/terms-of-service.zh.mdx)
- [英文联系页](../../src/content/pages/contact.en.mdx)、[中文联系页](../../src/content/pages/contact.zh.mdx)

支持邮箱沿用用户已确认的 `support@exportyoutubeplaylist.com`。源文件及生产页面日期均为 2026-10-18；部署后已回读英文、中文隐私政策、条款和联系页，六个 URL 均返回 HTTP 200，线上披露与实现一致。

## 披露与实际行为

| 披露                                    | 实现及边界                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 网站 Google 登录与 Connect YouTube 分开 | 连接只请求 youtube.readonly；不上传、修改或删除 YouTube 原件                                                      |
| YouTube 连接凭据加密                    | 专用连接及撤销队列 AES-256-GCM；不声称全部数据库字段或网站登录 token 都逐字段加密                                 |
| 公开导出与持久备份分开                  | 公开工具按请求处理；创建收藏才保存来源、设置及快照                                                                |
| 快照和丢失条目最多 30 天                | 按每份数据实际读取时间判断；新扫描不延长旧快照；暂停/失权仍清理；读取和邮件发送也检查期限                         |
| 删除收藏                                | 删除活动数据库内收藏及对应待发邮件，包含历史软删除的后台清理                                                      |
| 断开连接                                | 先删除本地连接及相关收藏/outbox，再立即尝试 Google revoke；失败保留最小加密撤销凭据最多七天，用于重试             |
| 删除账号                                | better-auth beforeDelete 先封住新授权/写入，清理所有收藏、outbox、workspace，保存可在账号删除后继续运行的撤销任务 |
| Google 侧撤销                           | 独立维护任务每天安排授权核验，确认失效后清理；长期无法核验按 30 天失败关闭                                        |
| 可选邮件                                | 仅配置供应商、用户开启、验证邮箱并通过发送前校验后发送；已进入邮件供应商处理的发送无法召回                        |
| 私密页面隔离                            | 按路由/登录 Cookie 排除可选脚本，公开与私密表面切换整页加载，响应 CSP 限制脚本与连接，私密响应不缓存              |
| 备份、日志、下载副本                    | 不承诺所有平台恢复副本即时擦除，不远程删除用户文件/邮箱或 Google 原始数据                                         |
| 付款                                    | 按实际启用能力描述；删除网站账号不等同取消支付平台自动续费                                                        |

## 运营与上线验收

2026-10-18 已完成获准的生命周期生产迁移和部署，初始版本为 `2835c194-ca9c-425e-8530-68638248ad91`。远端 `0002` 迁移已应用，检查时没有待应用迁移。部署前的旧政策观察保留在 [控制台清单第 7 节](console-checklist.md#7-2026-10-18-部署前线上核验记录历史)，不再代表当前线上披露。

| 生产检查                 | 结果与范围                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 两种语言公开政策         | 六个政策/条款/联系页面 HTTP 200，日期为 2026-10-18，内容与实现一致                                                                        |
| 私密响应保护             | 检查的私密路径具有 CSP 和 `Cache-Control: private, no-store`                                                                              |
| 浏览器边缘脚本           | Chrome DevTools 在已登录首页确认 Cloudflare `beacon.min.js` 被私密 CSP 的 `script-src` 阻止；此证据限于该文档，不是所有页面的完整网络审计 |
| 维护任务                 | 2026-10-18 13:35 UTC Cron 为 `ok`、`failed: []`；清理 `reviewed: 2`、`cleaned: 0`、`sweepComplete: true`                                  |
| 初次维护的授权核验和撤销 | 13:35 UTC 没有待处理项目，相关计数均为 0；不代表真实撤销链路通过                                                                          |
| 真实应用内断开           | 上一轮 UI 与 D1 聚合确认清理；本轮获准删除四条备份后重载页面为无连接、1/10、70 条目。本轮无新增 D1 聚合检查，Google 侧撤销仍未独立确认    |

代码和上述检查不能证明真实人员访问、平台日志保留、恢复副本和邮件供应商配置。运营方仍须核对政策中的 Limited Use、人员访问和七天删除请求处理承诺与实际流程一致；支持邮箱本次没有重复收信测试。真实重新授权、私有读取、Excel 导出及应用内断开清理已有证据；继续完成期限清理、外部撤销、账号删除及其他私密页面浏览器请求检查。具体步骤见 [readiness.md](readiness.md)。

历史：此前 `Playlist Backup` 更名版本 `5d9288f2-7ee3-4ee9-8b37-c1e06e273008` 已发布，Google 控制台品牌、PB Logo、公开链接和范围已保存回读，品牌已验证并发布；Audience 为 External / In production。当前 `Playlist Expoter` 与原版 E 图标已在生产版本 `3897fcb2-322a-4cc5-bf18-b7271e12327f` 上线，并单独完成 Console 保存、品牌验证与发布。此前因缺少视频无法保存用途说明的问题已解决：869 字符权限理由及最终 Unlisted 视频链接均已保存到 Google Data access，UI 回读保存成功。最终敏感权限审核请求已提交并正在审核，尚未获批，退出登录实际播放已确认。独立 Search Console 所有权证据未记录。

限时审核访问已实现并部署，当时发布版本为 `33cf0e4c-6362-455d-8471-eefce06dec58`（2026-10-18 14:05:10 UTC）。仅 `stepan101dev@gmail.com` 在邮箱已验证且精确匹配时获得 10 个收藏额度，截止 `2026-11-17T23:59:59Z`；不改变 Stripe 或新增数据库迁移。名单保存在 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` Worker secret，公开配置和 UI 不暴露名单，用户界面只显示本人审核限额。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。这不改变数据用途、Stripe 订阅或保留期限。服务端维护方法见 [readiness.md](readiness.md#限时审核访问的服务端维护)。

历史旧品牌重新授权已成功：英文 Google consent screen 显示 `Playlist Backup`，已有 1 项服务权限为 `View YouTube account`；点击 Continue 后返回 `/settings/collections?youtube=connected`，页面回读 `YouTube account connected` 和 `Stepan Connected`。本次复用已有 YouTube 只读权限，未新增范围；不是首次新增授权的录屏证据。该历史轮次的私有读取、Excel 导出与应用内断开清理已观察；本轮非空四类读取与清理、已保存原始录屏见上方。外部撤销和账号删除仍待独立验收；最终剪辑已完成并上传。为替代不支持的 `WL`，已在 YouTube 原生 UI 确认演示账号 `stepan101dev@gmail.com`，并按用户授权创建私享播放列表 `Playlist Backup OAuth Review`，加入 1 个公开视频 `Me at the zoo`（`jNQXAC9IVRw`）；UI 回读 Private、1 video。测试列表为 <https://www.youtube.com/playlist?list=PLA73ZS4HfS3c>。网站已成功创建 Private playlist 备份，首次读取保存成功；Latest version 1 显示 `Me at the zoo`、`jawed`、`0:19` 和 `jNQXAC9IVRw` 链接。Excel 文件已下载并核对内部 XML 的视频 ID、标题和频道。随后用户批准并执行断开连接及删除两个关联私有备份，应用页面与生产聚合计数确认清理；上一轮断开后曾显示无 YouTube 连接、`1/10`，仅保留含 70 条目的公开频道收藏；本轮曾重新连接并新建 4 个测试备份，现已按用户批准完成断开和删除；当前 UI 为无连接、1/10 个收藏、70 个保存条目。详见 [真实读取、导出与应用内断开记录](readiness.md#真实读取导出与应用内断开记录)。线上自动扫描未启用，UI 明确手动检查；不得宣称后台收藏扫描或邮件投递已经验收。

## 官方依据

- [YouTube API 开发者政策](https://developers.google.com/youtube/terms/developer-policies)
- [Google API 用户数据政策](https://developers.google.com/terms/api-services-user-data-policy)
- [Google 权限管理](https://security.google.com/settings/security/permissions)
