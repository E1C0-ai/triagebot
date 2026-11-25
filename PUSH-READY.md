# PUSH-READY — TriageBot 推代码待办（2026-11-26，云电脑收尾）

> 状态：**代码尚未推送。不要声称已推送、已上传视频、已提交 Devpost——这些都没做。**
> 截止：**2026-12-23 04:00 北京时间**（2026-12-22 12:00 Pacific）。

## 1. 仓库

- URL：https://github.com/E1C0-ai/triagebot
- 状态：空的公开仓库，已由 eico 在 github.com 上建好（Owner E1C0-ai，
  无 README / .gitignore / license）。
- **代码不在仓库里。** 本地代码在
  `~/workspace/competitions/codegeist-2026/triage-agent/`，
  本地 git 只有一个提交（`6c5e6dd TriageBot - Codegeist 2026 entry`，
  分支 `master`），**未设 remote，未提交本次的文档修改**。

## 2. 推送包 triagebot-source.zip

- 路径：`~/workspace/competitions/codegeist-2026/triagebot-source.zip`
  （注意：在 `competitions/codegeist-2026/` 根目录，不在 `triage-agent/` 内）
- 2026-11-26 重新打包，含最新 docs（README / SUBMISSION / QUALITY-SELF-CHECK /
  EICO-STEPS 已换成真实仓库链接）与 manifest（app id
  `42ec596c-767c-41b1-93da-b1e98ac51814`）。
- 内容：60 条目（46 个文件 + 14 个目录），约 5.2 MB；推送前以
  `ls -lh` 实测为准。校验命令（已通过）：
  ```bash
  unzip -t ~/workspace/competitions/codegeist-2026/triagebot-source.zip
  ```
- 包含：`src/`（triage.js / llm.js / index.js，未改引擎逻辑）、`manifest.yml`、
  `test/`、`test-data/`、`demo/`、`resource/`、`skills/`、`scripts/`、
  `README.md`、`SUBMISSION.md`、`QUALITY-SELF-CHECK.md`、`EICO-STEPS.md`、
  `PUSH-README.md`、本文件、`video/`（含 1:41 草稿视频与截图/旁白/构建脚本）。
- 已排除：`node_modules/`、`video/*.wav`、`video/sil-*.wav`、
  `video/audio-list.txt`、`.git/`。
- 本次复核（2026-11-26，云电脑）：`npm test` **31 全过**
  （22 引擎 + 9 LLM-polish）；`python3 scripts/validate-manifest.py`
  **全部检查通过**。

## 3. 浏览器上传步骤要点（主 agent 执行）

1. 在浏览器打开 https://github.com/E1C0-ai/triagebot ，确认是空仓库。
2. **先在本地解压 zip，再上传解压后的文件——不要直接传 zip：**
   GitHub 网页上传不会自动解压 zip，传 zip 只会得到一个 zip 文件。
   ```bash
   cd /tmp && rm -rf triagebot-push && mkdir triagebot-push
   unzip ~/workspace/competitions/codegeist-2026/triagebot-source.zip -d triagebot-push
   ```
3. 在仓库页点 **Add file → Upload files**，把解压出的全部文件/文件夹
   拖进去（Chrome 支持文件夹拖拽；或分批拖 `src`、`demo`、`video` 等）。
   单文件上限 25 MB：最大的 `video/triagebot-demo.mp4` 仅 3.7 MB，没问题。
4. 不要传：`node_modules/`、视频中间音频（`*.wav`）、`.git/`。
   如上传页提示文件过多，分两次传也可以（先传代码+文档，再传 `video/`）。
5. Commit message 建议：`TriageBot v2 — Codegeist 2026 submission (engine, Forge app, demo, video)`，
   直接 commit 到默认分支。
6. 推完核对：仓库根目录应有 `README.md`、`SUBMISSION.md`、`manifest.yml`、
   `src/triage.js`；点开 README 确认仓库链接一行显示为
   https://github.com/E1C0-ai/triagebot ；再跑一次 `unzip -t` 核对本地 zip
   与上传内容一致（文件数 46）。
7. 替代方案（有 git + 网络时）：在 `triage-agent/` 里
   `git remote add origin https://github.com/E1C0-ai/triagebot.git`
   后 `git add -A && git commit` 再 `git push -u origin master`
   （本地分支是 `master`，不是 `main`）。浏览器上传是任务指定的方式，
   优先用浏览器上传。

## 4. Devpost 提交要点（eico / 主 agent 在浏览器里做）

- 提交稿：`SUBMISSION.md` v5 FINAL DRAFT（已填真实 GitHub 链接；
  安装链接、YouTube 链接两处 PASTE 占位仍空着——没做完，不能提交）。
- Category：**Apps for Software Teams**；Bonus：**Best Agents** 和
  **Best app with Atlassian MCP**。
- 提交地址：https://codegeist2026.devpost.com/ ，按 SUBMISSION.md 逐栏粘贴。
- **Eligibility / 身份 / 税务信息留空，必须 eico 本人确认填写，Muse 不代填。**
  中国不在官方排除名单里，但最终以提交时 eico 的 Devpost 账号 Eligibility
  栏实际显示为准。
- 提交后把确认页截图发 Muse 存档。

## 5. 还没做的事（不要声称已做）

- [ ] 代码推送到 GitHub（本文件第 3 节，主 agent 浏览器上传）
- [x] 重剪视频：Rovo 模拟段（1:03–1:18）已换成 **transcript 幻灯片**
      （2026-11-26 02:17 云电脑完成，见 `video/VIDEO-NOTES.md` v3）——
      Mac 锁屏拿不到真像素截图，用的三问原文逐字 transcript，不是编造；
      最终视频 98.04 秒，ffprobe 三项全过。eico 明早解锁后可截真图替换，
      不换也能交。
- [ ] 最终视频上传 YouTube（公开，< 5 分钟），链接填进 SUBMISSION.md
- [ ] 评委安装链接：Forge “Start sharing your app” 流程生成，填进 SUBMISSION.md
- [ ] Devpost 提交（第 4 节；Eligibility 等 eico 本人）

## 6. 重剪视频待办（Rovo 模拟段 → 真截图）

> 现状（2026-11-26 云电脑实查，未编造任何截图）：
> - 当前文件 `video/triagebot-demo.mp4`：100.8 秒（ffprobe 100.752 s），
>   1280×720，3,790,186 字节。**这是草稿版，绝不能提交、绝不能传 YouTube。**
> - Rovo 段：`video/VIDEO-NOTES.md` 写 1:03–1:18；实测字幕窗口是
>   01:05.096–01:20.024（`video/subs.srt` 第 17–20 条），seg4 旁白
>   `video/narration/seg4-rovo.mp3` 长 14.928 秒。
> - `video/screenshots/` 里只有 `06-rovo-mockup.png`（1280×720，明确标注
>   MOCKUP 的幻灯片），**`06-rovo-live.png` 不存在**——真截图一张都没有，
>   必须主 agent 从浏览器现截。
> - `video/build_video.py` 第 106 行整段 seg4 只用一张图
>   `06-rovo-mockup.png`；第 72–75 行 seg4 字幕第 4 句是
>   “Live Rovo chat footage will be recorded once the app is deployed.”；
>   `video/subs.srt` 由脚本每次运行重新生成，不要手工改它。
> - seg4 旁白 mp3 念的也是上面那句 mockup 台词；仓库里没有生成旁白的
>   TTS 脚本，重录须用当初做旁白的同一方法/声音。

### 步骤

1. **截 3 张真 Rovo 回答截图**（主 agent 在浏览器里做）：
   打开演示站 https://one-atlas-sixi.atlassian.net/ ，进 **Triage Test（TT)**
   项目板上的 Rovo Chat，选 **TriageBot**，按 2026-11-26 真测过的三问截：
   - (a) “Which issues are duplicates?” → 应显示 TT-2 是 TT-1 的重复；
   - (b) “Which issues are most urgent?” → 应显示 TT-1 和 TT-5 最紧急、
     TT-3 其次、TT-4 最后；
   - (c) “Draft a first reply for the checkout crash issue (TT-1)” →
     应显示 TT-1 的首回复草稿（未发布）。
   每张须同时看清问题和 Rovo 回答要点；不要截入无关隐私信息；
   不要用文字拼图 / mockup 冒充真截图。
2. **合成一张 `video/screenshots/06-rovo-live.png`（1280×720）：**
   构建脚本整段 seg4 只认一张图，所以 3 张回答必须拼成一张 1280×720
   （三栏或上下拼贴，保证字可读；或一张能同时拍下三段对话的截图裁成
   1280×720）。`06-rovo-mockup.png` 原文件保留不动，不要删除、不要覆盖，
   以便对照。替代方案（仅当拼贴字太小看不清时）：改 `build_video.py`
   的 `clips` 列表，把 seg4 拆成 3 个 clip 各配一张图、按旁白分段计时——
   这是改脚本，默认不走这条路。
3. **改字幕**：`video/build_video.py` 第 72–75 行，seg4-rovo 第 4 句
   `“Live Rovo chat footage will be recorded once the app is deployed.”`
   改为 `“Live Rovo chat, in Jira, on the demo site.”`
   （`VIDEO-NOTES.md` 建议句）。不要手工改 `video/subs.srt`。
4. **重录旁白**：`video/narration/seg4-rovo.mp3`，只改第 4 句、与新字幕
   一致；前 3 句不变（“In Jira, you just talk to it.” /
   “Triage this week's backlog. Find the duplicates.” /
   “Draft replies for the top five.”）。用与其他 5 段相同的英文 TTS
   声音/风格。时长不必与原 14.928 秒完全一致——脚本按旁白时长自动算
   画面时长，总时长仍须 < 300 秒。
5. **跑构建**（会覆盖 `video/triagebot-demo.mp4`，旧草稿即被替换）：
   ```bash
   cd ~/workspace/competitions/codegeist-2026/triage-agent
   python3 video/build_video.py
   ```
6. **ffprobe 验收（三项缺一不可）：**
   ```bash
   ffprobe -v error -show_entries format=duration -of csv=p=0 video/triagebot-demo.mp4
   # 须 < 300 秒（预期约 101 秒，seg4 旁白变长会略增）
   ffmpeg -v error -i video/triagebot-demo.mp4 -f null -
   # 全量解码，须无报错输出
   ffmpeg -i video/triagebot-demo.mp4 -af volumedetect -vn -sn -dn -f null -
   # 音频非静音：mean_volume 须为有限负值（草稿均值约 -32.1 dB）
   ```
   再抽查 1:05–1:20 之间的帧：画面须是真 Rovo 截图、字幕第 4 行须是
   新句子、画面上不得有 “MOCKUP” 字样。
7. 验收通过后才传 YouTube（公开），把链接填进 `SUBMISSION.md`。
   草稿版（mockup 段）绝不能上传、绝不能提交。
8. 另：`VIDEO-NOTES.md` 还规划了一个可选的约 20 秒 LLM polish 段
   （toggle 默认关 → 一次成功 polish → 一次失败回退本地草稿），那是
   final cut 的附加项，**不是本次重剪必须做的**；要做也按
   `build_video.py` 的方式加段，不要顺带改其他段。
