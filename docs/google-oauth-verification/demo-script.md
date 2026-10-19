# Google OAuth verification demo script

Prepared: 2026-10-18 local. Final status: the 516-second (8:36) video passed local QA, was uploaded as Unlisted after user confirmation, and passed signed-out playback checks: https://youtu.be/lFRCukfn3cg. At approximately 2026-10-19 02:58 UTC (October 18, 19:58 PDT), the 869-character justification, video URL and 966-character reviewer instructions were submitted. Verification Center confirms data access is under review, not yet approved. The live cleanup was observed, but its obscured supplemental footage was not used.

当前品牌严格使用 `Playlist Expoter`，原版 E 图标已恢复并部署；Google Console 已保存新名称和 E 图标，本次品牌验证通过并完成发布，最终回读“您的品牌已经过验证，正在向用户显示。”。当前 100% 生产版本为 `3897fcb2-322a-4cc5-bf18-b7271e12327f`（`2026-10-18T14:56:46Z`）。以下 `Playlist Backup` / PB 发布及实测结果仍作为历史证据保留。最终视频已上传为 Unlisted，权限理由与链接已保存到 Data access；最终敏感权限审核请求已提交并正在审核，尚未获批。

本文用于运营者录屏，中文为操作指引，英文可作为屏幕说明、字幕或自愿录制的旁白，
不要求录音。政策与生命周期修复已于 2026-10-18 部署；正式视频仍须展示真实授权和功能结果，
不能把部署、维护任务成功或本地测试当成实际 Google 撤销的证据。

## Recording identity and evidence

| Item                                        | Value to confirm before recording                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Website                                     | `https://exportyoutubeplaylist.com`                                                                                       |
| Previous source app name (historical)       | `Export YouTube Playlist`                                                                                                 |
| User-confirmed target product brand         | `Playlist Expoter` — exact spelling; original E logo restored and deployed                                                |
| Google Auth Platform Branding               | Playlist Expoter / original E logo — verified and published; final UI read back                                           |
| Exact target consent-screen app name        | `Playlist Expoter` — verified/published; real English consent screens observed and recorded                               |
| OAuth project ID                            | `exportyoutubeplaylist-503312` — production client ownership confirmed in Console                                         |
| OAuth client ID                             | `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com` — confirmed by production public configuration |
| YouTube connection callback                 | `https://exportyoutubeplaylist.com/api/youtube-connections/callback`                                                      |
| Recording date / deployed version           | `2026-10-18 Pacific / 3897fcb2-322a-4cc5-bf18-b7271e12327f`                                                               |
| Video link                                  | [8:36 Unlisted demonstration](https://youtu.be/lFRCukfn3cg) — signed-out actual playback confirmed                        |
| Reviewer access instructions                | `[SECURE ACCESS ARRANGEMENT / CONTACT — no password here]`                                                                |
| User-confirmed public website support email | `support@exportyoutubeplaylist.com`                                                                                       |
| OAuth user support / developer contact      | `stepan101dev@gmail.com` — user confirmed retaining both fields                                                           |

历史 Playlist Backup / PB 品牌版本为 `5d9288f2-7ee3-4ee9-8b37-c1e06e273008`；此前审核额度发布版本为
`33cf0e4c-6362-455d-8471-eefce06dec58`（2026-10-18 14:05:10 UTC），已包含限时审核访问；前次生命周期版本已应用远端
迁移 `0002`，品牌更新没有新迁移。首页及中英文政策、条款、联系页均 HTTP 200 且包含
Playlist Backup，`/logo.png` 返回 HTTP 200 PNG。若审核访问另行部署，录制表应填写录制时的
实际版本。控制台唯一 Web 客户端 `export-youtube-playlist` 的完整 client ID 与生产公开配置一致。
项目编号未从 client ID 前缀推定，也没有独立取得 Search Console 所有权证据。

历史记录：旧 Playlist Backup 名称、PB Logo、首页、隐私政策及条款链接曾保存并回读。旧品牌验证曾通过并完成
Publish branding，最终回读“您的品牌已经过验证，正在向用户显示。”。Audience 已为
External / In production；Testing 白名单门槛已解除，但敏感范围尚未获批，仍有未验证警告和
用户额度。Data access 已登记三个基础身份范围和唯一敏感 `youtube.readonly`，受限范围为空。

OAuth 支持及开发者邮箱均为 `stepan101dev@gmail.com`，网站公开支持邮箱仍为
`support@exportyoutubeplaylist.com`。录制/测试 Google 账号为 `stepan101dev@gmail.com`，
它不是共享审核凭据，不得分发密码。用户已批准仅指定已验证邮箱、10 个收藏、截至
`2026-11-17T23:59:59Z` 的临时审核访问，不改变 Stripe；现已实现并上线。当前 server-only
secret 只配置 `stepan101dev@gmail.com`，要求邮箱已验证且精确匹配。此前浏览器已回读 `2/10`、`Your plan Lite`、`Free review allowance 10`，以及 `Review access ends Nov 17, 2026, 3:59 PM`（Pacific）；原有 Lite 订阅显示保留。
名单不进入公开配置或 UI，只显示本人 review 限额。维护方式见
[readiness.md](readiness.md#限时审核访问的服务端维护)。

历史 Prepare 表单曾因缺少视频而不能保存旧 856 字符说明；现已保存新版 869 字符权限理由和实际视频链接，UI 回读“已保存数据访问权限更改”。最终审核请求已提交并正在审核，尚未获批。最终 8:36 视频已通过本地 QA 并上传，退出登录视频页和实际播放均已确认；下方保留可复现脚本，实际捕获结果单独记录。品牌审核通过和保存表单都不代替敏感权限审核。

`Export YouTube Playlist` 和 `Playlist Backup` / PB 均属旧品牌历史。当前目标是用户指定的
`Playlist Expoter` 与原版 E 图标；新资料已保存、验证并发布。录制时核对实际网站与 Google
品牌结果，展示真实 consent screen，不能用字幕或修改页面制造一致结果。当前品牌通过
不代表敏感权限或所有其他政策审核已完成。
[YouTube API 品牌规范](https://developers.google.com/youtube/terms/branding-guidelines)

Google 要求演示完整授权过程、英文 consent screen、实际应用名称、授权页地址栏内的
OAuth client ID，以及所申请权限支持的用户功能。若同时使用 Google 登录，登录流程也
需要展示。上传时将 YouTube 视频设为 **Unlisted**。[官方敏感权限验证说明](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)

不同 OAuth 入口均应覆盖，完整 consent screen 中的权限须与提交的权限一致；英文旁白或
字幕可帮助审核理解。不要用交互 demo、合成截图或修改后的 Google 页面替代真实授权。
[官方演示视频指导](https://support.google.com/cloud/answer/13804565?hl=en)

## 本轮界面演示与录制文件状态

本轮使用真实生产品牌 `Playlist Expoter`，已操作英文普通 Google 登录及独立的新 `youtube.readonly` 授权。首授权的 Continue 与回调成功没有在前台连续录到；补录中的英文权限详情和完整 Client ID 展示复用了同一现有 grant，不能剪成一次连续的首次授权。真实地址栏展示的 Client ID 为 `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`，权限详情为 `View your YouTube account`。成片按独立流程区分主流程与现有授权复查，不表示连续首次授权。

主录屏 `/Users/stepan/Desktop/录屏2026-10-18 18.41.41.mov`（31:02.983）与补录 `/Users/stepan/Desktop/录屏2026-10-18 19.30.52.mov`（609 秒）均保留；两者为 2560×1440、H.264、无音轨。最终成片为 `/Users/stepan/Desktop/Playlist-Expoter-OAuth-Review/Playlist-Expoter-OAuth-Review.mp4`，**516.000 秒（8:36）**、**2196×1256**、**30 fps**、**12,138,663 bytes**，已取代 6:07 主流程草稿用于提交。最终视频已合并并通过本地 QA：章节边界与新转场未出现无关窗口，完整 Client ID 清晰可读，完整 ffmpeg 解码通过。用户在上传时明确确认 YouTube 条款及 Unlisted 发布，视频已上传为 [Google OAuth 演示](https://youtu.be/lFRCukfn3cg)。Studio SD/HD 均处理完成，退出登录无痕窗口已实际播放并确认 Unlisted。869 字符权限理由及该视频链接已保存到 Google Data access，UI 回读“已保存数据访问权限更改”；最终敏感权限审核请求已提交并正在审核，尚未获批。

最终提交前，Studio 的 SD/HD 均已处理完成。退出登录的 Chrome 无痕窗口显示 Sign in、Unlisted 标记及正确视频，实际播放到 0:02 后于 0:09 / 8:36 暂停，画面显示录制的网站；[视频](https://youtu.be/lFRCukfn3cg) 无需申请权限即可播放。约 2026-10-19 02:58 UTC（当地 2026-10-18 19:58 PDT），已确认 Prepare 表单，问卷中个人用途、内部用途、开发/测试专用、WordPress 四项均选择 No，确认阅读指南及有条件适用的 CASA 提示后点击 **Submit for verification**；本项目没有受限范围，不据此声称需要或通过 CASA。已提交 869 字符用途理由、视频链接及 966 字符审核补充说明，后者请 Google 提供审核邮箱以配置免费额度，不共享个人 Google 密码。最终 Verification Center 明确显示 **“您的应用的数据访问权限正在审核中。”** 并提供查看审核进度按钮；品牌仍为已验证并发布。此结果为 **已提交、审核中，尚未获批**。Google 审核员具体邮箱仍待其提供，不能声称已给审核员开通额度。

私享列表 `PLA73ZS4HfS3c` 读取 1 个 `Me at the zoo` 条目；本轮 Excel 为 2,972 bytes，Quick Look 已核对标题、`jawed`、链接和时长。当地 18:51 的 Check now 成功，Total runs 为 2。补录还在 YouTube 原生界面显示该列表为“私享”、1 个视频，历史测试列表名称仍为 `Playlist Backup OAuth Review`。

用户已明确允许添加测试素材；在 YouTube 原生页面手动点赞 **Beethoven - Für Elise**（Rousseau，`wfF0zHeU3Zs`）并订阅 Rousseau。网站没有写入 YouTube，仍仅申请 `youtube.readonly`。补录中 Liked videos 于当地 19:33、Liked music 和 YouTube subscriptions 于 19:34 完成第 3 次检查，Latest version 均为 1 条：前两类显示该音乐视频，订阅显示 Rousseau。三类初次读取为空的情况已由这些真实非空读取补充；当前单一音乐样本不证明非音乐条目排除的对照测试。

用户明确批准后，约 `2026-10-19 02:38 UTC` 已执行 **Disconnect and delete backups**，删除本轮 Private playlist、Liked videos、Liked music 和 YouTube subscriptions 四条测试备份。重新加载页面后显示 **No YouTube accounts connected yet**、**1/10** 个收藏、**70** 个保存条目，仅余原有公开频道收藏。原始 YouTube 列表、点赞及订阅仍保留。补录约 425–609 秒被 Codex 前台遮挡，不能作为可用的断开或清理结果录像；上述清理结论来自现场 UI 回读，最终视频不宣称展示该操作。本轮没有新增生产 D1 聚合检查，也未独立确认 Google 侧撤销结果；不能将上一轮数据库计数或应用 UI 清理作为本轮 Google revoke 成功的证据。

## 先前观察的真实流程（历史）

历史旧品牌重新授权已成功：英文 Google consent screen 显示 `Playlist Backup`，已有 1 项服务权限为 `View YouTube account`；点击 Continue 后返回 `/settings/collections?youtube=connected`，页面回读 `YouTube account connected` 和 `Stepan Connected`。本次复用已有 YouTube 只读权限，未新增范围；不是首次新增授权的录屏证据。当时尚未录制视频；本轮主录屏与补录后来均已保存并确认，见上方。旧轮私有读取、Excel 导出和应用内断开清理记录保留，外部 Google 撤销和账号删除仍未验收。
用户提供的 `WL`（Watch Later）不支持。已在 YouTube 原生 UI 确认演示账号 `stepan101dev@gmail.com`，并按用户授权创建私享播放列表 `Playlist Backup OAuth Review`，加入 1 个公开视频 `Me at the zoo`（`jNQXAC9IVRw`）；UI 回读 Private、1 video。测试列表为 <https://www.youtube.com/playlist?list=PLA73ZS4HfS3c>。网站已成功创建 Private playlist 备份，首次读取保存成功；Latest version 1 显示 `Me at the zoo`、`jawed`、`0:19` 和 `jNQXAC9IVRw` 链接。Excel 文件已下载并核对内部 XML 的视频 ID、标题和频道。随后用户批准并执行断开连接及删除两个关联私有备份，应用页面与生产聚合计数确认清理；上一轮断开后曾显示无 YouTube 连接、`1/10`，仅保留含 70 条目的公开频道收藏；本轮曾重新连接并新建 4 个测试备份，现已按用户批准完成断开和删除；当前 UI 为无连接、1/10 个收藏、70 个保存条目。详见 [真实读取、导出与应用内断开记录](readiness.md#真实读取导出与应用内断开记录)。不要对用户原有播放列表做未授权更改。

首次录屏工具失败为历史：Screenshot app 曾报 `NSPOSIXError 162`，QuickTime / Cmd-Shift-5 当时未显示面板。本轮主录屏与补录均已保存；四类备份均已真实读取非空结果，随后按用户批准断开并删除。删除时的录屏被 Codex 前台遮挡，不能作为可用清理画面。本轮实际导出的是 Excel，并已通过 Quick Look 核对；后文 CSV 是可选脚本步骤，不代表本轮已导出 CSV。旧轮 60 秒限频记录保留，本轮 Check now 已成功，Total runs 为 2。

当前线上自动扫描未启用，UI 明确显示手动检查。录制应采用后文 scheduler unavailable 分支，
除非之后已明确启用并取得真实运行证据；后台隐私维护 Cron 不代表收藏自动扫描。

## Before recording

以下是可复现或补拍时的准备建议，不是本轮已完成事实清单。本轮实际样本为一个私享视频、一个 Music 点赞视频和一个频道订阅；没有非音乐对照样本。

1. 使用独立浏览器配置和专门的演示 Google 账号，账号需已有 YouTube channel。浏览器、
   应用和 Google 授权页均设为英文。提前登录 Google，避免录入或显示密码、验证码、恢复码。
   录制开始时让网站处于退出状态，以便展示普通网站登录。
2. 在演示账号中事先准备少量无敏感内容的真实样本：一个 **Private** 播放列表，含 2–3 个
   可访问的视频；至少一个已点赞的 Music 分类视频和一个已点赞的非 Music 视频；
   2–3 个频道订阅。样本的标题、频道和操作均应是演示者可公开展示的，不使用客户真实资料。
   这是实际 YouTube API 读取的样本，不是在网站里伪造的返回值。
3. 事先确认 Music 样本的 YouTube `categoryId` 为 `10`。`Liked music` 是已点赞视频的
   Music 分类筛选，**不是完整 YouTube Music 资料库或官方 Liked Music 列表**。
4. 准备有实际 Collections 权限的专用网站账号。普通免费账号当前没有收藏名额；已批准的
   10 个收藏限时审核访问已上线，指定演示账号此前已回读 `2/10`、保留的 Lite 计划和到期时间，断开清理后为 `1/10`。完成实际功能测试后再正式录制，
   不要求审核员付款或使用管理员权限。四类来源同时保存需要四个空闲名额；若实际只提供
   两个名额，下文也有顺序创建/删除路线。
5. 控制台已为 External / In production，不再依赖 Testing 白名单；`Playlist Expoter` 与原版 E 图标已同步、通过品牌验证并发布。
   录制中如出现未验证敏感权限警告，应保留真实流程，不剪改成已通过敏感权限验证。
6. 检查首页、隐私政策、条款及 Collections 使用同一真实域名和品牌。确认生产授权页申请的
   YouTube 权限是 `https://www.googleapis.com/auth/youtube.readonly`。网站 Google 登录
   所用的身份权限单独核对；不要把这两个授权流程混为一谈。
7. 关闭通知、密码管理器弹窗和无关标签页。录制保留地址栏、真实应用名称和全部权限文字；
   放大文字但不要裁掉关键页面。client ID 可以展示，client secret、access/refresh token、
   session cookie、授权回调 `code` 不能展示。不要打开 token 响应或保存 OAuth 网络日志。
8. 确认现有隐私文案与实际结果一致，并完成下文各独立生命周期用例。若只做内部试录，
   标注尚未验收的场景；正式视频不得用未来功能或没有证据的删除承诺填补这些场景。

## Shortest complete feature route

不需要逐个下载三种格式，也不必录音。下列路线覆盖当前四种授权来源；英文字幕或页面说明
可直接采用后面的英文稿。Google 授权步骤须完整、真实、可读，不能为缩短时长跳过。

1. 首页及政策入口 → 普通 Google 网站登录 → Collections 中未连接的 YouTube accounts。
2. Connect account → 英文 Google 授权页，展示应用名、完整权限、地址栏 client ID → 返回 Connected。
3. 创建一个专用 Private playlist 收藏，展示真实非空快照，导出 CSV 并打开核对。
4. 依次创建 Liked videos、Liked music、YouTube subscriptions，分别展示非空结果和 Music 筛选说明。
   只有两个名额时始终保留 Private playlist；展示后删除 Liked videos，再创建/删除 Liked music，
   最后创建 subscriptions。这样也展示了应用内删除收藏，不会要求额外购买更多名额。
5. 在保留的私有播放列表上执行 Check now 并展示成功记录；调度仅在实际启用且有后台扫描
   证据时追加，邮件仅在真实配置并验证投递后追加。
6. 删除 subscriptions 收藏后，展示 Disconnect 确认框及执行结果。账号删除和 Google 设置
   侧撤销分别使用重新连接、新建测试收藏后的独立用例，避免先删光数据再声称验证其清理。

账号删除、外部撤销、过期清理和重试的详细验收记录可以单独保存；视频展示与说明只能引用
已观察的结果。维护 Cron 成功且没有待处理项目不代表这些真实用户用例已经通过。

## Main recording sequence

建议约 7–10 分钟，时长不是 Google 的硬性要求。以下时间仅用于录制节奏；上传后用实际
时间替换，作为审核员索引。本轮首授权 Continue/回调有前台录制缺口，后续现有 grant 复查须独立标明；不得以剪辑制造完整连续首授权。

### 00:00–00:35 — Public purpose and policies

中文操作：打开首页，再打开 `/youtube-playlist-backup`；展示这是播放列表元数据备份和导出
工具。展示可公开访问的 `/privacy-policy`、`/terms-of-service` 及隐私政策中 Google/YouTube
数据说明。不要展示 `/demo` 作为功能完成的证据；该页面使用 sample data。

English on-screen text or optional narration:

> This is Playlist Expoter at exportyoutubeplaylist.com. Its Playlist
> Backup feature saves metadata from sources selected by the user, shows saved
> snapshots, and exports those records. Here are our public privacy policy and
> terms. The feature does not download video or audio files or restore videos
> removed from YouTube.

验收：品牌与提交材料一致；页面真实可访问，隐私文案已按最终实现修正。

### 00:35–01:20 — Ordinary website sign-in

中文操作：进入 `/sign-in`，点击 Google 登录按钮，完整展示真实 Google 网站登录流程，
返回网站。只使用该专用演示账号。不要剪掉账号选择或出现的 consent screen；核对实际
身份权限。随后打开 `/settings/collections`，展示 `YouTube accounts` 尚未连接。
若生产还启用了 Google One Tap，另补录这一实际启用的 Google 登录入口，并说明其返回
同一个网站登录状态；若未启用，不要模拟 One Tap。

English on-screen text or optional narration:

> First, I sign in to the website with Google. This establishes my website
> account. Connecting YouTube is a separate action. I am now signed in, and the
> YouTube accounts section shows that I have not connected a YouTube channel yet.

验收：证明用户登录网站不等于已允许读取其 YouTube 内容。若录制账号已连接，录制前按
已验收的撤销流程清理这个专用账号，重新开始；不要删改页面 DOM 来制造未连接状态。

### 01:20–02:20 — Separate YouTube permission grant

中文操作：在 `/settings/collections` 的 `YouTube accounts` 区域先展示已上线的离线/后台访问说明，
再点击 `Connect account`。中英文 Connect 面板均已明确该用途；录制采用英文。
在真实 Google 授权页选择演示账号及相应频道，语言切换至 English。展示完整应用名称、
权限描述和链接。展开所有权限详情，核对并明确展示 YouTube 只读权限；不要照读脚本中
臆测的 Google 按钮或权限文案，以实际页面为准。

在 Google 授权请求页的真实地址栏聚焦或横向滚动，令 `client_id=...apps.googleusercontent.com`
清晰可读。保持 `accounts.google.com` 可辨认；可以放大真实屏幕，不能另造地址栏截图。
展示实际授权请求包含 `scope=https://www.googleapis.com/auth/youtube.readonly`，并与
Data Access 提交项核对。不要停留在带授权 `code` 的回调地址。

English on-screen text or optional narration:

> The connection panel explains offline access. The server can renew the same
> read-only authorization when I return for another manual check; automatic
> collection checks are currently disabled. I choose Connect
> account to grant separate access to YouTube. This is the real
> Google consent screen for the application in this submission. The browser
> address bar shows its OAuth client ID. The YouTube permission requested is
> youtube.readonly. It lets the app read the connected user's selected private
> playlist metadata, liked videos, and subscribed channels. I review the
> permission and grant access. The application does not request permission to
> edit playlists, change likes or subscriptions, upload videos, or delete videos.

中文操作：点击实际同意按钮，返回 `/settings/collections`，显示频道名称和 `Connected`。

English on-screen text or optional narration:

> Google has returned me to the website, and this channel is now Connected. I
> can select it when creating a collection that needs authorized YouTube access.

验收：姓名、品牌、client ID、权限和实际提交一致，授权成功，未出现测试用户被拒绝。

### 02:20–03:20 — Private playlist

中文操作：先在 YouTube 中简短展示专用样本播放列表为 **Private**，复制其链接；回到网站
点击 `Add collection`，`Source` 选择 `Private playlist`，在 `Select YouTube account`
选择刚连接的频道，粘贴链接后创建。保持通知选项关闭，除非这次确实准备展示已配置的邮件。
成功读取后打开 collection，展示 `Latest snapshot` 中的真实样本标题、频道、链接和时长。
如果首次同步失败，先修复再重录，不要用旧的公开列表截图替换结果。

English on-screen text or optional narration:

> This demonstration playlist is private and belongs to the connected test
> account. I select Private playlist, choose the connected channel, and paste
> its link. The app reads the available video metadata using the granted
> read-only access and saves a snapshot for my website account. Public API
> access alone cannot read this private playlist. The original playlist is
> unchanged.

### 03:20–04:00 — Liked videos

中文操作：新建 collection，`Source` 选择 `Liked videos`，选择同一个已连接账号；该类型
不需要粘贴 URL。打开结果，展示预先准备的音乐与非音乐样本。可短暂切换至该专用账号的
YouTube 点赞列表帮助核对，避免暴露个人账号历史。

English on-screen text or optional narration:

> For Liked videos, I select the connected channel without entering a playlist
> URL. The app reads videos liked by this user and saves their available
> metadata. This snapshot contains both our music and non-music demonstration
> videos. The app does not add or remove any likes.

两个名额路线：展示后删除这条 Liked videos 测试收藏，保留私有播放列表，腾出名额给下一场景。

### 04:00–04:35 — Liked music, with its exact limitation

中文操作：新建 `Liked music` collection，选择同一账号。停留展示 UI 的说明：只备份
YouTube 分类为 Music 的已点赞视频。打开结果并与上一场景比较：音乐样本保留，非音乐
样本不出现。每次扫描当前最多支持 500 个来源条目，勿用大于该规模的账号演示完整性。

English on-screen text or optional narration:

> Liked music uses the same read-only permission. It filters the user's liked
> YouTube videos to those categorized as Music. This is why the non-music
> demonstration video is absent here. This feature does not represent the
> user's entire YouTube Music library or guarantee the same contents as YouTube
> Music's Liked Music collection.

两个名额路线：展示后删除这条 Liked music 测试收藏，再创建 subscriptions。

### 04:35–05:10 — Subscriptions

中文操作：新建 `YouTube subscriptions` collection，选择账号，展示 2–3 个已订阅频道。
该类型也不需要 URL。结果必须包含真实样本频道，不要以空结果替代有数据的功能演示。

English on-screen text or optional narration:

> YouTube subscriptions reads the channels this user subscribes to. The saved
> records contain channel metadata and links. They are channel records, not
> downloaded videos from those channels. The app does not subscribe or
> unsubscribe the user from any channel.

### 05:10–05:50 — Browser export

中文操作：打开刚保存的私有播放列表 collection，点击 `Export`，展示可选版本与
`File format` 中的 Excel、CSV、JSON。下载 CSV 并打开文件，核对样本标题、频道、URL、
时长、Video ID。再打开 subscriptions 的导出预览或实际文件，说明记录使用 Channel URL
和 Channel ID。不要声称写入 Google Sheets；当前功能是浏览器生成本地文件。

English on-screen text or optional narration:

> I select the saved snapshot and export it as CSV. Excel and JSON are also
> available. The file is generated in the browser from the saved records. It
> contains metadata only. Subscription exports contain channel records. These
> downloads do not request Google Drive or Google Sheets access.

### 05:50–06:35 — Manual refresh and conditional scheduled checks

中文操作：返回 collection 点击 `Check now`，等候成功后展示 `Last backup` 更新和
`Version history`。若短时间重复检查出现限流，等待后再录，不要绕过限流。
`Refresh saved data` 只重新加载已保存数据，不能代替一次新的 YouTube 检查。

English on-screen text or optional narration:

> Check now reads the selected source again and saves another snapshot. The
> version history shows when each successful check completed. Refresh saved
> data reloads the existing records; it is different from checking YouTube again.

调度为条件场景：源码支持 Daily、Weekly、Every 2 weeks、Monthly，频率和变化通知偏好
即使服务未启用也能显示和保存，界面另有能力提示。录制前核对当前线上 capabilities 和实际执行，
不得仅凭下拉选项声称自动检查已运行。2026-10-18 13:35 UTC 的维护 Cron 成功，但授权核验/
撤销没有待处理项目；这条记录也不能替代一次真实 collection 后台扫描。

- 生产调度仍关闭：如实显示 `Automatic checks are not activated yet` / `Manual checks available`，
  使用下方旁白 A。不要展示或声称后台成功刷新、发信。
- 生产调度已启用并完成真实验收：展示频率、`Next check` 和一次实际后台完成后的快照，
  使用旁白 B。长时间等待可分段并标注真实时间；不修改生产时间戳冒充自然调度。
  邮件演示只有在发信已配置、专用收件人已验证且明确勾选通知后才追加。

English text or optional narration A — scheduler unavailable:

> In this deployment, automatic checks are not activated. I can run manual
> checks with Check now. I am not demonstrating a scheduled run or email
> delivery in this video.

English text or optional narration B — only after a verified scheduled run:

> This collection is set to the frequency shown here. The application uses
> offline authorization to refresh access and check this selected source while
> I am away. Here is a completed scheduled check with its recorded timestamp.
> The refresh credential is kept on the server; it is not included in exports.

## Lifecycle scenes — in-app disconnect observed; cleanup footage unusable; other cases pending

Google 撤销与重试、关联收藏和邮件清理、账号删除 hook、30 天元数据清理及私密页面脚本隔离
已经部署。双语政策已回读，私密响应头已检查，已登录首页的 Cloudflare beacon 被 CSP 阻止；
历史旧轮应用内断开有页面和生产聚合证据。本轮四条备份清理有重载后的 UI 回读，但没有新增 D1 聚合；录屏被 Codex 遮挡，不能声称视频展示了该清理。历史 Google 权限页搜索
Playlist Backup 无结果，但该页邮箱未独立核对，不能据此宣称完成 Google 侧强验证。
完整记录见 [生产验收](readiness.md#真实读取导出与应用内断开记录)；外部 Google 撤销、账号删除、
生产过期清理及撤销重试仍须分别验收，再录制或引用相应结果。

### Disconnect and revoke access

1. 在专用演示账号的 YouTube accounts 选择一个真实连接，打开 Disconnect 确认框。展示频道身份、关联私有备份不可恢复，以及共享 Google grant 可能影响其他连接的说明。
2. 确认后展示连接与相关收藏消失。用匿名化验收计数确认活动数据库中关联快照、missing 和待发邮件已删除，并确认 Google revoke 请求成功；UI 本身不证明 Google 已完成撤销。
3. 展示 Google Account 权限管理入口。若 Google 请求失败，真实描述加密重试队列，不能声称 revoke 已成功。不要为了录制故意中断生产网络。
4. 验证旧 collection 不再能读或继续扫描，重新连接不会恢复已删除快照。

验收成功后可采用以下英文屏幕说明或可选旁白：

> Disconnecting removes this connection and its associated private backups and queued notifications from the application's active database. The application requests revocation from Google. If that request temporarily fails, it retries using a separate encrypted credential for up to seven days. This does not delete the original content on YouTube. A shared Google grant may affect other connected features.

### Separate collection removal, external revocation and account deletion cases

1. **删除收藏**：在 Disconnect 前删除一条专用测试收藏，展示它从列表移除，并用匿名化记录验证对应活动数据和邮件队列已删除。下文断开操作会清除其余关联私有收藏，不能在断开后直接复用同一条已删除收藏测试。
2. **Google 侧撤销**：重新连接并新建一个非空测试收藏，再到 Google 权限页面撤销该测试 grant，观察后台授权核验和数据清理。提供实际时间戳；不能把刷新 token 成功当作重新读取了全部快照。
3. **删除账号**：另用可销毁、无真实收费订阅的网站测试账号，先连接并创建非空测试收藏，再在 Settings → Profile 展示删除说明并执行删除。不要删除生产管理员账号。
4. 验证该账号的登录会话、连接、收藏及 outbox 清理；撤销队列可在账号删除后完成重试。检查并发回调、扫描不会恢复已删除内容。不要把无连接、无收藏的空账号删除当成这些关联数据已清理的证据。
5. 明确区分活动应用数据库与用户下载、已投递邮件、平台日志和恢复副本；30 天过期清理的证据另行记录，不伪造生产时间戳。

验收成功后可采用以下英文屏幕说明或可选旁白：

> Removing a collection deletes its saved metadata and queued notification data. Deleting the website account also removes its collections and connections and requests Google revocation. Files already downloaded and messages already delivered remain under the user's control. Historical API metadata expires within the policy's 30-day limit, including paused collections.

## Reviewer reproducibility and handoff

审核访问说明可按下列英文模板填写；只在实际安排完成后替换方括号。密码、一次性码、
client secret、token 不得提交到仓库或出现在视频描述中。必要的专用网站测试凭证通过
Google 审核的指定保密渠道提供，不共享个人 Google 账号密码。

> Start at https://exportyoutubeplaylist.com/sign-in. [REVIEWER_ACCESS_METHOD]
> Open https://exportyoutubeplaylist.com/settings/collections and choose Connect
> account under YouTube accounts. Use a Google account with a YouTube channel
> and grant the YouTube read-only permission shown in the consent screen.
> Prepare a private playlist containing a few accessible videos, like a Music
> video and a non-Music video, and subscribe to two demonstration channels.
> Add separate Private playlist, Liked videos, Liked music, and YouTube
> subscriptions collections using that connected channel. Open their saved
> snapshots and use Export to download CSV, Excel, or JSON. The sources should
> contain fewer than 500 items. Watch Later is not supported.
> [VERIFIED_FEATURE_ACCESS] If two collection slots are provided, keep the private
> playlist and remove each other test collection before creating the next source.
> Remove a collection before disconnecting its YouTube account. External revocation
> and website account deletion use separate fresh test connections and collections.
> [VERIFIED_SCHEDULER_AND_DELETION_STEPS]
> Contact support@exportyoutubeplaylist.com if access is blocked.

成片与提交核验记录（未勾选项仍不代表已经验收）：

- [ ] 所有占位符已填写，视频展示的部署版本与提交时线上版本一致。
- [x] Playlist Expoter 与原版 E 图标已部署、验证并发布；真实英文 consent screen 已观察并录制。
- [x] 最终视频按独立流程展示真实英文普通登录、新 YouTube 只读请求及现有 grant 复查；首授权 Continue/回调未连续捕获，未剪成连续首次授权。
- [x] 退出登录的 Chrome 无痕窗口无需申请观看权限，已实际播放 Unlisted 视频至 0:09 / 8:36。
- [ ] 普通 Google 登录、启用的其他 Google 登录入口、独立 YouTube 连接流程均已展示。
- [x] 成片中的真实英文授权页显示完整 Client ID 和 View your YouTube account 详情；本地 QA 已确认完整 ID 可读。
- [ ] 所有请求权限与 Google Auth Platform 的提交清单逐项一致。
- [x] 四类来源均已实际读取非空结果：私享 1 条，点赞、音乐和订阅各 1 条；后三类第 3 次检查成功。
- [x] 用户批准后在 YouTube 页面手动添加音乐点赞与订阅样本；网站仍只读。当前单一音乐样本不证明非音乐排除对照。
- [ ] 最终回放核对 Music 筛选限制与 500 条扫描上限未被隐去。
- [ ] 导出文件与同一 collection 的保存数据一致，未声称下载音视频或写入 Google Sheets。
- [ ] 调度状态有线上证据；无真实证据时没有说明或演示调度、发信成功。
- [x] 旧轮真实私有读取、Excel 导出与断开清理已有记录；本轮 UI 中的私有读取、Excel 展示与 Check now 已操作成功。
- [x] 主录屏及补录已确认保存并核对媒体参数。
- [x] 最终 8:36 视频通过本地 QA：章节边界与新转场无无关窗口，完整 Client ID 可读，完整 ffmpeg 解码通过。现有 grant 复查独立标明。
- [x] 用户在操作时确认 YouTube 条款和 Unlisted 上传；已取得 https://youtu.be/lFRCukfn3cg，此链接、869 字符权限理由及 966 字符审核说明已最终提交；Google 状态为审核中，尚未获批。
- [x] 用户批准的四条测试备份已断开删除，重载 UI 为无连接、1/10、70 条目；清理画面未有效录到，不能作为成片场景。
- [ ] 外部 Google 撤销、账号删除、生产过期清理等独立用例已验收，最终视频和隐私政策只引用已观察结果。
- [ ] 视频不含个人历史数据、密码、密钥、token、session、回调 code 或无关用户数据。
- [ ] 时间索引、可用审核访问方法和联系邮箱填写完整；没有要求审核员自行付款。

## Source evidence

Paths are relative to the repository root; inspect the deployed version again
before recording.

| Behaviour                                                         | Source                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Separate connection screen                                        | `src/components/playlist-guard/youtube-accounts.tsx`, `src/hooks/use-youtube-connections.ts`         |
| YouTube read-only, offline grant, consent prompt                  | `src/lib/youtube-connections/google.ts`, `src/lib/youtube-connections/types.ts`                      |
| Private playlist, likes, Music filter and subscriptions reads     | `src/lib/youtube-connections/scan.ts`                                                                |
| Source choices, account selection, conditional URL and schedule   | `src/components/playlist-guard/create-dialog.tsx`                                                    |
| Browser file generation and exported fields                       | `src/lib/playlist-guard/export.ts`, `src/components/playlist-guard/export-dialog.tsx`                |
| Scan and snapshot limits / plan slots                             | `src/config/guard-plans.ts`                                                                          |
| Connection deletion and Google revocation with bounded retries    | `src/modules/youtube-connections/service.ts`, `src/core/youtube-lifecycle/service.ts`                |
| Collection deletion and retention                                 | `src/modules/playlist-guard/service.ts`, `src/lib/playlist-guard/retention.ts`                       |
| Account-deletion UI and auth configuration                        | `src/routes/settings/-settings-form.tsx`, `src/core/auth/index.ts`                                   |
| Deployment and maintenance evidence; actual source scans separate | `docs/google-oauth-verification/readiness.md`, `docs/google-oauth-verification/console-checklist.md` |
| UI labels and current lifecycle wording                           | `messages/en.json`                                                                                   |
