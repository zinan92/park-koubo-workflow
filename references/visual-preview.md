# H2：看画面审批 · v1

Hook 继续审核原话与顺序。Visual Spec 的用户入口改成画面，不要求 Park 阅读动画参数来想象结果。可执行 JSON 和文字细节保留给制作与审计。

## 制作与审核顺序

1. 先判断这一处是否值得增加视觉。对比保留原页面/原录屏与增加图形两种方案；原画面更清楚就不加，不能为了覆盖率占满时长。
2. 锁定画幅与人物区域：本口播默认保持左侧实时人脸，图形只在右侧 notes 区域内重排。禁止把完整 4:3 图形等比缩小塞进半屏；需按右侧实际尺寸重新排字、图与坐标。用户明确指定其他构图时记录覆盖。
3. **每个保留的视觉点都制作真实合成静帧。** 同一个口播时间点展示原画面和加入视觉后的画面，包含人脸、屏幕背景、字幕、安全区；通常一张，变化关系需要时给开始/落定两张。B-roll 同样预览实际裁切后的构图。不能拿原片截图、纯文字或孤立图形冒充合成效果。
4. **少量代表镜头制作正常速度短片。** 通常先选 2–3 个，覆盖最主要的动作风格、复杂定量变化或构图风险；数量按内容决定，不为凑数。其余有动画的镜头须说明由哪支样片代表及为何可类比。不用每一处完整试渲染，但每一处都有静帧。
5. 样片带实际原声，覆盖该镜头完整时间段（含开头空等、动作、末尾停留和退出，必要时带前后语境）。不能只截最好看的两秒动作，也不能倍速播放掩盖冗长停留。
6. 独立 reviewer 查看所有实际合成静帧，并以正常速度审查全部代表样片及原画面对照。先修复问题，再通过 `present-spec` 交 H2；仍然只有原有三个用户审批门。
7. Park 在图片卡中按编号给保留/删除/修改意见，或直接在对话说编号。反馈导出不是批准；回写工作台与 plan 后重生成受影响预览。批准绑定当前 plan、图片、短片、人物布局和实现源的指纹。
8. H2 后才批量正式制作。最终画面/节奏必须对照批准样片，代码或风格变化使相应证据失效。最终 QA 仍须正常速度看完整视觉段，不能只用四张截图判断节奏。

**预览是明确允许的 H2 前工作**：可以渲染有限静帧、短片和低分辨率合成，放在 `analysis/visual-preview/`。这不是绕过审批制作整片。不要覆盖 clean master、Product B 或 final。结构检查通过即允许制作这些审批材料，不需要先获得 H2。

## 独立设计 QA

除了 semantic/motion/timing/sources，`qa/visual-preview.json` 必须逐项提供实际观察依据：

- `usefulness`：相比原画面是否更清楚；复杂 HTML 被缩成不可读窄条应退回原画面。
- `composition`：人脸保留、右侧信息层级、实际字号/留白和字幕关系是否合适。
- `pacing`：完整段落有无空等和无信息变化的尾段；信息讲清后回到原画面，不靠循环动画制造“还在动”。
- `reference_quality`：对照选择的 ShotCraft 参考视觉/样片，判断排版、动作和材质适配是否到位。不要把读过 demo、报出了帧数当成设计质量证据。

超过 3 秒没有信息变化时必须写阅读/语境理由，并由 reviewer 在完整样片中判断；这是复核触发线，不是所有静帧一律 3 秒上限，也不鼓励不断乱动。少用概括标签替代原本能直接展示的内容。

reviewer 缺视频观看能力时不能写正常速度观看已通过；改用可看样片的独立 reviewer。图像与视频查看记录只支持实际看过的范围，测试通过不等于审美通过。

## 文件接口

`workflow-evidence.json` 增加 `visual-preview.inputs`，每项依旧 `{path,sha256}`：

- `index`：下述预览索引。
- 对比 PNG、样片视频、实际实现源文件各自的输入名。

索引结构：

```json
{
  "schema": "park-visual-preview/v1",
  "spec_digest": "visual-spec 检查输出的指纹",
  "body_sha256": "当前正文母版哈希",
  "implementation_inputs": ["impl:V01"],
  "layout": {"mode":"notes-only", "canvas":[1440,1080], "overlay_rect":[540,20,880,1040], "face_rect":[0,0,530,1080], "face_live":true},
  "shots": {
    "V01": {
      "reason_to_add":"相比原画面具体改善了什么",
      "comparisons":[{"time":12.5,"original":"original:V01","composite":"composite:V01"}],
      "motion":true,
      "last_change_sec":16,
      "tail_reason":"超过三秒才必需的阅读/语境理由",
      "sample":{"input":"clip:V01","start":10,"end":18,"reason":"代表主要图形动作与布局"}
    }
  }
}
```

示例坐标不是通用模板，必须从本片真实布局测量。custom 构图需要 `user_override_ref`。索引中 shots 必须与 plan 保留镜头一一对应；动效镜头没有 sample 时提供 `represented_by`（有样片的镜头 ID）和 `representation_reason`。静态图形 motion=false 不必强行动起来。图像必须是完整预览画幅 PNG；短片由 ffprobe 验证含音视频及原速时长。机器无法证明合成图中的人脸真实持续播放、截图确由某一帧生成或长停留是否合理，独立视觉审核负责核验，禁止从字段反推“已看过”。

`spec_digest` 来自 `check --gate visual-spec`。生成预览不要求 H2：

```bash
python3 scripts/visual_preview.py <project> --out <project>/analysis/visual-preview/review-v1.html
# 独立 reviewer 实际查看预览，输出 qa/visual-preview.json 后：
python3 scripts/workflow_guard.py check <project> --gate present-spec
# 将预览入口接回工作台，保持原 Hook 与 visual 编辑能力：
python3 scripts/build_worktable.py html <transcript.json> --visual-preview <review-v1.html> -o <worktable.html>
```

预览页连同同名 `.assets` 文件夹保存素材副本；保留它们，不覆盖旧版本。反馈导出绑定当前指纹，回写前核对版本。预览页不替代工作台编辑器，也不会自动保存反馈或审批。向用户展示图片和短片本身，不用渲染脚本、长表格或“独立 QA 通过”当预览。

`qa/visual-preview.json` 使用已有独立 review schema，`input_digest=digest({spec: spec_digest, preview: visual-preview stage digest})`，checked IDs 覆盖全部镜头，raw_response 与报告一致，reviewer_session 与 producer 不同。额外四个设计检查放在 checks 中。H2 与后续 delivery digest 使用这个组合指纹；文字 spec 的 CLI 审核依旧绑定原 spec_digest，**不自动生成预览 QA**。

旧版只有文字 H2 的项目不能伪造新批准。已验收项目保留其冻结版本；正在重设计的镜头按新协议迁移，让 Park 审核真实预览。不因规则升级而重新粗剪或重做已批准的 Hook。
