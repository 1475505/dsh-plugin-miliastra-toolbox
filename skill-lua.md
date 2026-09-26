# 千星奇域客户端脚本（lua）知识库查询

仅覆盖千星奇域 **2D + lua 脚本游戏制作**（客户端 UI 编程）语料：客户端控件与客户端脚本文档，共 10 篇。

服务端节点图、玩法逻辑、系统配置与排障问题不用本技能，改用 `miliastra-knowledge`。

## 调用方式

知识库通过 2 个工具提供：`list_client_documents`、`get_client_document`。

- **有同名原生工具（插件模式）**：直接调用工具，参数与返回字段以工具 schema 为准；工具返回的就是知识库 API 的 JSON 结果（`data.result`），无需自行发起 HTTP 请求。
- **无工具环境（纯 Skill/curl 模式）**：通过 HTTP Skill API 调用，JSON 请求体：

  ```
  POST https://ugc.070077.xyz/api/v1/skills/miliastra-knowledge/tools/<工具名>
  ```

  响应统一包裹为 `{ "success": true, "data": { "result": ... }, "error": null }`，取 `data.result`。

## 什么时候用

- 用户进行千星奇域 2D + lua 脚本游戏制作（客户端界面/控件编程）
- 询问客户端控件的功能与配置：客户端控件容器、文本视窗控件、预设按钮控件、按键提示控件、光标检测区域控件、网格视窗控件、模板引用控件、容器节点控件
- 询问客户端脚本（lua）如何挂载到控件、如何调用、与控件如何交互
- 需要查客户端控件 API 文档中的脚本接口与参数

## 工具一览

| 工具 | 职责 |
|------|------|
| `list_client_documents` | 按关键词列出客户端控件/脚本文档标题（不含正文）；不知道精确文档名时先看有哪些 |
| `get_client_document` | 按标题获取客户端控件/脚本文档全文；支持模糊匹配与批量获取 |

客户端语料仅 10 篇，结构化工具即可覆盖，**不提供也不需要使用 `rag_search`**。

## 怎么选工具

1. **不确定文档名 / 想浏览有哪些客户端文档** → `list_client_documents(keywords=[关键词])`（不传 `keywords` 列出全部 10 篇）
2. **已知控件/文档名，要完整内容** → `get_client_document(["控件名"])`

**批量原则：多个独立查询合并为一次调用**（两个工具均支持列表入参），不要拆成多轮单条调用，也不要重复相同调用。

## 常见调用顺序

**调研某个客户端控件**（如预设按钮怎么做）：
```
list_client_documents(["预设按钮"]) → get_client_document(["预设按钮控件"])
```

**写 lua 脚本查 API**：
```
get_client_document(["客户端控件API文档"]) → 按其中的接口说明作答
```

**从零搭建 2D 界面**：
```
get_client_document(["客户端控件容器"]) → list_client_documents(["控件"]) → get_client_document([具体控件名])
```

## 异常处理

- `get_client_document` 返回 `status="not_found"` → 先 `list_client_documents` 找候选标题再重查
- `get_client_document` 返回 `status="too_many"` → 用更精确的关键词重查
- `list_client_documents` 无结果 → 换更短/更通用的关键词（如「控件」「脚本」「API」）
- 工具调用报错（HTTP 错误、超时等）→ 换等价关键词重试一次；仍失败则明确告知用户知识库不可用

## 输出规范

- 控件类回答：说明功能、关键配置项、可挂载的客户端脚本调用方式，并注明来源文档
- API 类回答：给出接口名、参数与用法；**严格区分"文档原文已说明"与"基于资料的推测建议"**
- 不得编造控件名、接口名或官方结论；查不到就明确说查不到，并建议用户换个问法
