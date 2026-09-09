# 口播视频 Workflow（Talking-Head Video Editing & Motion Workflow）

状态：v2.9
最后更新：2026-09-09
适用范围：Park 的口播视频剪辑、Hook、字幕、B-roll、动效、BGM、SFX 与最终交付

## 1. 目标

进入这条 Workflow 就默认输入是一支口播视频，不再判断视频类型，也不设置全片级 `motion_track`。

工作结果固定分为：

```text
Product A：Hook 小视频
+
Product B：完整正文视频
=
Final Product
```

Hook 是前置预告。它在开头播放一次，在正文原位置再次出现是有意重复；不得从正文删除。

这套流程让 AI 自主完成判断与执行，只在不可逆或容易产生媒体错误的接口保留约束，不为每个微小动作增加审批、Manifest 或 QA。

## 2. 推荐输入

1. 原始录制视频：只读保留，用于恢复。
2. 剪映人工粗剪视频：主要工作输入，尽量不要烧录字幕。
3. 剪映 SRT：如果质量可用就直接使用；没有或明显不可用时才重新转录。

剪映人工粗剪是有效上游，不是临时绕路。进入本 Workflow 后不默认再粗剪一次。

## 3. 一条 Timeline，四组 Track

```text
Master Timeline
│
├── Picture
│   └── V1：A-roll（Hook 或正文人脸）
│
├── Visual
│   ├── V2：B-roll
│   └── V3：截图 / 图表 / Screen Demo / Illustration / Remotion / HyperFrames
│
├── Caption
│   └── V4：字幕，最后烧录，永远位于最上层
│
└── Audio
    ├── A1：人声
    ├── A2：BGM
    └── A3：SFX
```

B-roll 和动效在逻辑上属于 Visual，在工程里分开，方便单独关闭和替换。

字幕覆盖 B-roll 或动效不是错误。不要为了避免正常重叠而移动画面；只在字幕确实不可读、被裁切、超出安全区或时间错误时修正。

## 4. 两个 Product 的固定合同

### Product A：Hook

固定为：

```text
人脸 + 原声 + 字幕
```

不加 B-roll、截图、动效、BGM 或 SFX。允许必要的切点修正、人声清洁、响度统一和交付编码。

### Product B：正文

正文使用剪映粗剪视频，并完整保留 Hook 的原位置。每一段可以保持人脸，也可以按内容需要加入 B-roll、截图、图表、动效、BGM 或 SFX。

### Final Product

Product A 与 Product B 使用相同的画幅、FPS、编码、色彩空间、音频采样率、响度目标和字幕样式。规格一致时直接 concatenate；不一致时只做一次最终重编码。

## 5. 最低不变量

这些规则保留，不是因为 AI 能力弱，而是因为素材可恢复性和媒体格式本身要求它们存在：

1. 不覆盖原始录制视频和剪映粗剪视频。
2. Hook 不能多字、少字或截在词中间。
3. Product A 与 Product B 在合并前必须媒体规格一致。
4. 字幕在两支 Product 中都最后烧录，并位于最上层。
5. Final Product 必须能完整播放，连接处不能有损坏流、黑帧或明显音量跳变。
6. 可复跑的脚本与验收证据必须随成片归档，不留在临时目录。
7. 每个项目必须记录版本化的媒体、声音、字幕样式和字幕排版 preset；Agent 不临场重新设计默认值。

除此之外，AI 可以根据实际素材选择最短执行路径。可选素材/音轨没有必要时可跳过并记录原因；这不允许跳过 ShotCraft 视觉设计、证据关卡、独立审核或用户审批。执行接口见 [enforcement.md](references/enforcement.md)。

## 6. 精简目录

```text
<project>/
├── project.json                     # 整个项目唯一的共享合同与状态
├── subtitles/
│   ├── source.srt                   # 剪映 SRT 或按需生成的替代版本
│   ├── transcript.corrected.txt     # 只改标点与错别字的校对稿
│   ├── transcript.sentences.json    # 校对稿对齐到 SRT 时间后的分句
│   └── words.json                   # 只有需要逐词校准时才生成
├── analysis/
│   ├── worktable.html               # Step 4 交付：Park 的选 Hook / 标视觉工作台
│   ├── worktable.json               # Park 在工作台里的产出，Step 5 与 Step 11 的输入
│   ├── hook-candidates.json         # 由 worktable.json 派生，不手写
│   └── content-map.md
├── part-a-hook/
│   ├── individual/
│   ├── edit.json                    # Hook 顺序与真实边界
│   ├── subtitles.srt
│   ├── video.mp4
│   └── qa.json
├── part-b-body/
│   ├── edit.json                    # 正文 Picture Lock；可只引用剪映粗剪
│   ├── clean-master.mp4
│   ├── subtitles.srt
│   ├── visual-plan.json             # 只有使用 B-roll/动效时才生成
│   ├── project/                      # 使用视觉工具时归档可编辑工程
│   ├── audio-plan.json              # 只有使用 BGM/SFX 时才生成
│   ├── video.mp4
│   └── qa.json
├── final/
│   ├── video.mp4
│   ├── subtitles.srt                # 平台需要独立字幕时才生成
│   └── qa.json
└── process-log.md
```

除 `project.json` 和三个 `qa.json` 外，其余 JSON 都按实际需要产生，不为了目录整齐创建空文件。

## 7. 十四步流程

十四步归入五个大阶段，但编号和先后关系保持不变：

| 大阶段 | Steps | 阶段完成标准 |
| --- | ---: | --- |
| Preparation | 1–4 | 素材保全，粗剪与可靠字幕时间就绪，`analysis/worktable.html` 已交给 Park |
| Hook & Product A | 5–9 | Hook 批准并独立成片，QA A 通过 |
| Body & Visual Direction | 10–11 | 正文 Picture Lock，视觉规格批准并渲染 |
| Sound & Product B | 12–13 | 声音、最高层字幕与 QA B 完成 |
| Final Delivery | 14 | A/B 合并，QA Final 与最终验收完成 |

正常路径只有三个人工审批门：Step 5 的 Hook、Step 11 的 Visual Spec、Step 14 后的 Final。审批对象未生成前继续自动执行；缺少素材、凭据或删除拍摄指令属于异常阻塞，不增加常规审批环节。

默认生产参数以仓库中的四个文件为准：`presets/media/park-talking-head-4x3-v1.json`、`presets/audio/park-voice-v1.json`、`presets/captions/park-caption-4x3-v1.json` 和 `presets/captions/park-caption-layout-v1.json`。项目只记录 preset ID；需要改变时新建有版本号的 override，不在渲染脚本中散落参数。

### Step 1：口播项目设置

- 记录原始视频、剪映粗剪、可选 SRT、画幅、平台和输出目录。
- 直接设置 `content_type: talking_head_video`。
- 建立 Product A、Product B 和 Final 三个目标。
- 4:3 项目默认载入四个 production preset，并把 ID 写入 `project.json`；其他画幅没有匹配 preset 时标记 blocked。

产物：`project.json`、`process-log.md`。

### Step 2：素材保全

- 确认原始视频和剪映粗剪都存在。
- 不覆盖、移动或改名输入素材。
- 输出写入独立项目目录。

本步骤不再强制为每个输入生成单独 JSON。

### Step 3：媒体与字幕状态检查

- 检查宽高、FPS、时长、编码、色彩空间和音频规格。
- 判断画面是否意外烧录字幕。
- 优先使用没有烧录字幕的剪映粗剪视频。

没有字幕流不能单独证明没有硬字幕；需要抽查代表画面。检查结果直接写入 `project.json`。

### Step 4：字幕输入检查与按需校准

默认路径：

```text
剪映 SRT 与粗剪视频匹配且质量可用
→ 直接使用
→ 不重新转录全文
```

只在以下情况重新转录或生成逐词时间：

- 没有 SRT；
- SRT 与粗剪版本不匹配；
- 文字错误明显；
- Hook 或某句的首尾时间不可靠；
- 用户指出字幕提前消失、缺字或断句错误。

字幕文字与时间可以来自不同来源：`text_source` 负责“写什么”，`timing_source` 负责“何时出现”。两源相同且质量可用时可直接使用；两源不同时必须执行对齐，把文字映射到时间源上，再进入 Hook 切片和字幕制作。允许只校准 Hook 和问题句，不要求全片生成 `words.json`。最终得到一份可用于后续映射的 `subtitles/source.srt`；`words.json` 是可选产物。

#### Step 4 收尾：生成工作台（Preparation 的交付物）

Preparation 不以「字幕可用」结束，而是以「Park 手上有一张能干活的工作台」结束。

```text
source.srt
 → 校对（只改标点和错别字）→ transcript.corrected.txt
 → 对齐回 SRT 时间          → transcript.sentences.json
 → 渲染                     → analysis/worktable.html
```

校对只允许做两件事：补标点、改错别字。不许增删句子、不许改语序、不许润色。校对稿与原话是两个来源，必须对齐而不是假设一致：

```bash
python3 scripts/build_worktable.py map \
  --srt subtitles/source.srt \
  --text subtitles/transcript.corrected.txt \
  --project <name> -o subtitles/transcript.sentences.json

python3 scripts/build_worktable.py html \
  subtitles/transcript.sentences.json -o analysis/worktable.html
```

`map` 自带内容守卫：非标点字数差超出 ±max(3, 0.5%) 或相似度低于 0.95 就直接退出并报错，不输出文件。守卫失败意味着校对稿动了内容——也就是校对这一步编造了 Park 没说过的话，而这些话会顺着 Hook 原话一路传到成片。默认处理是回去改校对稿。

`--force` 不是 Agent 能自己签的字：它需要 Park 明确同意，按异常阻塞上报，并在 `process-log.md` 记下是谁批的、批的是哪一处差异。Agent 自行 `--force` 视为违反本条。

工作台里 Park 做两件事：

1. **选 Hook**——在左边划词，填进右上最多 5 个格子。格子是上限不是配额，空的直接跳过。
2. **标视觉**——在左边划一段，右下生成一张卡，用大白话写这里要插什么图。标注号 ①②③ 会显示在原文对应句尾。

工作台里的时间是 `start_hint` / `end_hint`，由字幕块线性插值得到，**是近似值**。它只用来定位和排序，Step 7 必须重新精确定位，不得拿它直接切割。

Park 点「导出 worktable.json」后文件会落在浏览器下载目录。Agent 必须把它放回 `analysis/worktable.json` 并当面确认路径，才能进入 Step 5——中间产物留在下载目录或临时目录，是本仓库反复掉过的坑。

产物：`subtitles/transcript.sentences.json`、`analysis/worktable.html`。

### Step 5：Hook 选择与共享合同

- 默认由 Park 在 `analysis/worktable.html` 里自己选；明确要求 prefill 时，AI 先读 `prompts/hook-prefill.md` 提供可编辑候选，运行 `hook-prefill` 检查。最终仍读 Park 批准的 `hooks`，按 `order` 排序。
- 选定之后 AI 核对原话与转写一致、把近似 anchor 换成候选搜索窗口、指出截半句/缺主语/只有判决没有对象等问题。
- `anchor_status` 为 `stale` 或 `unmatched` 的条目必须先跟 Park 确认再往下走；`match: "fuzzy"` 的条目要把匹配到的原话回读给 Park 确认。
- `analysis/hook-candidates.json` 由 `worktable.json` 派生，不手写第二份真值。
- Park 批准最终句子和顺序。
- 工作台空着或 Park 明确要求时允许 AI 提名，并在 `process-log.md` 写明原因；不把 prefill 当批准，不覆盖已有人工选择。
- 在 `project.json` 中冻结 Product A/B 共用的 media、audio、caption-style 和 caption-layout preset ID。
- Hook 放到开头后，正文原位置保持不变。

产物：`analysis/hook-candidates.json`、更新后的 `project.json`。

### Step 6：正文 Content Map

- 阅读完整正文，标记章节、观点、案例和结论。
- 标记可能使用 B-roll、截图、图表、动效、BGM 或 SFX 的位置。
- 没有必要的段落保持纯人脸。

产物：`analysis/content-map.md`。不要求同时生成另一份同内容 JSON。

### Step 7：Hook 精确截取

先通过 `workflow_guard.py check --gate hook-cut`，正式切片命令经 `run --gate hook-cut` 执行。原始时间与粗剪时间必须明确区分，同一时间不重复映射；缺真实媒体哈希、词级/听音边界证据或 H1 时拒绝执行。

- 批准的 Hook 来自 `analysis/worktable.json` 的 `hooks`（`hook-candidates.json` 是它的派生视图，不是第二份真值）。
- `anchor.start_hint` / `end_hint` 只是**起始搜索窗口**，不是切点。它由字幕块插值而来，必须逐条听过首尾后重新定位。
- 对批准的 Hook 逐条听首尾。
- 时间不可靠时，只对相关窗口做逐词校准。
- 分别导出无字幕、无 B-roll、无动效的独立 Hook 片段。
- 正文源文件不修改，Hook 原位置不删除。

产物：`part-a-hook/individual/*.mp4`、`part-a-hook/edit.json`。

### Step 8：Hook 拼接与字幕数据

- 按批准顺序拼接 Hook。
- 根据实际片段时间生成 Product A 字幕。
- 字幕仍保持独立，不烧录。
- 不添加任何视觉或声音效果。

产物：Hook Base、`part-a-hook/subtitles.srt`。

### Step 9：Product A 成品与 QA

- 做必要的人声清洁和响度统一。
- 按冻结的 caption preset 最后烧录字幕；4:3 默认必须是窄黑底、随文字宽度变化、轻圆角、底部居中，不得退化成白字描边。
- 输出 `part-a-hook/video.mp4`。
- 执行 Product A 唯一一次正式 QA：句子完整、顺序正确、字幕正确、规格正确、可完整播放。

产物：`part-a-hook/video.mp4`、`part-a-hook/qa.json`。

### Step 10：正文粗剪验收与 Picture Lock

有剪映人工粗剪时：

```text
快速检查内容、切点、音画和完整播放
→ 通过后直接作为正文 Clean Master
→ 不再运行自动粗剪
```

只有没有合格粗剪时，AI 才自行清理明显口误、停顿和无效内容。不得因为某段已出现在 Hook 中而从正文删除。

明确的拍摄或制作指令可以在 Picture Lock 时删除，但必须先获用户批准，并在 `edit.json` 记录原时间、删除文本和原因；此例外不得用于删除正文。

产物：`part-b-body/clean-master.mp4`、`part-b-body/edit.json`。

### Step 11：正文视觉轨道

`video-shotcraft` 在 Picture Lock 后作为 Product B 的视觉总导演。用户要求工作台 visual prefill 时提前调用其设计能力，记录卡片与准确 demo 源码依据；此时是建议，不是正式制作放行。Picture Lock 后重新核对时间线并完成下列决定：

```text
保持人脸
加入 B-roll
加入截图或屏幕录制
加入图表或 Illustration
加入 Remotion / HyperFrames 动效
```

生成 `part-b-body/visual-plan.json` 作为可执行的镜头合同；选择纯 A-roll 时也以空 shots 和逐条 note 回应记录决定。每个镜头写明时间范围、用途、素材来源、元素运动、准确 recipe/demo 与适配理由、数值语义合同，以及 enter、reveal、hold、exit；不要求固定视觉间隔，也不设置“每 20 秒一个视觉点”。机器字段见 `references/enforcement.md`。

视觉覆盖率按 Product B 中 B-roll、截图、图表、Illustration、透明动效和全屏动画区间的时间并集计算，重叠只计一次；Hook、人脸原画面、字幕、BGM 和 SFX 不计入。默认目标为 30%–40%，但不得为了达标添加无意义画面；超出范围时在 spec table 写明原因并随本阶段一起批准。

B-roll 优先使用本人真实素材；外部素材必须记录来源、关闭原声，并且不能用来证明素材本身无法证明的事实。

**`worktable.json` 的 `visual_notes` 是 Step 11 的必读输入，不是参考资料。** Park 在 Preparation 阶段已经用大白话写下了他自己的视觉设计，那是他的判断，不是灵感素材。`video-shotcraft` 必须逐条回应，不许静默忽略：

- 每条 note 在 `visual-plan.json` 里都要有对应的 `disposition`：`采纳` / `调整` / `拒绝`；
- `调整` 和 `拒绝` 必须写 `disposition_reason`，说明为什么专业判断压过 Park 的原意；
- spec table 必须逐条显示 note 编号、Park 的原话描述和 disposition，让 H2 审批时一眼看见哪几条被改了、为什么；
- `anchor_status` 为 `stale` 的 note 先跟 Park 对齐锚点再处理。

Park 的 note 覆盖不到的段落，`video-shotcraft` 照常自主决定。

先通过 `visual-spec` 结构与数值检查，由独立 reviewer 审核文字规格，保存 `qa/visual-spec.json`。然后按 [visual-preview.md](references/visual-preview.md) 为每一处制作嵌入真实画面的静帧，代表性动效制作带原声、正常速度的完整短片。H2 前允许这些有限预览渲染，禁止以“未批准”为由只给文字，也不提前批量做整片。

独立审核者实际查看所有预览、对照原画面与 ShotCraft 参考，检查必要性、构图、节奏与完成度，记录 `qa/visual-preview.json`。`present-spec` 通过后给 Park 看图片/短片并按编号修改；长文字规格折叠为制作附件。默认右侧 notes 动效、实时人脸保留。只有批准当前画面快照后，经 `run --gate visual-render` 才允许正式制作。

文字 CLI QA 不能代替视觉预览 QA；缺视频查看能力不能声称完整看过动态样片。独立 QA 不增加第四个人工审批门。变化较大的帧/样片需重审；已批准的 Hook 和母版不重做。

### Step 12：正文声音轨道

- A1：按 `park-voice-v1` 做人声清洁与响度；默认目标为 -16 LUFS、LRA 7、True Peak -1.5 dBTP。
- A2：按需加入 BGM。
- A3：按需加入 SFX。

没有 BGM/SFX 时直接跳过；不为空轨道生成 `bgm-map.json` 或 `sfx-map.json`。实际使用时统一写入一个 `part-b-body/audio-plan.json`。

### Step 13：Product B 成品与 QA

- 根据 Picture Lock 和冻结的 caption-layout preset 生成或调整 Product B 字幕。
- 按与 Product A 相同的 caption-style preset，最后把字幕烧到最高层。
- 字幕覆盖 B-roll/动效不是错误；只检查实际可读性、裁切和时间。
- 输出 `part-b-body/video.mp4`。
- 执行 Product B 唯一一次正式 QA：正文完整、画面正常、人声清楚、字幕正确、媒体可完整播放。

产物：`part-b-body/video.mp4`、`part-b-body/subtitles.srt`、`part-b-body/qa.json`。

### Step 14：Final Concatenate、最终 QA 与交付

- 确认 Product A 与 Product B 媒体规格一致。
- 一致时直接 concatenate；不一致时只做一次最终重编码。
- 检查连接处的音量、黑帧、时间跳变和损坏流。
- 完整播放 Final Product。
- 输出 `final/video.mp4` 和 `final/qa.json`。

只有发布平台明确要求独立字幕时，才把 Product A 与偏移后的 Product B 字幕合并为 `final/subtitles.srt`。字幕已经烧录且平台不需要 sidecar 时，不生成 Final SRT。

用户只要视频时，Step 14 的成片验收完成即交付完成。用户要求发布准备时，本步骤继续完成标题、封面、倍速交付文件与平台草稿，不新增 Step 15，也不把上传授权当发布授权。完整接口见 [references/release.md](references/release.md)。

#### Step 14 发布交付包（按用户要求启用）

- 按 `prompts/title-cover.md` 给有正文依据的标题候选，选定后逐字使用。
- 默认本期视频截图作为封面人物来源；历史封面只作风格参考。按本次比例要求独立构图、查看两版图片。
- 倍速另存版本，音视频一起变速并保持音高；核对衍生版字幕/动效可读性与实际 AAC 峰值，不继承母版 QA。
- `release.json` 绑定当前标题、封面、视频文件、倍速、平台描述和话题；`release_guard.py check` 通过后上传。
- 上传后实际读回页面，用 `platform-state.json` 记录准确版本和截图；用户要求人工发布则停在草稿页。
- 已授权更新页面时，标题/封面改动必须继续更新平台并重新核验；本地文件修改不是上传完成。
- 用户报告发布与平台独立验证分开记录；README 链接从当前真值生成的摘要，不保留互相冲突的“待 H2/已交付”状态。

归档（与导出同等重要）：

把下面三类东西放进成片同一个目录，不留在 `/tmp`、会话临时目录或某个 agent 的工作区：

```text
scripts/     能复跑出本次结果的脚本（转录对齐、断句、重锚、字幕生成…）
captions/    最终字幕轨（以及它们的中间稿）
qa/          验收证据（抽帧图、对照图、探测截图）
project/     可编辑视觉工程
```

视觉真值链固定为：已批准的 spec snapshot 不回写；`visual-plan.json` 是当前可执行真值；批准后的修改记入 `changes.md`；给人阅读的 spec table 始终从 `visual-plan.json` 自动生成。

完成标准补充：

- 目录里有 `README.md`，逐项说明每个文件是什么。
- 关键脚本可以在这台机器上重新跑出同样的产物。
- 规格表的时间码与实际成片一致；过期的旧表要么更新，要么标注作废。

## 8. 三个 QA Gate

整条 Workflow 保留三个成品 QA，另在 H2 前加入独立规格 QA。QA B/Final 的视觉检查必须包含独立媒体审核，不能把规格审核当成看过成片：

### QA A：Product A

- Hook 顺序与批准一致。
- 不多字、不少字、不截半句。
- 只有人脸、原声和字幕。
- 字幕与冻结的 caption preset 一致，媒体与声音 preset 正确。
- 可完整播放。

### QA B：Product B

- 正文完整，包括 Hook 原位置。
- 人工粗剪没有明显断词或异常跳切。
- 实际使用的 B-roll、动效、BGM 和 SFX 正常。
- 每个视觉镜头抽查 enter、reveal、hold、exit 四个关键帧。
- 独立审核者对照准确 demo、批准规格、参考样片及实际帧；定量图表逐阶段测量共同比例尺与标签。80 的柱形不能比 95 更长；实际图形度量与输入绑定到 `qa/render.json`。
- 字幕最后烧录且可读，Product A/B 的 caption preset ID 相同。
- 人声清楚，视频可完整播放。

### QA Final

- A/B 媒体规格一致，或最终只重编码一次。
- 连接处无黑帧、损坏流和明显音量跳变。
- Final Product 可从头到尾播放。
- 独立 Final SRT 只有在平台需要时才检查。

各步骤可以做必要的即时检查，但不再为每一步建立正式 QA 报告。

交付前经 `workflow_guard.py check --gate delivery` 验证证据链。文件哈希发生变化后重做受影响审核；`pass` 标签、空报告、旧批准均不能放行。

## 9. 已知会重犯的错误

不是流程步骤，是掉过的坑。执行时不用读，出问题时回来查。

- **中间产物留在临时目录** —— 2026-09-05 实测：成片交付后，
  字幕对齐脚本、修正后的字幕轨、验收证据全部只存在于会话临时目录，
  差一步就随会话消失。**最不该重做的东西最容易丢。**
- **没抽帧就断定有／没有硬字幕** —— spec 说有，实测没有（2026-09-05）。
- **拿字幕块时间当词时间去切** —— 物证 `autocut-srt-block-experiment-overcut.mp4`。
- **两份 ASR 打架时不做裁决** —— 同一段音频，剪映说「10 行 / 20 个测试」，
  whisper-small 说「100 / 200」。裁决依据要写下来（正确率对照 + 置信度），不能拍脑袋。
- **规格表和成片脱节** —— 粗剪一改，钉在旧母版上的表全部作废；
  两份表并存时必须标明哪份是真值。
- **`\b` 词边界在中文旁不成立** —— 中文也是 word 字符，
  `Cloud→Claude` 这类替换会静默失效。先加中英空格，再做替换。
- **JPEG 中间帧产生 `yuvj420p`** —— 平台重编码时可能整体偏移对比度。
- **Hook 只有判决没有对象** —— 观众代入不了。
- **工作台导出后留在下载目录** —— `worktable.json` 不放回 `analysis/`，
  Step 5 和 Step 11 就各自去猜 Park 想要什么，等于白填。
- **拿工作台的 `start_hint` 直接切 Hook** —— 它是字幕块插值出来的近似值，
  和「拿字幕块时间当词时间去切」是同一个坑。
- **`visual_notes` 被"参考"掉** —— 不写 disposition 就等于礼貌地忽略，
  Park 的那一遍设计白做。
- **生成了文件就写成完成。**
- **成片后流程中断。** —— 用户随后要求倍速、标题、封面和上传，这些都是 Step 14 发布交付范围；不能每次让用户提醒。
- **参考封面被当成人物素材。** —— 排版参考与本期人脸来源分开；本期截图记录源哈希与时间点。
- **改了标题却没改平台草稿。** —— 本地文件、横竖封面、发布页须绑定同一 release 版本；旧草稿凭据自动失效。
- **README 与已验收事实冲突。** —— 从当前发布包生成摘要；旧阶段说明移入历史，不用旧 pending 覆盖新验收。
- **只写“冻结字幕样式”却没有 preset。** —— Agent 会在圆角黑底、白字描边和全宽 Banner 之间临场猜测；必须读取版本化 preset，并在 QA 对照 ID。

## 10. 工具策略

[`zinan92/videocut`](https://github.com/zinan92/videocut) 和 [`zinan92/autocut`](https://github.com/zinan92/autocut) 是历史实现与 Legacy Reference，不是本 Workflow 的运行依赖。

- 不围绕它们设计目录、接口或步骤。
- 不为了复用旧代码引入旧的 handholding、默认节奏和 fallback。
- 某个简单实现有参考价值时，可以阅读后直接重写当前所需版本。
- `video-shotcraft` 是 Step 11 的视觉总导演，统一规划 B-roll、截图、图表、Illustration 和动画；不把具体卡片清单固化进 Workflow，也不接管 Hook、字幕、声音或最终合并。
- 多镜头时优先把每个镜头做成独立透明视觉层，便于单独修改和重渲；这是实现策略，不是强制步骤。
- FFmpeg、Remotion、HyperFrames 或其他工具由 AI 根据当前任务直接调用。

## 11. 最小过程日志

`process-log.md` 只记录关键决定，不要求每个微动作都写一条：

```markdown
## Step N：阶段名称

- status: pending | partial | blocked | pass
- decision:
- outputs:
- problem:              # 没有可省略
- next:
```

日志服务于继续工作和追溯，不服务于制造流程感。
