# Park Koubo Workflow

## 现在在哪里

v2.7 增加针对 prefill、Hook 切片、视觉规格、渲染和交付的可执行证据关卡。
规格支持独立 Claude/Codex CLI 审核；成片必须另外做实际媒体审核。
这是受检执行入口，不是全局 Agent 沙箱。开发合同：[issue #3](https://github.com/zinan92/park-koubo-workflow/issues/3)。

## 下一步

在下一个视频项目接入 workflow-evidence.json，先跑规格审核再批准 H2。
当前 MacBook 的 Claude 需要刷新登录；Codex CLI 需要更新后再验证所配置模型。
若需要不能被生产 Agent 绕过的执行控制，另立合同部署独立 executor/approval store；本次不改全局配置或 Mac Mini。
