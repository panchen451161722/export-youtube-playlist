# Google OAuth 验证材料包

准备日期：2026-10-18。目标：让外部 Google 用户连接自己的 YouTube 账号，使用只读收藏备份功能。

**当前状态**：品牌严格使用 `Playlist Expoter`，原版 E 图标已恢复。生产版本 `3897fcb2-322a-4cc5-bf18-b7271e12327f` 于 `2026-10-18T14:56:46Z` 部署并承接 100% 流量；Google Console 已保存新名称和 E 图标，品牌验证通过并发布，最终回读“您的品牌已经过验证，正在向用户显示。”。下文 `Playlist Backup` / PB 内容保留为历史记录。最终 8:36 视频已完成并通过本地 QA，用户确认后已上传为 Unlisted：[演示视频](https://youtu.be/lFRCukfn3cg)。四类来源均已读取非空结果，用户批准的四条测试备份已于约 `2026-10-19 02:38 UTC` 断开并删除。869 字符权限理由和视频链接已在 Data access 保存成功。无痕窗口已验证视频实际播放；约 2026-10-19 02:58 UTC 已提交，Verification Center 回读“您的应用的数据访问权限正在审核中。”，尚未获批。

**材料、生产数据库迁移和应用部署已完成；生产计划任务已成功运行，真实 YouTube 重新授权、私有数据读取、Excel 导出及应用内断开清理已验证；外部 Google 撤销、账号删除、生产过期清理及邮件发送仍待验收。** 新版覆盖撤销重试、关联数据删除、保存期限及私密页面脚本隔离，中英文政策已上线。Google 控制台此前保存的是旧品牌 `Playlist Backup` / PB Logo、链接与范围，受众为 External / In production；旧品牌曾验证并发布；当前 `Playlist Expoter` 与原版 E 图标也已同步、验证并发布。敏感权限审核尚未完成，不能称所有用户已可正常连接。生产证据及剩余验收项见 [readiness.md](readiness.md)。

## 本轮界面演示与录制文件状态

本轮使用真实生产品牌 `Playlist Expoter`，已操作英文普通 Google 登录及独立的新 `youtube.readonly` 授权。首授权的 Continue 与回调成功没有在前台连续录到；补录中的英文权限详情和完整 Client ID 展示复用了同一现有 grant，不能剪成一次连续的首次授权。真实地址栏展示的 Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，权限详情为 `View your YouTube account`。成片按独立流程区分主流程与现有授权复查，不表示连续首次授权。

主录屏 `/Users/stepan/Desktop/录屏2026-10-18 18.41.41.mov`（31:02.983）与补录 `/Users/stepan/Desktop/录屏2026-10-18 19.30.52.mov`（609 秒）均保留；两者为 2560×1440、H.264、无音轨。最终成片为 `/Users/stepan/Desktop/Playlist-Expoter-OAuth-Review/Playlist-Expoter-OAuth-Review.mp4`，**516.000 秒（8:36）**、**2196×1256**、**30 fps**、**12,138,663 bytes**，已取代 6:07 主流程草稿用于提交。最终视频已合并并通过本地 QA：章节边界与新转场未出现无关窗口，完整 Client ID 清晰可读，完整 ffmpeg 解码通过。用户在上传时明确确认 YouTube 条款及 Unlisted 发布，视频已上传为 [Google OAuth 演示](https://youtu.be/lFRCukfn3cg)。Studio SD/HD 均处理完成，退出登录无痕窗口已实际播放并确认 Unlisted。869 字符权限理由及该视频链接已保存到 Google Data access，UI 回读“已保存数据访问权限更改”；最终敏感权限审核请求已提交并正在审核，尚未获批。

最终提交前，Studio 的 SD/HD 均已处理完成。退出登录的 Chrome 无痕窗口显示 Sign in、Unlisted 标记及正确视频，实际播放到 0:02 后于 0:09 / 8:36 暂停，画面显示录制的网站；[视频](https://youtu.be/lFRCukfn3cg) 无需申请权限即可播放。约 2026-10-19 02:58 UTC（当地 2026-10-18 19:58 PDT），已确认 Prepare 表单，问卷中个人用途、内部用途、开发/测试专用、WordPress 四项均选择 No，确认阅读指南及有条件适用的 CASA 提示后点击 **Submit for verification**；本项目没有受限范围，不据此声称需要或通过 CASA。已提交 869 字符用途理由、视频链接及 966 字符审核补充说明，后者请 Google 提供审核邮箱以配置免费额度，不共享个人 Google 密码。最终 Verification Center 明确显示 **“您的应用的数据访问权限正在审核中。”** 并提供查看审核进度按钮；品牌仍为已验证并发布。此结果为 **已提交、审核中，尚未获批**。Google 审核员具体邮箱仍待其提供，不能声称已给审核员开通额度。

私享列表 `PLA73ZS4HfS3c` 读取 1 个 `Me at the zoo` 条目；本轮 Excel 为 2,972 bytes，Quick Look 已核对标题、`jawed`、链接和时长。当地 18:51 的 Check now 成功，Total runs 为 2。补录还在 YouTube 原生界面显示该列表为“私享”、1 个视频，历史测试列表名称仍为 `Playlist Backup OAuth Review`。

用户已明确允许添加测试素材；在 YouTube 原生页面手动点赞 **Beethoven - Für Elise**（Rousseau，`wfF0zHeU3Zs`）并订阅 Rousseau。网站没有写入 YouTube，仍仅申请 `youtube.readonly`。补录中 Liked videos 于当地 19:33、Liked music 和 YouTube subscriptions 于 19:34 完成第 3 次检查，Latest version 均为 1 条：前两类显示该音乐视频，订阅显示 Rousseau。三类初次读取为空的情况已由这些真实非空读取补充；当前单一音乐样本不证明非音乐条目排除的对照测试。

用户明确批准后，约 `2026-10-19 02:38 UTC` 已执行 **Disconnect and delete backups**，删除本轮 Private playlist、Liked videos、Liked music 和 YouTube subscriptions 四条测试备份。重新加载页面后显示 **No YouTube accounts connected yet**、**1/10** 个收藏、**70** 个保存条目，仅余原有公开频道收藏。原始 YouTube 列表、点赞及订阅仍保留。补录约 425–609 秒被 Codex 前台遮挡，不能作为可用的断开或清理结果录像；上述清理结论来自现场 UI 回读，最终视频不宣称展示该操作。本轮没有新增生产 D1 聚合检查，也未独立确认 Google 侧撤销结果；不能将上一轮数据库计数或应用 UI 清理作为本轮 Google revoke 成功的证据。

## 文件与使用顺序

| 文件                                               | 用途                                                     |
| -------------------------------------------------- | -------------------------------------------------------- |
| [控制台填写与提交清单](console-checklist.md)       | 项目、受众、品牌、域名、回调地址、权限、审核顺序         |
| [英文提交文案](submission.en.md)                   | 可复制的产品说明、权限理由、后台访问解释、审核员操作说明 |
| [中英文隐私与产品披露草案](privacy-disclosures.md) | 政策、条款、联系页与连接前提示；提交前须核对真实行为     |
| [演示视频脚本](demo-script.md)                     | 真实录屏步骤、英文旁白、演示账号准备、视频验收           |
| [实现差距与验收](readiness.md)                     | 数据流证据、撤销、删除、保存期限、邮件及分析工具风险     |

英文说明中的功能描述可以作为填写基础；发布承诺和演示删除部分只有在对应实现通过验收后才能使用。不要整份内部材料直接贴入 Google 表单。

## 已确认的信息

- 当前网站：<https://exportyoutubeplaylist.com/>。
- 网站支持邮箱继续使用 `support@exportyoutubeplaylist.com`。OAuth 控制台的支持邮箱和开发者联系邮箱当前均为 `stepan101dev@gmail.com`；支持邮箱下拉仅有这个 Gmail、没有 Google Group，网站域名邮箱当前不可选。用户已确认 OAuth 支持邮箱和开发者联系邮箱均沿用该 Gmail，网站邮箱不因此更改。
- 请求的 YouTube 权限：`https://www.googleapis.com/auth/youtube.readonly`。Data access 已保存并回读：非敏感范围为 `openid`、`userinfo.email`、`userinfo.profile`，唯一敏感范围为 `youtube.readonly`，受限范围为空。本次只是补登记既有登录范围，不扩增敏感范围。
- 历史品牌 `Playlist Backup` 曾部署，版本为 `5d9288f2-7ee3-4ee9-8b37-c1e06e273008`；首页及中英文政策页面、网站 Logo 与控制台品牌和 PB Logo 已核对。用户确认使用 `stepan101dev@gmail.com` 演示；上一轮已完成真实重新授权、私有读取、Excel 导出与应用内断开清理；本轮录屏文件与最终剪辑状态见上方。
- 普通 Google 登录与连接 YouTube 分开触发；前者使用基础身份权限，后者读取用户授权的数据。
- YouTube 回调：`https://exportyoutubeplaylist.com/api/youtube-connections/callback`。
- 网站 Google 登录回调：`https://exportyoutubeplaylist.com/api/auth/callback/google`。
- `access_type=offline` 是获取后台访问能力的参数，不是另一个权限范围。线上自动扫描尚未启用，UI 明确显示手动检查；维护 Cron 不等于收藏自动扫描。
- 审核额度发布时的版本为 `33cf0e4c-6362-455d-8471-eefce06dec58`（2026-10-18 14:05:10 UTC）。仅 `stepan101dev@gmail.com` 在邮箱已验证且精确匹配时获得 10 个收藏额度，截止 `2026-11-17T23:59:59Z`；不改变 Stripe 或新增数据库迁移。名单保存在 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` Worker secret，公开配置和 UI 不暴露名单，用户界面只显示本人审核限额。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。维护方式见 [readiness.md](readiness.md#限时审核访问的服务端维护)。
- 历史旧品牌重新授权已成功：英文 Google consent screen 显示 `Playlist Backup`，已有 1 项服务权限为 `View YouTube account`；点击 Continue 后返回 `/settings/collections?youtube=connected`，页面回读 `YouTube account connected` 和 `Stepan Connected`。本次复用已有 YouTube 只读权限，未新增范围；不是首次新增授权的录屏证据。
- 用户提供的 Watch Later（`WL`）不受支持。已在 YouTube 原生 UI 确认演示账号 `stepan101dev@gmail.com`，并按用户授权创建私享播放列表 `Playlist Backup OAuth Review`，加入 1 个公开视频 `Me at the zoo`（`jNQXAC9IVRw`）；UI 回读 Private、1 video。测试列表为 <https://www.youtube.com/playlist?list=PLA73ZS4HfS3c>。网站已成功创建 Private playlist 备份，首次读取保存成功；Latest version 1 显示 `Me at the zoo`、`jawed`、`0:19` 和 `jNQXAC9IVRw` 链接。Excel 文件已下载并核对内部 XML 的视频 ID、标题和频道。随后用户批准并执行断开连接及删除两个关联私有备份，应用页面与生产聚合计数确认清理；上一轮断开后曾显示无 YouTube 连接、`1/10`，仅保留含 70 条目的公开频道收藏；本轮曾重新连接并新建 4 个测试备份，现已按用户批准完成断开和删除；当前 UI 为无连接、1/10 个收藏、70 个保存条目。详见 [真实读取、导出与应用内断开记录](readiness.md#真实读取导出与应用内断开记录)。
- 用户审查批准后，生产 D1 已应用 `0002_wooden_overlord.sql`，应用已部署，`*/5 * * * *` 维护任务已运行成功；中英文隐私政策、条款和联系页均返回 HTTP 200，日期为 2026-10-18。
- 已核对 Google Cloud 项目 `exportyoutubeplaylist-503312`；项目只有一个 Web 客户端，名称为 `export-youtube-playlist`，Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，与生产公开配置完全一致。没有根据 Client ID 前缀推测项目编号。
- 该客户端的 JavaScript origin 为 `https://exportyoutubeplaylist.com`，上方两条回调地址已正确配置。
- 旧版 Branding 曾保存并回访读到 `Playlist Backup`、PB Logo、OAuth Gmail 及三个完整链接：`https://exportyoutubeplaylist.com/`、`https://exportyoutubeplaylist.com/privacy-policy`、`https://exportyoutubeplaylist.com/terms-of-service`。
- Audience 已确认 External / In production，回读显示用户计数 `1/100` 并提示仍需验证。Testing 仅限测试用户的门槛已解除，未验证警告及用户额度仍存在。
- 旧品牌 `Playlist Backup` 验证曾通过，并已点击 Publish branding；最终回读“您的品牌已经过验证，正在向用户显示。”。最终演示视频已上传，权限理由与链接已保存；Data access 的最终验证申请已提交并正在审核。

## 已提交后的审核与验收跟进

1. **品牌验证与规则核对**：网站与控制台已统一为用户指定的 `Playlist Expoter` 和原版 E 图标；本次新资料已保存、验证并发布，最终状态已回读。旧 `Playlist Backup` / PB 的通过记录只作历史证据。视频及材料已提交，Data access 正在审核；具体审核员邮箱待 Google 提供后配置免费额度。YouTube 专属品牌规则与 OAuth 通用命名示例存在差别；不能保证现名或当前域名必然通过或拒绝。域名所有权核验与品牌合规分别处理，购买新域名不是通用表单的必选步骤。[YouTube 品牌规则](https://developers.google.com/youtube/terms/branding-guidelines)、[OAuth 品牌说明](https://support.google.com/cloud/answer/15549049?hl=en)
2. **政策与实际行为核对**：中英文政策及旧 `Playlist Backup` 更名曾部署，控制台首页、隐私政策和条款完整链接曾保存回读；本次首页、工具页、隐私页已回读 `Playlist Expoter` 且返回 HTTP 200，线上图标字节与恢复原件一致。真实重新授权、私有读取与应用内断开已观察；继续核对外部撤销、邮件发送、服务商及运营做法与披露一致。
3. **撤销与删除**：Google token 撤销重试、关联元数据和邮件清理、物理删除及周期核验已上线。已在真实连接上执行 Disconnect and delete backups，页面显示无连接，生产计数显示凭据和私有收藏均为 0。Google 权限页搜索无结果仅作辅助观察，该页账号未独立核对；外部 Google 撤销检测、重试与账号删除仍须单独验收。
4. **保存期限**：30 天逐副本清理和读取保护已上线，覆盖暂停、失去付费权益及失败任务；生产维护游标完成了一轮扫描。期限边界与遗留数据清理已用本地合成数据验证，仍需持续观察生产任务积压。
5. **审查私密数据的外部流向**：生产私密响应已确认 private/no-store 与限制性 CSP。Cloudflare 仍在 HTML 注入 beacon 标签；Chrome DevTools 已确认已登录首页的 CSP 阻止该 beacon 加载。其他私密页面的完整网络检查及本轮普通 Google 登录已成功；Turnstile 兼容性仍待独立验证；继续核验邮件、日志及其他服务商。
6. **生产端到端证据**：项目和 Client ID 已核对；保留域名核验依据，已观察专用测试账号的私有读取、Excel 导出和应用内断开清理；继续验证外部撤销、账号删除、期限清理和邮件行为，并保存相应证据。主录屏与补录已确认，四类非空结果、Excel 导出、手动检查及应用内清理已观察；最终 8:36 视频已通过本地 QA 并上传为 Unlisted，退出登录实际播放已确认。视频须展示真实英文授权页面和实际范围使用，可使用文字解说，不强制配音；首授权的 Continue/回调存在录屏缺口，补录复用现有 grant，必须如实标明。审核员所需功能应可用，不能要求审核员付款才能检查；限时审核访问已实现并上线；仅 `stepan101dev@gmail.com` 在邮箱已验证且精确匹配时获得 10 个收藏额度，截止 `2026-11-17T23:59:59Z`；不改变 Stripe 或新增数据库迁移。名单保存在 server-only `PLAYLIST_GUARD_REVIEW_ACCESS` Worker secret，公开配置和 UI 不暴露名单，用户界面只显示本人审核限额。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。[视频要求](https://support.google.com/cloud/answer/15549135?hl=en)

具体工程与生产证据见 [readiness.md](readiness.md)。提交时区分已经上线的实现和仍待实测的真实授权行为。

## 控制台核对结果与剩余信息

| 项目                                                 | 当前状态                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 最终应用名称及自有 Logo                              | Playlist Expoter + 原版 E 图标已部署；品牌已验证并发布                                              |
| Google Cloud project ID / production OAuth Client ID | 已从控制台核对，且与生产公开配置一致；见上方记录                                                    |
| OAuth 支持邮箱 / 开发者联系邮箱                      | 用户已确认均沿用 stepan101dev@gmail.com                                                             |
| 域名所有权及品牌问题                                 | 当前品牌已通过；独立 Search Console 记录待补充                                                      |
| 运营主体名称                                         | 从真实运营信息补充；不要虚构公司或地址                                                              |
| 英文演示视频链接                                     | [8:36 Unlisted 视频](https://youtu.be/lFRCukfn3cg) 已上传；无痕窗口已确认实际播放，无需额外访问权限 |
| 审核员访问方式与可用功能                             | 限时额度已回读；四条备份已删；审核员账号仍需另行安排                                                |
| Google OAuth 发布及验证状态                          | External / In production；当前品牌已发布；敏感权限审核中，尚未获批                                  |

应用名、Project ID 和 Client ID 已填入材料。视频已通过退出登录播放检查；视频 URL、869 字符权限理由及 966 字符审核说明已最终提交，Google 已确认审核中。收到 Google 提供的审核员邮箱或补充信息要求后再配置额度并补充真实信息。邮件供应商和投递行为须在启用或对外声明前核对，不能将未验收邮件能力写入演示结论。品牌或域名改变时，应同步更新 URL 与回调地址。

## 建议执行顺序

生产迁移、生命周期应用和政策发布已完成，受众已转为 In production。`Playlist Expoter` 与原版 E 图标的网站部署、Console 保存、品牌验证和发布均已完成；这不代替敏感权限审核。演示账号的限时额度已回读，私有备份读取、Excel 导出及应用内断开清理已验证；上一轮断开后曾为 1/10，仅保留公开频道收藏。本轮四类备份均已有非空读取结果，并完成获准的断开与清理，当前 UI 为无连接、1/10 个收藏、70 个条目。继续补齐其他私密页面网络检查、外部撤销、账号删除、期限清理与邮件验收。最终成片已通过本地 QA 并上传，869 字符权限理由及视频链接已保存到 Data access；退出登录实际播放已通过，材料已提交并进入审核；等待 Google 回复，按其提供的审核员邮箱安排免费额度。

发布为 In production 只改变可申请授权的受众状态；未验证权限仍有警告或用户限制。审核通过也不能保证所有账户均可连接，例如组织管理员仍可限制第三方应用。[Google 受众说明](https://support.google.com/cloud/answer/15549945)

## 参考资料

- [Google 敏感权限验证与演示要求](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Google API 用户数据政策](https://developers.google.com/terms/api-services-user-data-policy)
- [YouTube API 开发者政策](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube API 品牌规则](https://developers.google.com/youtube/terms/branding-guidelines)

本包将 OAuth 权限审核与 YouTube API 配额扩容分开处理，不申请额外配额。
