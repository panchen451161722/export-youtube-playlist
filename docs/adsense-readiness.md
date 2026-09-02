# AdSense 申请前处理清单

更新时间：2026-09-01

## 上线门禁

只有以下项目全部完成并在生产环境复核后，才提交 AdSense 网站审核：

1. 部署本清单关联的隐私、版权和内容差异化修改。
2. 生产构建、关键页面和中英文路由均通过验证。
3. `support@exportyoutubeplaylist.com` 能真实收信，并有人处理隐私与版权投诉。
4. 使用真实 AdSense publisher ID 连接网站并发布 `ads.txt`；不得使用占位 ID。
5. 在 AdSense Privacy & messaging 中发布适用于 EEA、英国和瑞士的 European regulations message。
6. 完成年龄、重复账户、域名控制权、AdSense 网站状态和流量来源核验。

## 审计项状态

| 审计项           | 当前状态                  | 完成条件                                                                                                                       |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ADS-PRIV-02`    | 本地已修复，待部署        | 生产隐私政策明确披露 Google/第三方可放置和读取 Cookie，并使用 Web Beacon、IP 地址及类似标识符；Google partner-sites 链接可访问 |
| `ADS-CONTENT-08` | 本地已修复，待部署验证    | CSV 与 Excel 页分别展示独有使用场景、实际文件行为、限制、兼容性、字段预览和可下载样例                                          |
| `ADS-TXT-02`     | 本地已修复，待部署验证    | 根路径 `/ads.txt` 返回正确的 `google.com, pub-5428651211440842, DIRECT, f08c47fec0942fa0`，并在 AdSense 中显示 Authorized      |
| `ADS-PUB-02`     | 本地文案与版权邮箱已确认  | 缩略图页、条款和联系页明确授权边界；`support@exportyoutubeplaylist.com` 已实测可收信；首发广告排除该页                         |
| `ADS-PRIV-04`    | 阻塞：需 AdSense 后台操作 | 发布 Google 认证且接入 IAB TCF 的 European regulations message，并完成强制展示测试                                             |
| 账户与控制权     | 部分确认；AdSense 配置中  | 已确认申请人满 18 岁、主要流量来自自然搜索且 `<head>` 可控制；仍需确认重复账户、域名控制权及 AdSense Sites 最终状态            |

## 初始广告范围

- 首发明确排除 `/tools/download-youtube-thumbnail`。
- 不在下载按钮、格式选择器、错误提示或结果操作旁放置容易被误认为操作控件的广告。
- 不在缺少实质性第一方说明、评论或独立价值的页面启用广告。
- CSV 与 Excel 页只有在本次差异化内容部署并完成生产复核后，才进入广告候选范围。
- 网站连接代码和 `ads.txt` 已使用真实 publisher ID 配置；CMP 与页面排除完成前保持 Auto ads 关闭，不创建或投放广告单元。

## CMP 后台步骤

1. 在 AdSense 中添加 `exportyoutubeplaylist.com`。
2. 进入 **Privacy & messaging → European regulations**，创建消息。
3. 选择本站，并填写 `https://exportyoutubeplaylist.com/privacy-policy`。
4. 启用首屏可见的 **Do not consent** 选项；保留 **Consent** 和 **Manage options**。
5. 配置英语（US）和简体中文，并逐个检查实际文案。
6. 选择适用于 EEA、英国和瑞士的目标范围并发布。
7. 部署 AdSense 连接代码后，用以下生产地址强制测试：
   - `https://exportyoutubeplaylist.com/?fc=alwaysshow&fctype=gdpr`
   - `https://exportyoutubeplaylist.com/zh?fc=alwaysshow&fctype=gdpr`
8. 分别验证 Consent、Do not consent、Manage options 和再次打开隐私设置的流程。
9. 确认页底存在 Google 要求的 consent revocation 入口，并能重新打开三选项界面。

## 账户持有人核验

- [x] 申请人已确认年满 18 岁。
- [ ] 同一收款人不存在第二个 AdSense 账户；如有，先关闭重复账户。
- [ ] 申请人能控制域名 DNS、生产部署以及网站 `<head>`。
- [ ] `exportyoutubeplaylist.com` 的 AdSense 账户/网站配置正在进行；完成后将 Sites 状态和任何错误截图留档。
- [x] 主要流量来源已确认为自然搜索。
- [ ] 核对流量记录中不存在付费点击、强制跳转、垃圾邮件或软件触发流量，并保留 Search Console/分析后台截图。
- [x] `support@exportyoutubeplaylist.com` 的收信流程已经实测。

## 官方参考

- Google partner-sites data use: https://policies.google.com/technologies/partner-sites
- AdSense ads.txt FAQ: https://support.google.com/adsense/answer/9785052
- Google CMP requirements: https://support.google.com/adsense/answer/13554020
- Create a European regulations message: https://support.google.com/adsense/answer/10960768
- Google Publisher Policies: https://support.google.com/publisherpolicies/answer/10502938
