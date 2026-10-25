# 德语三页面 SEO Brief

日期：2026-10-25。范围由用户确认：主页、CSV 导出页、Excel 导出页。沿用现有英文 slug，加 `/de` 前缀；其他页面不做德语内容。无需生成图片。

## 证据与关键词状态

本 Brief 基于本目录的 TuneMyMusic、MyFreshTools 竞品页面观察，以及当前仓库的实际导出能力。竞品证据见 [研究索引](README.md) 和 [德语关键词验证表](德语关键词验证表.md)。用户提供了 CSV、Excel 两页的 Plausible 筛选链接，作为页面范围依据；本轮没有读取流量数字，也不据此宣称页面流量或排名。

**下列关键词是工作假设，不代表已验证搜索量、KD 或德国 SERP 排名。** 不填写虚构指标，不以关键词密度作为排名目标。发布后按 Search Console 中德国地区、具体 URL、实际查询词验证；避免三个页面竞争同一主要意图。

| 页面                                         | 主关键词                              | 辅助词 / 自然表达                                                                | 搜索意图与页面任务                                             |
| -------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/de`                                        | youtube playlist exportieren          | YouTube-Wiedergabeliste exportieren; Playlist als Datei; CSV, Excel, JSON        | 选择合适格式并完成元数据导出；介绍用途、限制、格式差异         |
| `/de/tools/export-youtube-playlist-to-csv`   | youtube playlist als csv exportieren  | YouTube Playlist CSV; CSV für Excel; Google Tabellen; Playlist-Liste exportieren | 下载 CSV 并正确导入；解释 UTF-8、逗号分隔、德语 Excel 单列问题 |
| `/de/tools/export-youtube-playlist-to-excel` | youtube playlist in excel exportieren | YouTube Playlist Excel; Playlist als XLSX; Wiedergabeliste in Excel              | 下载原生工作簿，使用数字字段筛选、排序、规划学习时长           |

排除意图：MP3/MP4 下载、离线视频、音乐平台间迁移、恢复已删除视频。不以这些词招揽不匹配的访问。

## TDK 与标题

Keywords 作为编辑选词记录，不添加已不用于 Google 排名的 `meta keywords`。

| 页面  | Title                                              | Description                                                                                                                                              | H1                                                    |
| ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 主页  | YouTube-Playlist exportieren – CSV, Excel & mehr   | Exportiere deine YouTube-Playlist als CSV, Excel oder JSON. Bis zu 500 Einträge kostenlos und ohne Anmeldung. Videotitel, Links und Metadaten als Datei. | YouTube-Playlist als CSV, Excel oder JSON exportieren |
| CSV   | YouTube-Playlist als CSV exportieren – kostenlos   | Exportiere deine YouTube-Playlist als CSV: Titel, Links und Metadaten für Excel oder Google Tabellen. Bis zu 500 Einträge kostenlos, ohne Anmeldung.     | YouTube-Playlist als CSV exportieren                  |
| Excel | YouTube-Playlist als Excel exportieren – kostenlos | Lade deine YouTube-Playlist als echte Excel-Datei (XLSX) herunter. Titel, Links, Laufzeiten und Kennzahlen – bis zu 500 Einträge kostenlos.              | YouTube-Playlist als Excel exportieren                |

## 页面结构与本地化

2026-10-25 根据用户反馈修正布局：德语首页直接复用英文首页的组件组成，不另建简化首页。CSV/Excel 保留针对格式的正文，并共用现有 Header / Footer。

首页顺序与英文一致：Header → Hero 导出器 → ProofStrip → Features → HowItWorks → Pricing → FAQ → CTA → Footer。保留相同的 Logo、单行桌面导航、移动端折叠菜单、主题切换、区块宽度和间距。套餐文案已翻译，独立 `/pricing` 页面仍未开放德语。

CSV/Excel 工具页保留格式预选、三步操作、针对 CSV 导入/原生 XLSX 的说明、字段表、静态示例下载、限制和 FAQ。两页互链，首页功能卡片链接两页。所有页面均只有一个 H1。

使用统一的 **du**；自然使用 Playlist / Wiedergabeliste 和 Google Tabellen。按钮使用具体动作：`Playlist exportieren`、`Als CSV herunterladen`、`Als Excel herunterladen`。不承诺固定导出耗时，不重复堆关键词。

未翻译页面继续打开英文；工具下拉菜单、页脚和套餐提示说明英文后续流程。完整后续范围见 [待翻译清单](./德语后续翻译清单.md)。

## 产品事实约束

| 可对外说明                                             | 仓库依据与边界                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 免费最多 500 条；有效订阅最多 5,000 条                 | `src/config/playlist-export.ts`、`src/routes/api/-youtube-playlist.ts`；不是“无限导出” |
| 公共与可访问的未列出列表                               | 现有 YouTube API 流程；私密列表需单独的订阅与授权流程，不承诺读取他人私密内容          |
| 13 种格式；单格式直接下载，多格式/未选择打包 ZIP       | `src/lib/youtube-export/types.ts`、`download.ts`                                       |
| CSV 逗号分隔、UTF-8 BOM；原生 XLSX、固定表头、数值字段 | `src/lib/youtube-export/formats.ts`；不宣称已预设用户自定义图表或筛选                  |
| 17 个导出字段                                          | `types.ts`；页面表格仅列代表字段，缺失字段不保证存在                                   |
| 公共导出不保存导出历史，文件在浏览器构建               | 当前导出器/服务流程；不等于“服务器完全不接触 URL 或元数据”                             |
| 订阅快照与缺失视频记录 30 天到期                       | 已有保留策略文案；不等于恢复删除的视频                                                 |
| 只导出元数据与链接                                     | M3U/M3U8 同样不是媒体备份                                                              |

## 无图片方案与技术要求

不生图。复用英文版的真实表单、步骤/功能卡片及 CSS 表格示意；工具页使用字段表和现有 CSV/XLSX 样例说明产品。保留已有站点图标用于社交元信息；不把图标当产品截图。

- 德语发布范围集中在 `src/config/locale/index.ts` 的三条路径。
- 三页自引用 canonical；en/zh/de/x-default 互返 hreflang；`html lang="de"`、`og:locale=de_DE`。
- sitemap 只新增上述三个德语 URL；未覆盖的 `/de/*` 临时重定向至英文对应页，不生成英文内容的德语副本。
- 结构化数据沿用可核实的 WebApplication / Organization；工具面包屑与可见导航一致，不添加虚构评价、评分或 FAQ 富结果承诺。
- 登录与账户页面仍不可索引；新增语言前缀保持现有隐私路由判断。

## 实施与验收记录

实现内容见 `messages/de.json`、首页共用 blocks 及 `src/blocks/german-export-page.tsx` 工具页内容，复用现有 `Hero` 导出组件。已完成本地验收，尚未部署或推送。

- `pnpm build`：通过。
- `pnpm exec tsc --noEmit`：通过。
- `node --import tsx --test src/lib/private-document.test.ts src/lib/youtube-export/formats.test.ts`：12 项通过，覆盖隐私路由和导出文件格式。
- 三页 × 中英德共 9 个 SSR 文档：语言正确、单一 H1、自引用 canonical、en/zh/de/x-default alternates 正确；三页德语 `og:locale=de_DE`。CSV/Excel 面包屑与可见的“首页 → 工具页”一致。
- sitemap：恰好 3 个德语 URL。未翻译的 About、Pricing、Tools、Analyzer 四个 `/de/*` 地址转到英文，英文页不声明不存在的德语 alternate。
- 浏览器：德语主页 → CSV → Excel 导航；CSV/XLSX 预选；添加额外 CSV 格式；无效 URL 的德语错误；FAQ 展开；Excel 切换英文保留页面；英文 About 链接切换文档语言，均验证。
- 367/390 px 手机宽度及 1280 px 桌面布局检查：未见横向页面溢出；样例 CSV/XLSX URL 返回有效文件。
- [截图与 HTML 检查明细](./德语页面验收-2026-10-25/README.md)。本机 canonical 的主机来自本机 `VITE_APP_URL`；发布时沿用生产环境域名配置。

本轮没有连接新的 YouTube 账户，也未用生产凭据执行真实播放列表下载；导出器复用原实现，格式生成由现有测试验证。关键词搜索量/KD/德国排名、上线后的点击率和转化率仍需真实数据。

后续按用户反馈恢复与英文版相同的首页组件组成；布局对比、手机菜单及重新构建的记录见验收目录。本地保存同时包含 [后续翻译清单](./德语后续翻译清单.md)。
