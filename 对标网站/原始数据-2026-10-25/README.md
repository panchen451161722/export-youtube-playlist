# Mac Chrome / AITDK 原始采集

日期：2026-10-25，America/Los_Angeles；本轮约 07:30–07:40。环境：Mac、Chrome、AITDK SEO Extension 3.0.0。所有数据是这次实际 UI 观察，不是沿用历史表。截图仅为对应视口，不是整页截图；AX 为浏览器辅助功能树快照或变更片段，不保证等于全部 DOM 文本。

## 采集范围与可信状态

| 对象                   | 实际 URL                                                | Overview / Headings                                             | Density 1/2/3 words                                               |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| TuneMyMusic 德语导出页 | https://www.tunemymusic.com/de/transfer/youtube-to-file | 已采集；Lang de，H1–H6=1/3/13/1/0/0                             | 已导出完整表；总词数 424；134/38/70 条                            |
| MyFreshTools 首页      | https://www.myfreshtools.com/                           | 已采集；Lang en，H1–H6=1/9/11/0/1/0                             | 已导出完整表；总词数 370；108/70/64 条                            |
| MyFreshTools 工具页    | https://www.myfreshtools.com/youtube/playlistExport     | Title、Description、Canonical 与标题已更新；H1–H6=1/2/0/1/10/20 | **未通过核验**：显示首页的词频，Word Count 370 不作为工具页有效值 |

辅助观察：TuneMyMusic `/de`、`/de/plans`、`/de/transfer`；MyFreshTools `/pricing` 和站方示例触发的 `/welcome/signup`。未做账号授权、付费或完整文件下载。

## 完整词频导出（共 484 行数据）

| 页面               | 1 word                                       | 2 words                                     | 3 words                                     |
| ------------------ | -------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| TuneMyMusic 导出页 | [134 条 TSV](./TuneMyMusic-1words.tsv)       | [38 条 TSV](./TuneMyMusic-2words.tsv)       | [70 条 TSV](./TuneMyMusic-3words.tsv)       |
| MyFreshTools 首页  | [108 条 TSV](./MyFreshTools-home-1words.tsv) | [70 条 TSV](./MyFreshTools-home-2words.tsv) | [64 条 TSV](./MyFreshTools-home-3words.tsv) |

采用扩展的 Copy 按钮，读取复制文本并保存。由于本轮浏览器剪贴板接口未返回原生扩展所复制的内容，使用地址栏暂存复制文本读取（未提交搜索/导航），随后恢复 URL。地址栏会折叠换行，保存时按每行末尾 `%` 恢复行界；保留原词、Found in、Count、Density，已核对行数与 Copy 数一致。没有自行用另一套分词算法生成 AITDK 数据。

- `T`=Title，`D`=Meta Description，`H1`=主标题；空白表示扩展没有标记这些位置。
- Density 按工具显示的 `count ÷ 总词数` 记录，不能把 n-gram 长度乘入后改写。
- 1/2/3 words 计数是词组列表条数；不是搜索量，不是关键词排名数。
- 导航、相关推荐、品牌、英文残留会进入统计；未经清洗的原始表不能直接用作主关键词清单。
- 没有采集 4/5 words 完整表。TuneMyMusic 面板仅观察到 49/37 条，MyFreshTools 首页仅观察到 42/28 条。

## MyFreshTools 工具页密度异常

先在首页采集后进入工具页，最初扩展没有随页面自动更新；点击 Refresh report 后，Title、Description、Canonical 和 Headings 变成工具页内容，但 Density 仍显示首页的 108/70/64 条和 370 词。关闭重开扩展及新建工具页标签复核后，未取得可信独立结果；新标签 Density 也曾呈空白。

具体冲突：当前工具页 H1 是 `Export YouTube Playlist to CSV`，Density 却仍给 `tools` 标记 `T D H1` 并显示 19 次（5.14%），与首页表一致。不能把它写成工具页真实密度。根因未确定，不断言是缓存、网站渲染方式或扩展实现造成。

[对照截图](./MyFreshTools-tool-density-mismatch.png) · [工具页与旧词频同时出现的 AX](./MyFreshTools-tool-loaded-AX.txt) · [刷新后的 Overview](./MyFreshTools-tool-overview-AX.txt)。Overview 文件内的 Word Count 同属这个异常；Title/Description/Canonical 与网页标题和内容相符，可单独引用。没有生成伪称可信的工具页 TSV。

## TuneMyMusic 观察证据

| 证据                              | 文件                                                                    |
| --------------------------------- | ----------------------------------------------------------------------- |
| 导出页 Overview 与正文            | [AX](./TuneMyMusic-overview-AX.txt)、[截图](./TuneMyMusic-overview.png) |
| AITDK Headings                    | [AX](./TuneMyMusic-headings-AX.txt)                                     |
| 实际流程第二步：账号/URL 两种入口 | [AX](./TuneMyMusic-start-flow-AX.txt)                                   |
| 德语首页 Title/H1、模块与表达     | [AX](./TuneMyMusic-home-AX.txt)                                         |
| 德语套餐默认年付                  | [AX](./TuneMyMusic-plans-yearly-AX.txt)                                 |
| 切换月付后的价格                  | [AX 变更片段](./TuneMyMusic-plans-monthly-AX.txt)                       |

## MyFreshTools 观察证据

| 证据                                 | 文件                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| 首页正文                             | [AX](./MyFreshTools-home-page-AX.txt)                                               |
| 首页 Overview                        | [AX](./MyFreshTools-home-overview-AX.txt)、[截图](./MyFreshTools-home-overview.png) |
| 首页 Headings                        | [AX](./MyFreshTools-home-headings-AX.txt)                                           |
| 独立工具页内容及刷新前旧密度（诊断） | [AX](./MyFreshTools-tool-loaded-AX.txt)                                             |
| 工具页 Overview（Word Count 不可信） | [AX](./MyFreshTools-tool-overview-AX.txt)、[截图](./MyFreshTools-tool-overview.png) |
| 工具页 Headings                      | [AX](./MyFreshTools-tool-headings-AX.txt)                                           |
| 工具页与首页词频不匹配               | [截图](./MyFreshTools-tool-density-mismatch.png)                                    |
| 站方示例识别后进入注册               | [AX](./MyFreshTools-sample-result-AX.txt)、[截图](./MyFreshTools-sample-signup.png) |
| 套餐月付、功能扣点对照               | [AX](./MyFreshTools-pricing-monthly-AX.txt)                                         |
| 年付切换                             | [AX 变更片段](./MyFreshTools-pricing-annual-AX.txt)                                 |
| 展开注册/失败扣点/取消 FAQ           | [AX 变更片段](./MyFreshTools-pricing-faq-AX.txt)                                    |

## 工具与采集限制

浏览器连接的创建/绑定标签调用出现过 `js execution timed out; kernel reset, rerun your request`，之后用 Chrome 原生辅助功能操作继续完成页面采集。这与 Windows 交接中无法识别 URL 的错误不同。浏览器连接超时没有被记成网站故障。

MyFreshTools 内嵌视频初次出现 `www.google.com 将您重定向的次数过多`，后续可看到 YouTube 播放器；记录为瞬时观察，不判断所有访客都无法播放。

保留原有 [历史 AITDK 70 条三词表](../TuneMyMusic-AITDK.md)及其用户提供来源。当前关键词搜索量、KD、德国排名均未采集。没有将站方用户量、导出量、评价或“最快/最佳”文案作为第三方验证结果。
