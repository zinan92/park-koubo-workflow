# Park Koubo Workflow

## 现在在哪里

v2.8 在 v2.7 制作关卡上补齐 Step 14 的标题、当前视频人脸封面、倍速版本与平台草稿版本检查。
规格支持独立 Claude/Codex CLI 审核；成片必须另外做实际媒体审核。
这是受检执行入口，不是全局 Agent 沙箱。开发合同：[issue #3](https://github.com/zinan92/park-koubo-workflow/issues/3)。

## 下一步

在下一个视频项目接入 workflow-evidence.json，先跑规格审核再批准 H2。
2026-09-08 的实测中 Claude 登录过期、Codex CLI 与所选模型版本不兼容；这些是历史探针，不代表今天的可用性。可先使用原生独立 reviewer，并准确记录实际执行方式。
若需要不能被生产 Agent 绕过的执行控制，另立合同部署独立 executor/approval store；本次不改全局配置或 Mac Mini。
