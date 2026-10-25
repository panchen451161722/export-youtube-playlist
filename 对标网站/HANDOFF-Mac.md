# Mac 接手德语竞品调研

交接日期：2026-10-25。目标：在 Mac 上使用 Chrome 和 AITDK 实际检查竞品，按下方 12 个字段重写竞品记录，服务于德国市场的 YouTube 播放列表数据导出页面。

用户认为当前资料不够好，明确要求亲自查看 Chrome 和 AITDK。现有文件是初步资料，不能直接作为已经完成浏览器核验的最终结果。

## 在 Mac 开始

1. 在 Mac 同步 GitHub 仓库 `panchen451161722/export-youtube-playlist` 的 `main` 分支；已有本地修改时先保留，不覆盖。
2. 打开本文件和 [资料索引](./README.md)，了解已有记录及数据口径。
3. 在 Chrome 打开下面的 TuneMyMusic 德语导出页，确保 AITDK 可用；若尚未安装，由用户完成安装。使用当前平台提供的浏览器或 Computer Use 工具，并先阅读对应技能。
4. 先完成 TuneMyMusic 的实时采集和 12 字段表，再检查 MyFreshTools。遇到工具错误时记录准确错误，不把网页抓取结果冒充 AITDK 实测。

## 目标页面

| 网站 | 页面 | 本轮重点 |
| --- | --- | --- |
| TuneMyMusic | https://www.tunemymusic.com/de/transfer/youtube-to-file | 优先检查的德语文件导出页 |
| TuneMyMusic | https://www.tunemymusic.com/de | 辅助了解德语首页与跨平台迁移定位 |
| TuneMyMusic | https://www.tunemymusic.com/plans | 核对付费方式、周期、币种与适用功能 |
| MyFreshTools | https://www.myfreshtools.com/ | 工具集合、内容结构、商业模式 |
| MyFreshTools | https://www.myfreshtools.com/youtube/playlistExport | 必须在浏览器核对的实际导出工具页 |
| MyFreshTools | https://www.myfreshtools.com/pricing | 核对套餐及免费限制 |

MyFreshTools 现有资料来自英文页面。没有找到并实际验证德语版本前，保留为英文功能对标，不称作德国本土竞品。

## Chrome 和 AITDK 采集步骤

1. 记录实际完整 URL、采集日期和页面语言，确认页面已加载，AITDK 已刷新到当前页。
2. 在 Overview 读取真实 Title、Description 和页面语言等信息；区分页面元信息与搜索引擎改写的标题。
3. 在 Headings 记录 H1、H2、H3 层级，确认工具页是否有独立标题与内容。
4. 在 Density 分别查看 1 word、2 words、3 words；必要时查看 4/5 words 还原完整短语。保存每组的 Keyword、Found in、Count、Density，以及工具显示的页面总词数。
5. 优先使用扩展的复制或导出功能获取文本；如工具只能截图，保留截图对应的词组长度、URL 和日期。不要把不完整截图称作完整导出。
6. 查看正文及页脚，区分功能表达、品牌、按钮、导航、相关推荐和英文残留。高频相关词字段保留有用词组及实际次数，原始表单独留档。
7. 实际查看首屏、输入方式、格式、步骤、结果样例、FAQ、价格、免费限制和相关链接。账号授权、付费或其他敏感操作按平台规则交给用户确认，不为调研购买服务。
8. 观察德语表达、du/Sie 是否统一、视觉和截图是否本地化、案例、币种和计费周期；不能从 /de 路径推断运营国或只服务德国。
9. 将原始观察、关键词候选和优化建议分开表述。没有测量的流量、排名、搜索量、转化率不得补成事实。

## 用户要求的最终结构

每个重点页面使用同样的三列表格。TuneMyMusic 的德语导出页是本轮第一张完整记录；MyFreshTools 首页与工具页的 Title/H1 要分别记录，不能混用。

| 字段 | 记录说明 | 实际采集值 |
| --- | --- | --- |
| 国家与语言 | 目标地区及页面语言，例如 de-DE；区分目标市场与运营所在地 | 待填写 |
| 关键词 | 当地语言原词；标明页面表达或待验证候选 | 待填写 |
| 中文含义 | 关键词对应的中文解释 | 待填写 |
| 搜索意图 | 工具、教程、比较或购买；未查 SERP 时标为初判 | 待填写 |
| 竞品网站 | 域名与具体页面地址 | 待填写 |
| 页面类型 | 首页、工具页、博客页等 | 待填写 |
| Title 与 H1 | 从 AITDK 实际读取，分别记录 | 待填写 |
| 高频相关词 | 从当前页面提取，保留次数、密度、词组长度 | 待填写 |
| 页面模块 | 实际模块及先后顺序，如功能、步骤、案例、FAQ | 待填写 |
| 本地化特点 | 表达、视觉、案例、价格及英文残留 | 待填写 |
| 可参考之处 | 能用于本产品的具体内容或做法 | 待填写 |
| 不足与机会 | 基于观察提出改进建议，注明所需产品能力 | 待填写 |

## 数据口径与关键词线索

- AITDK Density 分析当前页面，不代表整个 /de 目录或整个站；包含的导航和页脚可能产生无关高频词。
- Count 是出现次数，Density 是页面占比；1/2/3 words 上的数量是对应词组列表条数，不是搜索量。
- 已有 [AITDK 原始记录](./TuneMyMusic-AITDK.md) 是用户粘贴的 70 条三词短语，不是 Windows 端工具实时采集。保留来源，不覆盖成“Mac 实测”；新采集结果另建文件并标明时间和词组长度。
- 用户之前的截图中，AITDK 总词数为 424；五词短语页显示 37 条。这是历史截图快照，新数据可以不同。
- 候选线索包括 `youtube playlist exportieren`、`youtube wiedergabeliste exportieren`、`youtube playlist als csv exportieren`。未验证其德国搜索量或排名。
- 区分播放列表数据导出、音视频下载、跨平台音乐迁移。不能把 downloader 的需求直接算作 CSV 导出需求。
- 若继续 Semrush，选 Germany 数据库；月搜索量读 Volume，不能读左侧 Topics/Groups 的条数。工具无数据不等于零搜索。
- 本轮先完成文章 Step 6 的竞品资料库。不要未经要求直接改网站、开发德语页或发布内容。

## 现有文件和交付要求

| 文件 | 状态与后续动作 |
| --- | --- |
| [README](./README.md) | 总览；增加新采集资料入口并更新核验状态 |
| [TuneMyMusic](./TuneMyMusic.md) | 初步网页资料；按实时观察重写为上述 12 字段三列表格 |
| [MyFreshTools](./MyFreshTools.md) | 初步首页资料；补齐浏览器实际工具页，按同样结构重写 |
| [TuneMyMusic AITDK](./TuneMyMusic-AITDK.md) | 用户提供的历史原始表；保留其来源和 70 条数据 |
| [德语关键词验证表](./德语关键词验证表.md) | 候选词；有真实数据后再填搜索量、KD 和排名 |

所有新增文件保存在仓库根目录的 `对标网站/`。最终应能从索引进入每个竞品记录及对应原始数据；每张表应带采集日期、页面 URL 和来源范围。

## Windows 端停止原因

窗口枚举成功，能看到目标页标题；读取窗口状态时重复收到：

```text
Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy. Stop your work and send a final message noting why Computer Use ended.
```

最后一次还先报告窗口最小化；恢复后仍出现上述网址识别错误。因此 Windows 端没有完成实时 AITDK 采集。底层原因未确认，不推断为 AITDK 故障、权限未授予或版本更新导致。Mac 接手应使用本机的新窗口与会话，不能复用 Windows 的句柄。

## 仓库验证与提交

本次变更范围为调研文档。Windows 端曾尝试 `pnpm build`，项目没有 `node_modules`，依赖下载出现网络超时后已停止，构建没有通过。不要将此前的尝试写成构建成功，也无需仅为查 AITDK 启动网站服务。

若后续需要提交更新，遵守仓库 AGENTS.md：每次 git commit 前运行 `.agents/skills/security-scan/SKILL.md` 的扫描和人工审查。用户已要求将本次资料与交接文档提交 GitHub；Mac 上后续新增成果的提交按用户当时授权执行。

## 可以直接交给 Mac 的任务

> 请先阅读 `对标网站/HANDOFF-Mac.md`。使用 Mac 的 Chrome 和 AITDK，先实际检查 TuneMyMusic 德语 YouTube 文件导出页，再检查 MyFreshTools 首页与导出工具页。采集 Overview、Headings 和 Density 的 1/2/3 words 数据，观察页面结构与本地化特点。按交接文档中的 12 字段三列表格重写两份竞品记录，将原始数据和观察结果保存在 `对标网站/`，保留历史数据来源，并更新 README。关键词密度与月搜索量分开记录，不编造排名或流量，不修改产品代码。
