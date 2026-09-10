# ShotCraft 必须落实到 React / Remotion

本口播流程的图形、插图和动效必须用 React 组件和 Remotion Composition 制作。ShotCraft 既负责规划，也提供实际镜头实现；不能只借用卡名、视觉概念或缓动参数，再用 Canvas/Pillow/HTML 动画/HyperFrames 重写。调用 `@remotion/renderer.openBrowser`、安装 npm 包、渲染一个空 Composition 都不能证明完成了要求。

## 在制作时约束，而不是交付后补证据

1. 预填 plan 时，为每个 `图形与动效` 镜头写 `engine: react-remotion`。缺失或替换引擎会被 `visual-spec` 拦截。静态插图也是 React / Remotion still；真实截图、录屏 B-roll 的采集与 FFmpeg 裁切不受此限制，不得把自制动画伪装为 B-roll。
2. 开始写动画前，读 ShotCraft 的准确 card/demo，并读取已安装的 `remotion:remotion-best-practices` 及其相关实现指南。建项目，安装 React、Remotion 和所需依赖并生成 lockfile。这由 Agent 执行，不需要用户安装桌面软件。缺依赖应安装或修复；不能擅自更换引擎。
3. 直接复制/引入准确 TSX demo 并适配真实素材、右侧尺寸和口播时间轴。逐镜头记录复用了哪个组件/函数、保留了哪些运动关系、做了哪些改动。无适合 card 时可按 ShotCraft 自由设计 React / Remotion 实现，但仍须明确理由；`custom` 不是换引擎许可。
4. 实现骨架后、批量写镜头和任何预览渲染前，运行下面的 `check`。所有项目源码、配置、props、字体/图片等依赖必须列入哈希输入；本地源代码不得在输入清单之外偷偷替换。
5. 所有图形预览与正式图层通过固定 runner 的 `still` / `render` 生成。runner 只执行项目内 Remotion CLI 的注册 Composition，不接受任意 shell 命令。它在成功渲染后写回执；不得手写成功回执。预览在 H2 前允许，正式 render 先校验 H2。
6. 将真实 Remotion 图层与口播合成；FFmpeg 仅负责视频裁切、音频、字幕、图层叠加和最终编码。预览、正式合成都必须使用回执对应的图层，不能渲染一份合规空壳，再拿 Canvas 替身交付。预览每点绑定 Remotion 产物；正式 delivery 另绑定 production 回执。

## 实现输入与调用

`workflow-evidence.json` 增加 `stages.visual-implementation.inputs`，仍为命名输入 `{path,sha256}`：

- `contract`：以下 JSON。
- `package`：独立子目录中实际工程 package.json，dependencies 含 react/react-dom/remotion/@remotion/cli；工程目录与产物目录分开。
- `lock`：实际依赖锁文件。
- `entry`：调用 registerRoot 的工程入口。
- 每个组件、Root/Composition 注册、config、props 和资产各有一个输入名。

```json
{
  "engine": "react-remotion",
  "shots": {
    "V01": {
      "composition": "Visual01",
      "duration_frames": 240,
      "sources": ["root", "component:V01"],
      "demo_sha256": "对应 visual-spec 的 demo:V01 文件哈希",
      "preserved": "从准确 Demo.tsx 复制的组件/函数及保留的运动关系",
      "adaptations": "右侧画幅、文字、真实数据与时间轴的具体适配"
    }
  }
}
```

时间/props 在工程源码中确定，命令行不允许临时覆盖成另一版本。对纯 B-roll 项目无需假造 Remotion 工程。

runner 会自动哈希整个工程目录的文件（排除 node_modules、.git 和 .remotion），包含漏登记的 Root/组件/config/public 资产，防止普通漏登记让旧回执继续有效。相对导入应留在该工程内；工程外源文件/资产必须显式登记，不能使用未受管的外部动态源码。输出与回执放在工程目录外。TS 工程包含有效 tsconfig.json，浏览器路径等配置写在受哈希管理的 remotion.config.ts。

```bash
python3 scripts/remotion_execution.py check <project>
python3 scripts/remotion_execution.py still <project> --shot V01 --frame 45 --out <project>/analysis/visual-preview/v1/V01.png --receipt <project>/analysis/visual-preview/v1/V01-still.json --output-input layer:V01
python3 scripts/remotion_execution.py render <project> --shot V01 --purpose preview --out <project>/analysis/visual-preview/v1/V01.mp4 --receipt <project>/analysis/visual-preview/v1/V01-render.json --output-input clip:V01
# H2 批准之后：
python3 scripts/remotion_execution.py render <project> --shot V01 --purpose production --out <project>/qa/visuals/V01-v1.mp4 --receipt <project>/qa/visuals/V01-v1-receipt.json --output-input layer:V01
```

在 `visual-preview.inputs` / `delivery.inputs` 中登记对应产物及回执，额外加入 `remotion_receipts` JSON 文件，其内容如 `{"V01":["receipt:V01"]}`，值为该阶段已登记的回执输入名。回执的 `output_input` 必须指向该阶段登记的真实渲染输出。每个图形镜头至少一份回执；代表样片仍必须另外提交带原声完整合成片。`present-spec` 和预览生成器校验 preview 回执；delivery 校验 production 回执。改工程使旧回执失效，必须重新渲染。

每个 comparison 与 sample 写 `remotion_inputs: ["layer:V01"]`（或实际输出输入名），delivery 的 `frames.shots.V01` 同样写此字段。检查器要求它指向该镜头成功回执对应的产物；不能只是并列附上无关 Remotion 文件。该引用表达实际合成依赖，审核者需对照合成命令/实现与实际画面核验，字段本身不证明像素来源。

普通图层输出 MP4；需要透明动画时输出 `.mov`，runner 固定用 ProRes 4444 + yuva444p10le，或在 Remotion 内完成整幅合成。不要为透明叠加改回另一套动画引擎。

## 能保证什么

固定 runner 让正常执行路径从一开始就是 Remotion，并阻止缺工程、缺准确 demo 对应、缺真实输出或沿用旧回执的交接。它不是限制 Agent 所有工具的全局沙箱；源码关键字和生产者可写回执也不是不可伪造证明。不得宣称恶意绕过不可能。独立审核仍须检查实际组件复用与最终合成确实来自这些输出，不能仅看 `engine` 字段便判通过。

换引擎是对用户制作要求的变更，Agent 不能自行批准，也不能把用户“视觉效果 approve”解释成同意换引擎。当前 workflow 无自动降级入口。历史已交付视频保留真实实现记录，不补造 Remotion 回执；重做须按新合同实际实现。
