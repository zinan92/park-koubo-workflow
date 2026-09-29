# 动效导演：竖屏纯口播怎么配动效

适用：`spec.layout = vertical-full-overlay`（人脸全屏的竖屏口播）。视觉风格预设 `presets/visual/park-vertical-director-v2.json`。
镜头库在 `motion/`，每个镜头是一张 ShotCraft 镜头卡改编成的竖屏纸墨中文 React/Remotion 组件，按数据注册。

来源：2026-09-28《99% 的自媒体人都在追求流量》。第一版只用 4 种胸前卡片，Park 说 plain、everything is the same；
第二版按本文做，Park 9/29 看 3 段样片后说「这个质量，整条重新剪」。

## Park 定的规矩（不要再问他）

1. **要有导演。** 逐段判断这段话在做什么——冲击一个数字、对比、列清单、讲流程、金句、拿证据、自问——再从镜头库挑最合适的；库里没有合适的，去 ShotCraft 挑卡新做（做完进库）。同一种镜头不连着用，节奏有起有落。
2. **隔一阵挡一次脸。** 「I invite you to block my face once in a while」——大约每 1.5–3 分钟一处全屏，放在最该看画面的地方（结构图、数据图、交付物、金句、收尾）。全屏之间用胸前卡片。
3. **全屏就整屏盖满，连字幕一起盖。** 看全屏动效时没精力看字幕，听他说就好。重要内容仍放 y 150–1650（抖音底部账号/文案栏），y 900 以下关键字不超过 x 900（右侧按钮栏）。
4. **只看样片审批。** 不给他看文字镜头表或 spec，他看不出样子。先挑 2–3 段风格差别最大的做成最终画质样片（带原声和原字幕，每段 15–25 秒），他认可质量后再做整条。
5. **只上他说出口的话和数字。** 不编数字，不补他没说的结论；他没说的比例只用图形表示，不写成字。
6. **对准说出那个词的时刻。** 用 `words.json` 词级时间（`scripts/motion/words.py`），不是短语起点；关键信息落定后至少静止 1 秒。
7. **客户信息要遮。** 视频里展示交付文件时，客户名字和营业额（他点名的）遮黑；原件不动，只遮视频用副本（`scripts/motion/shoot_doc.py --redact`）。拿不准要不要遮的，先问。
8. **动效占比。** spec.visual_coverage_target 是他的目标。导演混剪实际会偏高（第一条 44%，其中全屏 19%），交付时如实报数，超了就说「嫌满可以删哪几张胸前卡片」，不要为了凑比例塞镜头。

## 两种尺寸

| size | 位置 | 什么时候用 |
|---|---|---|
| `chest` 胸前卡片 | x 60–900、下沿 y 1580、内容高 ≤ 560，纸白 96% 底 | 一个数字、一句要点、2–4 项并列；不打断人脸 |
| `full` 全屏 | 整屏 1080×1920，纸底或墨底，进出场用色块阶跃或硬切 | 结构图、数据图、交付文件、自问、收尾金句 |

镜头库里每个组件的尺寸、改编自哪张卡、什么时候用，看 `motion/src/catalog/*.ts` 的 `use` 字段（导演挑镜头就看这一句）。

## 流程（Step 11 内）

1. `python3 scripts/motion/new_project.py <视频工程>` 建 `<视频工程>/motion/`。
2. `python3 scripts/motion/words.py <成片粗剪.mp4> <视频工程>/motion/words.json` 出词级时间。
3. 导演：通读转写，逐段定镜头，写 shots 数据（可以按组拆成几份 `shots.*.json`）：
   `{ "shots": [{ "id", "component", "start", "frames", "props" }] }`——`start` 是口播绝对秒（作为 `t0` 传进组件），props 里的 `at` 也都写绝对秒。
   交付文件先 `shoot_doc.py` 截长图到 `motion/public/`，把输出的 .json 位置数字抄进 props。
4. `python3 scripts/motion/timeline.py <视频工程>/motion shots.*.json --duration <总秒数>`：合并、查撞车、报占比和全屏间隔。
5. 挑 2–3 段风格差别最大的，`scripts/motion/render.sh <motion> <这几段的 ID>`，再 `composite.py … --from --to` 出样片给 Park（H2）。
6. 认可后 `render.sh <motion>` 全部渲染，`composite.py` 合成整条；再出一版 720p 预览。
7. 自检：抽 20+ 帧（每个全屏至少一帧），确认每个镜头在该在的位置、字幕和原声正常；没整条看完就如实说。交付时报：镜头种类数、全屏几处、动效占比、和原计划不一样的地方。
8. 验收后 Park 按「几分几秒」提意见，只改那一个镜头：改 props → `render.sh <motion> <ID>` → `composite.py` 重合成。

## 做新镜头

库里没有合适的，按 ShotCraft 挑卡新做：读卡全文和「参考实现」的 demo 源码，保留动效核心（缓动、节拍、命门），改成竖屏、纸墨配色、中文；
props 化（`t0` + 内容 + 绝对秒 cue，不写死某条视频的字和时间）；在 `src/catalog/` 注册 size/shotcraft/use；文件头写改编自哪张卡、保留了什么、改了什么。
样式 token 用 `src/kit/Stage.tsx`（纸 #F4F1EA、墨 #15171C、朱红 #E2461F 只做强调、宋体大标题、PingFang 正文），胸前卡片套 `src/kit/Card.tsx`，全屏套 `src/kit/Stage.tsx`。
