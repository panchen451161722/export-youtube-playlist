# Google OAuth 控制台填写与提交清单

准备日期：2026-10-18。适用目标：允许外部 Google 用户连接自己的 YouTube 账号，使用已经实现的只读导出、收藏夹和定时备份功能。

**当前状态**：品牌严格使用 `Playlist Expoter`，原版 E 图标已恢复。生产版本 `3897fcb2-322a-4cc5-bf18-b7271e12327f` 于 `2026-10-18T14:56:46Z` 部署并承接 100% 流量；Google Console 已保存新名称和 E 图标，品牌验证通过并发布，最终回读“您的品牌已经过验证，正在向用户显示。”。下文 `Playlist Backup` / PB 内容保留为历史记录。最终 8:36 视频已完成并通过本地 QA，用户确认后已上传为 Unlisted：[演示视频](https://youtu.be/lFRCukfn3cg)。四类来源均已读取非空结果，用户批准的四条测试备份已于约 `2026-10-19 02:38 UTC` 断开并删除。869 字符权限理由和视频链接已在 Data access 保存成功。无痕窗口已验证视频实际播放；约 2026-10-19 02:58 UTC 已提交，Verification Center 回读“您的应用的数据访问权限正在审核中。”，尚未获批。

本文是准备与执行记录，不代表敏感权限验证通过。2026-10-18 已获准完成生产迁移和应用部署；随后已核对生产 Cloud Console，当时使用旧品牌 Playlist Backup；品牌字段、PB Logo、公开链接和现有身份权限已保存，品牌验证已通过并发布；最终回读“您的品牌已经过验证，正在向用户显示。”。域名保留，敏感权限审核已提交，正在审核中。涉及真实 Google 撤销、实际过期数据清理和完整授权链路的项目，仍须有对应证据后才可勾选。

## 本轮界面演示与录制文件状态

本轮使用真实生产品牌 `Playlist Expoter`，已操作英文普通 Google 登录及独立的新 `youtube.readonly` 授权。首授权的 Continue 与回调成功没有在前台连续录到；补录中的英文权限详情和完整 Client ID 展示复用了同一现有 grant，不能剪成一次连续的首次授权。真实地址栏展示的 Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，权限详情为 `View your YouTube account`。成片按独立流程区分主流程与现有授权复查，不表示连续首次授权。

主录屏 `/Users/stepan/Desktop/录屏2026-10-18 18.41.41.mov`（31:02.983）与补录 `/Users/stepan/Desktop/录屏2026-10-18 19.30.52.mov`（609 秒）均保留；两者为 2560×1440、H.264、无音轨。最终成片为 `/Users/stepan/Desktop/Playlist-Expoter-OAuth-Review/Playlist-Expoter-OAuth-Review.mp4`，**516.000 秒（8:36）**、**2196×1256**、**30 fps**、**12,138,663 bytes**，已取代 6:07 主流程草稿用于提交。最终视频已合并并通过本地 QA：章节边界与新转场未出现无关窗口，完整 Client ID 清晰可读，完整 ffmpeg 解码通过。用户在上传时明确确认 YouTube 条款及 Unlisted 发布，视频已上传为 [Google OAuth 演示](https://youtu.be/lFRCukfn3cg)。Studio SD/HD 均处理完成，退出登录无痕窗口已实际播放并确认 Unlisted。869 字符权限理由及该视频链接已保存到 Google Data access，UI 回读“已保存数据访问权限更改”；最终敏感权限审核请求已提交并正在审核，尚未获批。

最终提交前，Studio 的 SD/HD 均已处理完成。退出登录的 Chrome 无痕窗口显示 Sign in、Unlisted 标记及正确视频，实际播放到 0:02 后于 0:09 / 8:36 暂停，画面显示录制的网站；[视频](https://youtu.be/lFRCukfn3cg) 无需申请权限即可播放。约 2026-10-19 02:58 UTC（当地 2026-10-18 19:58 PDT），已确认 Prepare 表单，问卷中个人用途、内部用途、开发/测试专用、WordPress 四项均选择 No，确认阅读指南及有条件适用的 CASA 提示后点击 **Submit for verification**；本项目没有受限范围，不据此声称需要或通过 CASA。已提交 869 字符用途理由、视频链接及 966 字符审核补充说明，后者请 Google 提供审核邮箱以配置免费额度，不共享个人 Google 密码。最终 Verification Center 明确显示 **“您的应用的数据访问权限正在审核中。”** 并提供查看审核进度按钮；品牌仍为已验证并发布。此结果为 **已提交、审核中，尚未获批**。Google 审核员具体邮箱仍待其提供，不能声称已给审核员开通额度。

私享列表 `PLA73ZS4HfS3c` 读取 1 个 `Me at the zoo` 条目；本轮 Excel 为 2,972 bytes，Quick Look 已核对标题、`jawed`、链接和时长。当地 18:51 的 Check now 成功，Total runs 为 2。补录还在 YouTube 原生界面显示该列表为“私享”、1 个视频，历史测试列表名称仍为 `Playlist Backup OAuth Review`。

用户已明确允许添加测试素材；在 YouTube 原生页面手动点赞 **Beethoven - Für Elise**（Rousseau，`wfF0zHeU3Zs`）并订阅 Rousseau。网站没有写入 YouTube，仍仅申请 `youtube.readonly`。补录中 Liked videos 于当地 19:33、Liked music 和 YouTube subscriptions 于 19:34 完成第 3 次检查，Latest version 均为 1 条：前两类显示该音乐视频，订阅显示 Rousseau。三类初次读取为空的情况已由这些真实非空读取补充；当前单一音乐样本不证明非音乐条目排除的对照测试。

用户明确批准后，约 `2026-10-19 02:38 UTC` 已执行 **Disconnect and delete backups**，删除本轮 Private playlist、Liked videos、Liked music 和 YouTube subscriptions 四条测试备份。重新加载页面后显示 **No YouTube accounts connected yet**、**1/10** 个收藏、**70** 个保存条目，仅余原有公开频道收藏。原始 YouTube 列表、点赞及订阅仍保留。补录约 425–609 秒被 Codex 前台遮挡，不能作为可用的断开或清理结果录像；上述清理结论来自现场 UI 回读，最终视频不宣称展示该操作。本轮没有新增生产 D1 聚合检查，也未独立确认 Google 侧撤销结果；不能将上一轮数据库计数或应用 UI 清理作为本轮 Google revoke 成功的证据。

## 1. 提交前先解决的事项

- [x] 更新并部署英文、中文隐私政策、使用条款和联系页，覆盖 YouTube OAuth、后台读取、保存的快照、令牌、删除与撤销授权。六个生产页面均返回 HTTP 200，日期为 2026-10-18，政策与当前实现一致；部署证据见第 8 节。
- [x] 历史：旧品牌 **Playlist Backup** 曾完成网站部署、控制台保存与 PB Logo 上传，Google 品牌验证曾通过并发布。OAuth 通用品牌文档与 YouTube 产品品牌规则表述不完全一致；采用不含 YouTube/YT 的独立名遵循更严格的产品规范，但不能断言旧名称必然导致 OAuth 审核拒绝。[YouTube 品牌指南](https://developers.google.com/youtube/terms/branding-guidelines) · [OAuth 品牌配置](https://support.google.com/cloud/answer/15549049?hl=en)
- [x] **Playlist Expoter** 与原版 E 图标已部署、同步控制台，并完成本次品牌验证和发布；最终 UI 确认正在向用户显示。
- [ ] 域名保持 `exportyoutubeplaylist.com`。核对项目 Owner/Editor 的 Search Console 所有权；商标规则仍需注意，但换域名不是 OAuth 通用提交表单的必选步骤，不自行购买或迁移域名。
- [x] 真实私有播放列表已读取并保存，Excel 导出内容已核对；用户批准的应用内断开与关联私有备份清理已通过页面和生产聚合计数确认。
- [ ] 独立验证生产过期清理、外部 Google 撤销检测、撤销重试和账号删除。初次维护 Cron 的空队列成功不能替代这些用例。
- [x] 真实测试账号已重新授权并回到连接成功页面，仅复用既有 YouTube 只读权限。
- [x] 四类来源均有非空真实读取，私有备份 Excel 导出和获准的断开清理已观察；主录屏及补录已保存。
- [x] 最终 8:36 视频已完成并通过本地 QA，用户确认后已上传为 Unlisted；首授权回调缺口和现有 grant 复查按不同流程记录。
- [x] Studio SD/HD 已处理完成；退出登录无痕窗口实际播放至 0:09 / 8:36。线上自动扫描仍未启用。

## 2. 控制台字段模板

进入 [Google Auth Platform](https://console.cloud.google.com/auth/overview)，先选择网站实际使用的 OAuth Client ID 所属项目。生产公开配置返回的客户端 ID 已与此项目 Clients 页唯一 Web 客户端完整匹配；没有读取或输出客户端密钥。

| 字段                             | 准备值 / 填写依据                                                          | 状态                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Google Cloud Project ID          | `exportyoutubeplaylist-503312`                                             | 已从控制台确认，并核对生产 Client ID 归属                                             |
| Project number                   | `[待核实：控制台显示的项目编号]`                                           | 待核实                                                                                |
| OAuth Client ID                  | `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com` | 已与生产公开配置匹配；不保存 client secret                                            |
| 应用名称                         | `Playlist Expoter`                                                         | 用户指定的准确拼写；已保存回读、通过品牌验证并发布                                    |
| Logo                             | 已恢复的原版 E 图标                                                        | 线上 logo.png/favicon.ico 与原件字节一致；E 图标已保存并发布                          |
| User support email               | `stepan101dev@gmail.com`                                                   | 用户确认 OAuth 沿用当前可选 Gmail；网站公开支持仍为 support@exportyoutubeplaylist.com |
| Developer contact email          | `stepan101dev@gmail.com`                                                   | 控制台已有地址；用户确认沿用                                                          |
| Audience / User type             | `External`                                                                 | 控制台已确认 External                                                                 |
| Publishing status                | `In production`                                                            | 已切换并回读为 In production；未验证范围仍有 100 用户上限                             |
| Application home page            | `https://exportyoutubeplaylist.com/`                                       | URL 已保存；新品牌首页 HTTP 200，原版 E 图标已回读                                    |
| Privacy policy                   | `https://exportyoutubeplaylist.com/privacy-policy`                         | URL 已保存；新品牌隐私页 HTTP 200                                                     |
| Terms of service                 | `https://exportyoutubeplaylist.com/terms-of-service`                       | 政策与 URL 已保存；本轮未单独重测条款页                                               |
| Authorized domains               | `exportyoutubeplaylist.com`                                                | 不含协议和路径；仍需域名风险与所有权验证                                              |
| Demonstration video              | [8:36 审核演示](https://youtu.be/lFRCukfn3cg)                              | 已上传为 Unlisted；无痕窗口已确认实际播放，无需额外访问权限                           |
| 当前 Branding / Data access 状态 | Playlist Expoter / E 已验证发布；Data access 审核中，尚未获批              | 869 字符权限理由和视频 URL 已保存成功；最终审核请求已提交，正在审核，见第 9 节        |

支持邮箱的历史收信测试已记录于 [AdSense 准备记录](../adsense-readiness.md)。本次未重复发送测试邮件，也不将历史记录表述为本次重测。

控制台支持邮箱下拉仅有 `stepan101dev@gmail.com`，没有受管理的 Google Group；用户因此明确确认 OAuth 沿用此 Gmail，网站公开支持邮箱保持 `support@exportyoutubeplaylist.com`。后者如需进入下拉，须满足 Google 账号或群组资格。[支持邮箱要求](https://support.google.com/cloud/answer/15549049?hl=en)

域名所有权应由该 Cloud 项目的 Owner 或 Editor 账号在 [Google Search Console](https://search.google.com/search-console) 验证。检查首页、隐私政策、条款、redirect URI、JavaScript origin 涉及的所有域名；公共政策链接和授权屏幕中的链接必须一致。[验证要求](https://support.google.com/cloud/answer/13464321?hl=en) · [生产 OAuth 配置要求](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)

## 3. 精确回调和可供审核的页面

以下地址以当前生产域名为基础；改品牌不一定改域名，若最终改域名，必须同步更新代码配置与控制台，不能只替换表格中的文字。

| 用途                 | 精确地址                                                             | 依据 / 注意事项                                                          |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| YouTube 连接回调     | `https://exportyoutubeplaylist.com/api/youtube-connections/callback` | `src/routes/api/youtube-connections/index.ts` 构造，`callback.ts` 接收   |
| 普通 Google 登录回调 | `https://exportyoutubeplaylist.com/api/auth/callback/google`         | Better Auth 挂载于 `/api/auth/$`；实际 `auth_url` 如另有覆盖须复核       |
| JavaScript origin    | `https://exportyoutubeplaylist.com`                                  | 如使用 Google One Tap / 浏览器 Google 登录，核实实际所需配置；不能加路径 |
| 功能介绍             | `https://exportyoutubeplaylist.com/youtube-playlist-backup`          | 无需登录即可查看备份用途                                                 |
| 登录入口             | `https://exportyoutubeplaylist.com/sign-in`                          | 普通网站登录与连接 YouTube 是两个步骤                                    |
| 实际收藏夹工作区     | `https://exportyoutubeplaylist.com/settings/collections`             | 需要登录及适用权限，演示中展示实际可用状态                               |
| 公开交互式样例       | `https://exportyoutubeplaylist.com/demo`                             | 可作辅助介绍，使用样例数据                                               |
| 联系入口             | `https://exportyoutubeplaylist.com/contact`                          | 公开支持与隐私请求入口                                                   |

两条回调不能互相替代；也不要给回调加 `/zh`、末尾斜杠或 `callbackUrl` 参数。中文页面可作为站内返回页，但代码仍使用同一 `/api/youtube-connections/callback`。生产连接回调的 origin 与 `envConfigs.app_url` 绑定。用实际授权 URL 核对 `redirect_uri` 与控制台完全一致。[Web OAuth 文档](https://developers.google.com/youtube/data/guides/auth/server-side-web-apps)

## 4. Data access：范围和用途

| 项目              | 当前依据与填写方式                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| YouTube scope     | `https://www.googleapis.com/auth/youtube.readonly`；在 `src/lib/youtube-connections/types.ts` 定义，并在 `google.ts` 的授权请求中使用                                                      |
| Google 显示的含义 | 查看用户的 YouTube 账号；控制台已确认 youtube.readonly 为唯一敏感范围，受限范围为空                                                                                                        |
| Google 登录范围   | 已保存 `openid`、`https://www.googleapis.com/auth/userinfo.email`、`https://www.googleapis.com/auth/userinfo.profile`；回读显示为非敏感范围                                                |
| 后台访问          | 连接时即请求 `access_type=offline`，使用户以后发起手动检查时能续期同一只读授权；当前自动扫描未启用，后台定时用途仅在实际启用后适用；不是新增 scope。中英文 Connect 面板已说明离线/后台用途 |
| 最小权限理由      | API key 不能代表用户读取其授权的私有数据；只读范围支持相应读取功能，无需申请管理、上传、编辑或删除权限                                                                                     |
| 功能说明材料      | 使用本目录按真实实现编写的用途说明与数据处理材料；只描述已经实现且可展示的功能                                                                                                             |

Data access 必须包含项目各客户端实际请求的全部范围；不要为了未来功能增加范围。明确请求什么数据、在哪个界面使用、为何更窄的权限不能完成该功能。[范围验证说明](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) · [YouTube scope 定义](https://developers.google.com/youtube/data/guides/auth/server-side-web-apps)

## 5. Branding 与 Data access 分别审核

**Branding** 核对身份、应用名称、Logo、首页、政策链接、域名所有权和联系信息。**Data access** 核对申请的敏感权限、用途、必要性与真实功能演示。品牌通过不等于 `youtube.readonly` 已获批。

当前官方流程：

1. 选择实际生产项目，启用所用的 YouTube Data API，核对 Web 客户端、生产回调、实际请求范围及 External 受众。
2. 在 [Branding](https://console.cloud.google.com/auth/branding) 保存最终资料，点击 **Verify Branding**。按结果修正问题或申请人工复核。
3. 状态到达 **Ready to publish** 后点击 **Publish branding**。官方当前说明品牌验证结果有效期为 7 天；未在期限内发布可能需要重新验证。
4. 提交数据访问审核前，在 [Audience](https://console.cloud.google.com/auth/audience) 确认 **External / In production**；若仍为 Testing，在上述发布条件完成后使用 Publish app。这里的应用受众发布与 Publish branding 是不同操作。[提交准备要求](https://support.google.com/cloud/answer/13461325?hl=en)
5. 品牌已发布且应用为生产状态后，在 [Verification Center](https://console.cloud.google.com/auth/verification) 按界面提交 Data access 审核：用途理由、相关功能链接、演示视频及要求的补充信息。保存审核结果并持续关注审核邮箱；不要把发布按钮当作权限审核通过。

以上流程来自当前官方说明，控制台字段以实际项目界面为准；本次实际完成状态见下方追加记录。[敏感权限验证流程](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)

Testing 只向已列出的测试用户开放，授权及离线刷新令牌通常 7 天过期。In production 仍可能有未验证警告和未获批范围的用户上限；审核通过也不能覆盖 Workspace 管理员、账号安全策略或服务可用性限制。[Audience 与用户上限](https://support.google.com/cloud/answer/15549945?hl=en)

## 6. 演示与数据处理的提交先决条件

- [ ] 视频使用最终品牌和真实生产应用，显示完整英文授权过程，包括普通 Google 登录（如使用）和 YouTube 授权。
- [ ] 视频中可识别应用名、完整同意屏幕、申请范围，浏览器地址栏可确认对应 OAuth Client ID。不要展示密码、client secret、授权码或令牌。
- [ ] 视频展示每项申请权限对应的真实功能，使用专门的演示数据；连接、读取、保存、导出和撤销的操作与文字材料一致。
- [x] 用户确认 YouTube 条款及 **Unlisted** 后，视频已上传：[审核演示](https://youtu.be/lFRCukfn3cg)。Studio 处理完成，Unlisted 和退出登录实际播放均已确认。
- [x] 退出登录无痕窗口已实际播放，无需申请观看权限。[视频要求](https://support.google.com/cloud/answer/13464321?hl=en)
- [x] 已发布的隐私政策说明访问、使用、保存、分享、保护、删除 Google 用户数据的方式，并声明不将 Google 授权数据用于广告定向、出售或未披露用途。[Google 用户数据政策](https://developers.google.com/terms/api-services-user-data-policy)
- [x] 中英文 Connect 面板已明确披露 offline/background 用途。
- [ ] 在真实生产授权录屏中展示这些提示及完整 consent screen，核对与最终品牌和申请范围一致。
- [x] 政策直接链接 [Google 隐私政策](https://policies.google.com/privacy) 和 [Google 授权管理](https://security.google.com/settings/security/permissions)；条款链接 [YouTube 使用条款](https://www.youtube.com/t/terms)，并说明使用相关服务即受其约束。
- [ ] 核实普通 API 元数据在 30 天内刷新或删除；快照条数上限不等于时间上限。不能将新快照创建时间用来表示旧数据已刷新。
- [x] 上一轮应用内断开有生产聚合证据；本轮四条测试备份已获准删除，重载页面显示无连接、1/10、70 条目。本轮未重新查询 D1，也未独立验证 Google 侧撤销。
- [ ] 独立验证 Google revoke 响应、最多 7 天的加密重试、账号删除、Google 设置侧外部撤销检测及 30 天失败关闭。无队列积压及未核对账号的 Google 搜索无结果，不足以证明全部 Google 撤销链路。
- [ ] 核对人工删除请求的处理流程，确保尽快且最迟 7 天内处理；代码与部署结果不能证明运营请求已按时完成。[YouTube 数据、撤销与保留规则](https://developers.google.com/youtube/terms/developer-policies)
- [x] 已发布政策明确删除本应用数据不修改 YouTube 原始数据，并公开隐私联系邮箱 `support@exportyoutubeplaylist.com`。

普通敏感权限验证不等于必须进行受限权限的年度第三方安全评估；最终以项目实际申请范围与 Google 要求为准。OAuth 验证与 YouTube 配额扩容 / 合规审核是不同事项；不要将 OAuth 获批写成无限 API 配额。[验证类型要求](https://support.google.com/cloud/answer/13464321?hl=en) · [YouTube 配额与合规审核](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)

## 7. 2026-10-18 部署前线上核验记录（历史）

以下保留同日部署前的观察，不代表第 8 节部署后的政策状态。检查方式：对公开网页进行网页读取，并在浏览器直接读取隐私政策和备份页。没有登录、提交表单、改变授权或录制完整真实连接。终端匿名 HTTP 请求被返回 403，但浏览器可读取页面，因此不据此认定网站或备份页故障。

| 页面                                                                | 本次观察                                                                                                                      | 提交前处理                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [首页](https://exportyoutubeplaylist.com/)                          | 有公开导出说明、隐私政策入口；文案强调公开数据、不需要 YouTube 登录、不保存导出历史                                           | 区分一次性公开导出与需授权、保存数据的备份功能                          |
| [隐私政策](https://exportyoutubeplaylist.com/privacy-policy)        | 浏览器确认日期为 2026-09-01；明确否认使用 YouTube OAuth，表示不存播放列表数据，仍说付费功能未提供                             | 发布与实际 OAuth、备份和支付行为一致的新版本；补 Google 隐私 / 撤销链接 |
| [使用条款](https://exportyoutubeplaylist.com/terms-of-service)      | 仍主要描述公开导出和不持久保存；YouTube Terms 为普通文字                                                                      | 覆盖当前功能并增加明确的 YouTube 条款链接与约束说明                     |
| [联系页](https://exportyoutubeplaylist.com/contact)                 | 有确认的支持邮箱，但仍说没有保存播放列表历史                                                                                  | 补充连接、备份和隐私删除的真实处理入口                                  |
| [备份页](https://exportyoutubeplaylist.com/youtube-playlist-backup) | 浏览器可访问；推广自动快照和变化通知，说明私有播放列表、喜欢的视频、订阅需要连接 YouTube；最多 5 个快照，没有最长保存天数说明 | 与隐私政策和经过验证的保留机制一致；展示真实授权入口和用途              |

这份历史记录说明更新政策的原因；下节记录已确认的部署结果。提交前仍须复核线上页面与视频一致，并补充真实演示视频与独立 Search Console 所有权记录；项目、客户端、品牌和 Logo 的已确认状态见第 9 节。

## 8. 2026-10-18 部署后核验记录

生产版本：`2835c194-ca9c-425e-8530-68638248ad91`。远端 `0002` 数据库迁移已应用，检查时没有待应用迁移。

| 核验项             | 已确认的证据                                                                                                                                             | 证据边界                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 公开政策           | 英文、中文隐私政策、条款、联系页六个 URL 均为 HTTP 200，页面日期为 2026-10-18，披露与实现一致                                                            | 此为生命周期版本记录；后续品牌发布见第 9 节，本次未重测支持邮箱收信 |
| 私密响应头         | 检查的私密路径具有限制脚本及连接的 CSP，以及 `Cache-Control: private, no-store`                                                                          | 响应头检查不等于完整浏览器网络审计                                  |
| 边缘分析脚本       | Chrome DevTools 在已登录的 `https://exportyoutubeplaylist.com/` 文档中确认 Cloudflare `beacon.min.js` 违反私密 CSP 的 `script-src`，浏览器报告已阻止执行 | 证据限于该已登录首页；未宣称所有页面或全部网络请求均已审计          |
| 维护任务           | 2026-10-18 13:35 UTC Cron 结果为 `ok`，`failed: []`；清理 `reviewed: 2`、`cleaned: 0`、`sweepComplete: true`                                             | 证明此次维护执行完成；没有实际清理过期数据                          |
| 授权核验与撤销队列 | 此次任务相关计数均为 0，没有待处理项目                                                                                                                   | 未测试真实 Google token 撤销，也未证明外部撤销检测或重试完整链路    |

以上第 8 节为生命周期部署时点记录。此后已访问 Cloud Console 并保存 Playlist Backup 品牌资料、三个公开链接及基础登录范围；敏感权限申请已提交并正在审核。旧 Playlist Backup / PB 的网站更名与 Google 品牌发布曾完成；当前 Playlist Expoter 与原版 E 图标已部署、同步 Console 并通过品牌验证与发布；独立 Search Console 所有权记录、真实演示和生命周期验收继续按实际证据补齐。

## 9. 本轮控制台配置记录

- 生产 `/api/config/public` 与 Google Cloud Clients 页的完整 Web client ID 已匹配；项目为 `exportyoutubeplaylist-503312`，客户端为 `export-youtube-playlist`。
- 两条回调和 `https://exportyoutubeplaylist.com` JavaScript origin 均正确，无需修改客户端凭据。
- Data access 已保存并回读：`openid`、`userinfo.email`、`userinfo.profile` 为非敏感范围，`youtube.readonly` 是唯一敏感范围，受限范围为空。这只是登记现有登录功能，不新增数据访问用途。
- 历史：用户当时选定 **Playlist Backup**。Branding 名称、首页、隐私政策、条款链接均已保存并回读，网站更名已部署，品牌版本为 `5d9288f2-7ee3-4ee9-8b37-c1e06e273008`。
- 用户确认 OAuth 支持邮箱和开发者联系邮箱使用 `stepan101dev@gmail.com`；网站公开支持邮箱仍为 `support@exportyoutubeplaylist.com`。
- Audience 已由 Testing 切换为 **External / In production**，回读显示正式版及 1/100 用户。Testing 白名单限制已解除，但未验证敏感权限仍可能显示警告并受用户上限影响。
- 新的 PB 图标取自网站同源 `public/logo.png`，已选择正确文件并保存，回读显示当前应用徽标。
- 用户指定真实演示账号 `stepan101dev@gmail.com`；不得将该个人账号作为共享审核凭据。真实重新授权、私有读取、Excel 导出与应用内断开清理已观察；外部撤销和账号删除仍待独立验收；最终视频已完成并上传。

- 品牌部署版本 `5d9288f2-7ee3-4ee9-8b37-c1e06e273008`；首页及中英文政策、条款、联系页均 HTTP 200 且包含 Playlist Backup，图标 HTTP 200。无新增数据库迁移。
- 历史：旧 Playlist Backup / PB 的 Google 品牌验证曾通过并执行 Publish branding，最终回读“您的品牌已经过验证，正在向用户显示。”。这不等于敏感范围 `youtube.readonly` 已批准，也不替代独立 Search Console 所有权记录。
- 中英文 Connect 面板已明确 offline/background 用途；真实首授权及现有 grant 复查均已操作，录屏需如实标明首授权 Continue/回调未连续捕获的缺口。
- 限时审核访问已实现并上线；仅 `stepan101dev@gmail.com` 在邮箱已验证且精确匹配时获得 10 个收藏额度，截止 `2026-11-17T23:59:59Z`；不改变 Stripe 或新增数据库迁移。名单保存在 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` Worker secret，公开配置和 UI 不暴露名单，用户界面只显示本人审核限额。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。维护方法见 [readiness.md](readiness.md#限时审核访问的服务端维护)。
- 历史上 Prepare 表单曾因缺少视频而无法保存旧 856 字符说明。现已将新版 869 字符权限理由和 `https://youtu.be/lFRCukfn3cg` 保存到 Google Data access，UI 回读“已保存数据访问权限更改”。最终敏感权限验证请求已提交并正在审核；视频处理完成且退出登录实际播放已确认。

- 审核额度发布时版本 `33cf0e4c-6362-455d-8471-eefce06dec58`，2026-10-18 14:05:10 UTC；代码版 `4070e000-7b05-4f93-bdac-9d759080242e` 的 43 项相关测试、tsc、build 通过。无新数据库迁移或 Stripe 改动。
- 历史旧品牌重新授权已成功：英文 Google consent screen 显示 `Playlist Backup`，已有 1 项服务权限为 `View YouTube account`；点击 Continue 后返回 `/settings/collections?youtube=connected`，页面回读 `YouTube account connected` 和 `Stepan Connected`。本次复用已有 YouTube 只读权限，未新增范围；不是首次新增授权的录屏证据。
- Watch Later（`WL`）不受支持。已在 YouTube 原生 UI 确认演示账号 `stepan101dev@gmail.com`，并按用户授权创建私享播放列表 `Playlist Backup OAuth Review`，加入 1 个公开视频 `Me at the zoo`（`jNQXAC9IVRw`）；UI 回读 Private、1 video。测试列表为 <https://www.youtube.com/playlist?list=PLA73ZS4HfS3c>。网站已成功创建 Private playlist 备份，首次读取保存成功；Latest version 1 显示 `Me at the zoo`、`jawed`、`0:19` 和 `jNQXAC9IVRw` 链接。Excel 文件已下载并核对内部 XML 的视频 ID、标题和频道。随后用户批准并执行断开连接及删除两个关联私有备份，应用页面与生产聚合计数确认清理；上一轮断开后曾显示无 YouTube 连接、`1/10`，仅保留含 70 条目的公开频道收藏；本轮曾重新连接并新建 4 个测试备份，现已按用户批准完成断开和删除；当前 UI 为无连接、1/10 个收藏、70 个保存条目。详见 [真实读取、导出与应用内断开记录](readiness.md#真实读取导出与应用内断开记录)。
- 线上自动扫描尚未启用，UI 明确手动检查；后台扫描不在本次已验证结果内。

- 首次录屏工具失败为历史记录；本轮主录屏 31:02.983、补录 609 秒均已保存并确认媒体参数。最终 8:36 视频已完成、本地 QA 通过并上传；权限理由与链接已保存，最终敏感权限申请已提交并正在审核，尚未获批。
