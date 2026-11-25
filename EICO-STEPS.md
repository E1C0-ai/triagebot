# EICO-STEPS — 只差 eico 的事（按顺序做，Codegeist 2026）

> 截止：**2026-12-22 12:00 太平洋时间 = 北京时间 2026-12-23 04:00**。
> 建议最晚 12-18 完成部署联调，留 4 天做最终视频 + 提交。
> Muse 没有 eico 的任何账号，下面每一步都要他本人在自己电脑上操作。
> **不要把任何密码 / API token 发到聊天里** — 登录类操作都在他自己电脑的终端里完成。

## 第 1 步：GitHub 建仓库（✅ 2026-11-26 仓库已建好，代码还没推）

仓库已建好：空的公开仓库 https://github.com/E1C0-ai/triagebot
（Owner E1C0-ai，`triagebot`，无 README / .gitignore / license）。
**不要再建一次。** 剩下的是推代码：Muse 不能用连接器建库/推库，
推代码走浏览器上传，由主 agent 执行（步骤见 `PUSH-READY.md`，
zip 在 `../triagebot-source.zip`）。

1. 主 agent 在浏览器里打开 https://github.com/E1C0-ai/triagebot ，
   用上传方式把代码推上去。
2. 推完后核对仓库里有全部文件（README / SUBMISSION / src / manifest
   等），再告诉 eico。
3. 仓库链接已填进 `SUBMISSION.md` 和 `README.md`（2026-11-26 已做）。

## 第 2 步：Atlassian 开发者账号 + 演示站（✅ 2026-11-26 已完成）

登录（Forge CLI 专用令牌 TriageBot-Forge-CLI）、`forge register`
（Developer Space triagebot，App ID 42ec596c-767c-41b1-93da-b1e98ac51814）、
`forge deploy`（development v2.1.0）、`forge install --demo-site`
（演示站 https://one-atlas-sixi.atlassian.net/ ，已装进 Jira）全部完成。
第 3 步真测也已通过（见下）。这一步不用再做了。

Rovo 不在 Jira 免费版里。最省事的路是 Forge 演示站——自带企业版
Jira + Rovo，有效期 90 天，不用开付费试用：

1. 注册 Atlassian 账号（没有的话）：https://id.atlassian.com/signup
   —— 用自己的邮箱注册。
2. 在自己电脑上装 Forge CLI（终端里跑）：
   `npm install -g @forge/cli`
   （需要 Node ≥ 22；Muse 这边已装好 Forge CLI 16.0.0，可对照。）
3. 去 https://id.atlassian.com/manage/api-tokens 建一个 API token
   —— **token 只在你自己终端里用，不要发给 Muse、不要截图发出来。**
4. 终端里跑 `forge login`，按提示填邮箱 + 刚才的 API token。
5. 部署 + 安装（二选一，推荐 A）：
   - **A（推荐）：**在 `triage-agent` 目录里跑
     `forge deploy`，再跑 `forge install --demo-site`
     —— 自动开一个含 Rovo 的演示站（90 天），不用自己建站。
   - **B：**自己先去 https://go.atlassian.com/cloud-dev 建一个免费
     开发者站，再跑 `forge deploy` + `forge install`，安装时选 Jira，
     填站地址（例如 `xxx.atlassian.net`）。注意：免费开发者站本身不含
     Rovo，要用 Rovo 需再开 Standard 试用 14 天或 Premium 试用 30 天。
6. `forge deploy` 第一次跑时，`forge create` 会把 `manifest.yml` 里
   占位的 app id（`ari:cloud:ecosystem::app/00000000-…`）换成真的。
   如果部署报错，把报错原文发给 Muse 改。

⚠️ 花钱提醒：Rovo 按点数计费，Standard 每人每月 25 点、Premium 70 点；
2026-12-03 起超出点数按 $0.01/点收费。演示站联调那几下花不了多少，
但别在试用站里大量刷，试用到期前记得取消试用，避免扣费。

## 第 3 步：真实 Jira 联调（✅ 2026-11-26 01:10 已通过）

项目 Triage Test（TT），5 条工单 TT-1–TT-5，Rovo 三问全答对：
TT-2 是 TT-1 的重复；最紧急 TT-1 和 TT-5，TT-4 最后；TT-1 首回复草稿
已写（未发布）。全程无报错。剩下的是生成评委用的安装链接：
按 https://developer.atlassian.com/platform/forge/distribute-your-apps/
的 "Start sharing your app" 流程操作，把链接贴进 `SUBMISSION.md`。

部署后第一件事就是验证 `src/index.js` 的真 Jira 读取是否工作
（之前只按官方文档写过，从没在真站上跑过，这是最大风险点）：

1. 在演示站 / 测试站的 Jira 里建一个项目，随便建 5–10 条测试 issue
   （可以照 `test-data/sample-issues.json` 里的例子抄：支付故障、登录
   失败、token 泄漏、按钮错位、暗黑模式需求）。
2. 在 Jira 里打开 Rovo Chat，选 **TriageBot**，依次问：
   - "Triage this week's backlog"
   - "Which issues are duplicates?"
   - "Draft replies for the top 5 issues"
3. 把三件事的结果告诉 Muse（截图或文字都行）：
   - 有没有正常出结果、分数和分组对不对、有没有报错。
   - 如果报错，把报错原文发来，Muse 改代码再部署。
4. 联调通过后，Muse 生成安装链接（给评委用的）：
   按 https://developer.atlassian.com/platform/forge/distribute-your-apps/
   的 "Start sharing your app" 流程操作，把链接贴进 `SUBMISSION.md`。

## 第 4 步：最终视频（部署后，约 30 分钟）

1. 在已部署的 Jira 测试站里录屏 Rovo Chat 的三段对话
   （第 3 步问的那三句），每段 10–20 秒。
2. 把录屏发给 Muse，Muse 把 `video/` 里 Rovo 占位那段换成真录屏，
   重新合成最终版（脚本 `video/build_video.py` 已就绪，10 分钟的事）。
3. 你把最终版 mp4 传到自己的 YouTube，设为**公开**（规则要求视频必须
   公开在 YouTube），把链接发给 Muse 填进提交稿。
   —— 草稿版视频已做好：`video/triagebot-demo.mp4`（1:41），Rovo 那段
   目前是明确标注的占位，不可直接拿去提交。

## 第 5 步：Devpost 提交（最后，10 分钟）

1. 打开 https://codegeist2026.devpost.com/ 注册 / 登录自己的 Devpost 账号。
2. 按 `SUBMISSION.md`（最终稿）逐栏粘贴：标题、简介、描述、技术说明、
   两个 bonus 的说明、安装链接、GitHub 仓库链接、YouTube 视频链接、
   评委测试步骤。
3. Category 选 **Apps for Software Teams**；Bonus 选 **Best Agents** 和
   **Best app with Atlassian MCP**。
4. **Eligibility / 身份 / 税务信息必须你自己确认填写**，Muse 不代填。
   中国不在官方排除名单里，但最终以你提交时 Devpost 账号 Eligibility
   栏的实际显示为准。
5. 点 Submit。提交后把确认页截图发给 Muse 存档。

## 如果某一步卡住了

把页面报错 / 终端报错原文发给 Muse，不要只说“不行了”。
Muse 按报错改代码或换方法，直到确认真的做不了再一起想别的办法。
