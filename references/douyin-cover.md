# 抖音封面 · 默认品牌样式 v1

进入发布准备时自动读本文件、`prompts/title-cover.md` 和 `presets/covers/park-douyin-bold-orange-v1.json`，实际查看 preset 中两张参考图。不是让用户每次重新上传上一期封面。用户说“之前一样”默认指这套；有明确新要求则记录 override 并照做，不追加例行审批。

## 已沉淀的视觉

参考来自 2026-09-11 视频最终 v3：超大、重、倾斜的紧凑字体，黑色正文与橙红关键词；暖米白背景、克制笔刷下划线与斜角。横版文字压左、人物抠图压右；竖版文字在上、人物在下，单独构图。不要退回圆角照片卡、小标签、三角示意图或装饰性英文副标题。

参考图里的人物、衣服、手势和“FDE”文案都不是固定资产。只复用视觉语言；新封面必须使用本期实际截图的人物。黑衣、持麦、某个表情都不是默认要求。横竖比例是本工作流默认，不声称抖音只接受这些比例；如平台当前页面要求不同，按实际页面与用户选择覆盖。

## 每次执行

1. 固定当前选定标题和本期录制源。选清晰的实际人物帧，记录源哈希、时间和图片哈希。抠图/美化不得换脸或改服装；只有用户明确另选人物源时才覆盖来源规则。
2. 实际查看本期截图及横竖参考，再用 imagegen Skill。提示词明确分开 `SOLE PERSON SOURCE` 与 `STYLE REFERENCE ONLY`，保存实际提示词和工具调用/输出引用。不要运行旧项目的 Pillow 封面脚本代替图像生成；旧被拒绝脚本和旧初稿不应作为模板。
3. 标题逐字使用，只调整换行和视觉空白，保持原标点/大小写；强调词取自标题。横竖各生成一张，避免将横版直接裁成竖版。文件按修订命名，不覆盖已批准旧版。
4. 查看两张实图及各自缩略图，检查准确文字、本期人物、字体力度/倾斜程度、人物与文字区域、橙色强调、裁切与小屏可读性。样式相同不等于只用同样配色。完整工作流的独立终检应包括这两张封面；检查记录只能写实际看过的范围。
5. 用 release.json 绑定当前 title、两张封面及其 generation_receipt/QA、preset 哈希；给用户实际图像和绝对路径。在已授权上传的任务中，更新平台两种封面并读回缩略图，不能只留本地文件；仍不把草稿上传当成发布授权。

## 改标题的联动

发布准备中说“换个 title”默认同时改发布标题与横竖封面文案，保持人物和既定风格，重新看图并更新已经授权的草稿。用户明确说“只改平台标题、封面不动”才保留旧封面：把封面原文放在 `cover_title_override`，包含 title、message_ref、当次 release_title 与 title_selection_ref（当前 title_selection.message_ref），下一次标题选择不能沿用旧例外；不谎称两者一致。纯标题讨论/候选提议不自动启动图片生成或上传。话题沿用本次指定列表，不固定成所有视频默认。

## 证据接口

release.json 增加 `cover_design`：

```json
{"preset_id":"park-douyin-bold-orange-v1","preset_sha256":"实际preset文件哈希"}
```

明确新风格：`preset_id` 用新ID，同时提供 `user_override_ref` 和 `preset` 文件引用。该JSON需有相同id、ratios 默认比例列表及按ratio键组织的 `references` 文件引用；自定义参考相对项目。默认参考相对Skill根目录。不伪造用户覆盖。

每张 cover 的 `generation_receipt` 引用JSON：engine=imagegen、tool_call_ref（真实调用ID或保存的工具记录位置）、prompt（实际完整提示词）、subject_frame_sha256、style_preset_sha256、style_reference_sha256（ratio→实际引用图片hash）、output_sha256。至少包含当前比例对应的样式图；可以同时引用另一比例。此记录用于溯源，不能从自报字段证明工具确实调用。

每张封面 QA 在原字段之外增加 style_preset_sha256 和 checks。checks 至少含 typography、portrait_layout、palette、thumbnail，每项 status:pass 和 evidence；thumbnail 另含 reviewed_width_px（实际查看宽度，不超过360像素）。不能从生成提示词复制检查结果。标题视觉核对只忽略排版空白；标点、字和大小写必须一致。

运行 `release_guard.py check` 后才能把发布包标成 ready；它检查参考文件、版本、实际尺寸与证据齐全，无法自动判断审美或人脸。换preset、换人物帧、改标题、换生成图都会使旧QA/发布包失效。迁移旧项目只作用于新一轮封面制作，不补造旧调用和批准记录。

明确改变比例集合时，`cover_ratios_override` 需记录当前 `ratios` 和 `message_ref`；不能自行删掉默认横/竖任一张。新比例需要对应的新风格参考 preset。

用户明确指定其他人物素材时，`subject_source_override` 记录 `source` 文件引用、`kind`（image/video）、`message_ref`。视频照常抽帧并记录该源时间；图片直接作为人物源，frame receipt 的 image 等于 source、time_sec=null、source_sha256 为该图片哈希。封面及 QA 仍绑定该人物帧，不假称源自本期录制。
