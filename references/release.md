# Step 14 发布交付

## 何时进入

本文件覆盖成片后的标题、封面、倍速交付和平台草稿，不替代前面的粗剪、Hook、ShotCraft、H2 或成片 QA。步骤编号仍为 1–14。用户只要成片文件时交付母版即可；用户要求发布准备时继续完成这里的交付包，不能因为“Step 14 已完成”漏掉已授权的上传工作。

本次视频经过 H3 验收后可生成发布衍生版。已验证母版和批准的 Hook 不因新加 guard 或新任务恢复而重剪；修复从首个失效证据处接回。用户明确说“改标题/上传但不要发布”是动作边界，不能自动升级为发布授权。

## 正确顺序

1. 确认本期录制源、已验收母版、上传平台和用户本次指定的速度/话题。加载当前 repo 的 SKILL 与版本，记录实际路径、Git commit、guard 文件哈希；已下载、已安装、已加载、已执行是四件事。旧工程可继续使用冻结版本，记录迁移范围，不补造旧证据。
2. 读 `prompts/title-cover.md` 给标题候选；已有选定标题则直接使用。参考上一期封面时只复用风格，本期截图才是人物源。
3. 制作横竖封面并检查实际图像。标题/封面候选属于交付创作，按用户本次指令决定是否需挑选；不制造固定的第四个人工审批门。
4. 用户要求倍速时另存衍生版，保留母版。视频 PTS 与音频 tempo 使用同一个倍率，保持音高；字幕已烧录时随画面一起变速，独立字幕的时间除以倍率。不得再次做 source→rough 映射。重新核对时长、首中尾音画同步、快放后的字幕和动效可读性、最终 AAC 的响度与峰值。
5. 生成并检查 `release.json`，这是视频版本、标题、两张封面与各平台文案的唯一发布真值。无上传授权时交付文件链接；有授权时上传到指定浏览器/平台。
6. 通过实际页面读回视频文件/时长、标题、封面缩略图、描述和话题，再记录 `platform-state.json`。仅看到上传进度完成不算草稿已核验。
7. 若用户要求人工发布，停在发布页，不点击发布。用户说“我发布完了”时记录 `published_by_user` 和消息来源，不冒充平台独立验证，也不要重复发布。
8. 从当前 release 与平台记录生成 `release-summary.html`，README 只链接这个摘要。旧准备阶段说明标为历史，不能与当前状态并列冒充真值。

平台字段/限制以当前页面和官方资料为准。不要把这次活动标签硬编码为所有视频默认，也不要把抖音专属话题照搬到视频号。保留用户明确要求的大小写。登录、文件访问被拒绝时报告具体阻断，提供准确本地文件链接及字段内容；不声称上传成功。

## 可运行检查

```bash
python3 scripts/release_guard.py check /path/to/project
python3 scripts/release_guard.py check-draft /path/to/project --platform douyin
python3 scripts/release_guard.py summary /path/to/project --out /path/to/project/release-summary.html
```

工具不上传、不发布、不生成审批。检查 PNG 头部实际尺寸与 ffprobe 读到的视频时长；图像人物、文字和听音判断仍由实际查看/试听证据负责。它不做人脸识别，也不能证明生产 Agent 没有伪造本地记录。其作用是防止版本混用和缺项被静默放行。

`release.json` 使用 `park-release/v1`。每个文件引用为 `{path, sha256}`（相对项目或绝对路径）；摘要命令输出 `package_digest`。最小字段结构见 `examples/release-example.json`；全部示例哈希是占位符，必须替换为真实产物。不要把占位符当成可通过检查的审批或 QA。

`subject_frame_receipt` 引用 JSON：`source_sha256`（本期录制）、`time_sec`、`image` 文件引用。截图需由源文件在该时间抽出，保存实际抽帧命令；不是把旧图改名。

`upload_qa` 引用 JSON：`video_sha256`、`source_sha256`（验收母版）、`speed`、`decode_errors`、`pitch_preserved`、最终编码成品 `integrated_lufs` / `true_peak_dbtp`；`checks` 含 sync、caption_readability、motion_readability（各含 status/evidence）；`playback` 含 muted、speed、scope；`limitations` 必须写明，确无则填 none。默认允许 -16 LUFS ±0.5 LU，峰值不高于 -1.5 dBTP；量测中间 PCM 不代替 AAC/上传文件量测。

每张 cover 的 QA 引用 JSON：`image_sha256`、`observed_title`、`subject_frame_sha256`、`face_matches_source`、`text_and_face_uncropped`、`evidence`。必须查看实际封面，不能从生成 prompt 抄填 observed_title。

`platform-state.json` 的 `platforms.<platform>` 含 package_digest、observed_title、observed_description、observed_hashtags、uploaded_video_sha256、uploaded_covers（ratio→hash）、status=draft_ready、publish_clicked=false、page_url、checked_at、screenshot 文件引用。平台不公开文件哈希，uploaded_* 是本次选择上传文件的本地记录，必须与页面时长/缩略图一起核对，不能称为平台返回的哈希。

标题、封面或速度改动会使旧 package_digest 失效。用户已授权“更新页面”时必须补完更新和读回；不能把旧草稿记录改个 digest 就算重新上传。仅改描述也需要刷新草稿记录，但不重剪母版。

## QA 与状态表述

- 内容守卫验证“校对稿相对 ASR 是否漂移”，不证明 ASR 没漏句。字幕生产应读取核对后的文字；疑似缺句回到本期音频局部识别并对齐，保留原转写和修复记录，不重新摘要全文。
- preset ID 不证明实际渲染一致。检查 A/B 的实际字号/换行/圆角/淡入/时点；按实际宽度与语义排版，不用固定字数或把所有长词强改成 0.5 秒。
- 解码、静音快放、正常速度画面回看、声音试听、独立语义审核分别记录对象和范围；不把“8 倍静音播放完”写成“全片听审通过”。
- 独立 QA 需要不同会话和准确输入，不要求必须不同厂商。原生独立 reviewer 可用时不因 CLI 登录过期阻塞所有制作；明确记录 provider/session/检查范围，未调用 Claude 就不写 Claude 已通过。
- 用户否定某一版时，撤销相关完成状态并保留旧版；用户验收后更新对应版本记录。工作台、README、上传页面、最终文件必须能追溯到同一当前版本。
