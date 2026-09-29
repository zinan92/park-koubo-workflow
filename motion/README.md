# park-motion：口播动效镜头库

每个镜头是一张 [ShotCraft](https://github.com/Vincentwei1021/video-shotcraft) 镜头卡改编成的 React/Remotion 组件：竖屏 1080×1920、纸墨配色、中文、透明背景，
渲染成 ProRes 4444 图层叠到口播原片上。怎么挑镜头、Park 定的规矩见 [references/motion-director.md](../references/motion-director.md)。

- `src/kit/`：`Stage`（全屏底板，整屏盖满）、`Card`（胸前卡片）、样式 token、缓动、`time.ts`（绝对秒 → 帧）
- `src/shots/`：镜头组件，全部 props 化（`t0` + 内容 + 口播绝对秒的 cue）
- `src/catalog/`：注册表，每个镜头的尺寸（chest/full）、改编自哪张卡、`use`（什么时候用）——导演挑镜头看这里
- `src/shots.json`：本条视频的镜头数据（仓库里是空的；每条视频在自己的工程里写）
- `examples/`：做过的视频的镜头数据（第一条：2026-09-28《99% 的自媒体人都在追求流量》第二版，57 个镜头）
- `tools/sandbox.sh`：用指定 shots 数据在临时目录打包，不碰 src/shots.json（改库时做回归用）

脚本在 `../scripts/motion/`：`new_project.py`（给视频建工程）→ `words.py`（词级时间）→ `shoot_doc.py`（交付文件截长图并遮客户信息）→ `timeline.py`（合并检查）→ `render.sh`（渲染图层）→ `composite.py`（出样片 / 合成整条）。

依赖：`npm ci`（React 19.2.7、Remotion 4.0.484，和 ShotCraft workbench 同版本）。
