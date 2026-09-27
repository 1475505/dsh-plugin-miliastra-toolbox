# dsh-plugin-miliastra-toolbox

在 DeepSeek Harness 里直接问[千星沙箱](https://ugc.070077.xyz)（原神千星奇域 UGC 编辑器）的问题：节点用法与参数、官方指南 / 教程 / FAQ、玩法排障。覆盖 300+ 篇官方文档，另含 10 篇客户端控件与客户端脚本（lua）文档。

```sh
dsh plugin --profile web add github:1475505/dsh-plugin-miliastra-toolbox
dsh web
```

## 能问什么

装好之后，正常聊天就行，问法不用特殊：

- 「角色实体和玩家实体有什么区别？」
- 「复杂造物怎么做定点位移？」
- 「我的碰撞触发器不触发是为什么？」
- 「嘲讽目标节点的参数是什么？」
- 「奥黛塔的经典模式 ID 是？」
- 「预设按钮控件的四种状态怎么配？」（2D + lua 场景）

**和直接问模型有什么不同**：答案取自知识库原文，不是模型的记忆。查节点会附上**归属端**（服务端 / 客户端 / 双端）和来源文档路径；查文档返回正文全文，可以自己核对。版本更新过的内容也不会答成旧版。

## 安装

### 前置条件

- 已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，Node 22.19+
- 能访问知识库 `https://ugc.070077.xyz`

### 方式一：装成插件（推荐）

一条命令写进 profile，之后每次启动自动生效：

```sh
# 从本仓库安装（建议固定 commit：#<sha>）
dsh plugin --profile web add github:1475505/dsh-plugin-miliastra-toolbox

# 本地路径（开发调试时）
dsh plugin --profile web add /path/to/dsh-plugin-miliastra-toolbox

dsh web   # 启动即带插件
```

卸载：

```sh
dsh plugin --profile web remove dsh-plugin-miliastra-toolbox
```

### 方式二：临时试一下（不改动任何配置）

仅本次启动生效，插件路径必须是绝对路径：

```sh
dsh web --patch /path/to/dsh-plugin-miliastra-toolbox/cordis.yml
dsh --profile headless --patch /path/to/dsh-plugin-miliastra-toolbox/cordis.yml "嘲讽目标节点的参数是什么"
```

## 装进来了什么

### 6 个工具

模型会自动选用，不需要你指定名字。

| 工具 | 用途 |
|------|------|
| `get_node_info` | 按节点名查功能、参数、归属端（服务端 / 客户端 / 双端）与来源文档 |
| `list_documents` | 按关键词列出文档标题（不含正文），不确定文档名时先看有哪些 |
| `get_document` | 按标题获取官方文档全文 |
| `rag_search` | 自然语言语义检索文档片段，适合开放问题与排障 |
| `list_client_documents` | 按关键词列出客户端控件 / 客户端脚本文档标题，**仅 2D + lua 场景** |
| `get_client_document` | 按标题获取客户端控件 / 客户端脚本文档全文，**仅 2D + lua 场景** |

### 2 个技能（按场景分流）

- **`miliastra-knowledge`（通用）**：服务端节点图、系统配置、排障。模型遇到相关问题会先加载技能正文，按其中的指引（工具选型、批量原则、输出规范）调用工具。**不涉及客户端工具**。
- **`miliastra-knowledge-lua`（仅 2D + lua 脚本）**：客户端控件与客户端脚本（lua）编程，是 `list_client_documents` / `get_client_document` 的唯一入口。

也可以主动指定：「用 miliastra-knowledge-lua 技能查一下」，或发送 `/miliastra-knowledge-lua`。

> 为什么要分两个：服务端节点图和客户端 lua 编程是两套完全不同的 API 与概念。分开注册可以让通用问题不加载 lua 语料，避免模型在错误的语料里找答案。

## 配置

在 profile 的 `cordis.patch.yml` 里覆盖插件行配置（不需要可跳过）：

```yaml
- insert:
    - id: miliastra-knowledge
      name: dsh-plugin-miliastra-toolbox
      config:
        baseUrl: 'https://ugc.070077.xyz'  # 知识库服务器地址
        timeoutMs: 30000                    # 单次工具调用的超时预算（毫秒）
        clientTools: true                   # 是否注册仅客户端 lua 场景的 2 个工具（list/get_client_document）
```

`clientTools: false` 适合只做服务端玩法、完全不需要 lua 文档的场景——这 2 个工具会彻底不注册。

## 常见问题

**查节点查不到，但文档里明明有？**
`get_node_info` 只索引**节点图节点**；编辑器**组件**和概念 / 功能章节不在其中（例如「投射运动器」是组件）。这类内容用 `get_document` 或 `list_documents`。

**`get_document` 只返回了一串标题？**
单个关键词命中超过 5 篇时会返回 `status: too_many` 和标题列表，换更精确的关键词重查即可。

**`list_client_documents` 一直返回空？**
它读的是服务端 `knowledge/Miliastra-knowledge/client/` 目录（10 篇）。这个目录如果没同步到部署环境就会恒空——属于部署问题，不是你的用法问题，见 [#2](https://github.com/1475505/dsh-plugin-miliastra-toolbox/issues/2)。

**答案里有重复条目或标题末尾带 `\`？**
上游知识库的数据质量问题（同一节点挂在多个章节下会重复返回），已记录在 [#2](https://github.com/1475505/dsh-plugin-miliastra-toolbox/issues/2)。插件按设计原样透传 API 返回，不在客户端侧改写。

## 进阶：不装插件，只用技能

不安装插件也能用——Harness 原生支持 SKILL.md 技能，由模型自行 curl 知识库 API（需要 bash 能力）。技能文件由上游维护：[通用](https://github.com/1475505/Miliastra-toolbox/tree/main/skills/miliastra-knowledge) 与 [客户端 lua 场景](https://github.com/1475505/Miliastra-toolbox/tree/main/skills/miliastra-knowledge-lua)，各含 `SKILL.md` + `references/tools.md`。

1. **取技能目录**（任选其一）：
   ```sh
   # 方式一：克隆上游仓库后取目录
   git clone --depth 1 https://github.com/1475505/Miliastra-toolbox.git /tmp/miliastra-upstream
   # 方式二：直接下载通用技能（客户端 lua 场景把路径换成 miliastra-knowledge-lua）
   mkdir -p /tmp/miliastra-knowledge/references
   curl -o /tmp/miliastra-knowledge/SKILL.md \
     https://raw.githubusercontent.com/1475505/Miliastra-toolbox/main/skills/miliastra-knowledge/SKILL.md
   curl -o /tmp/miliastra-knowledge/references/tools.md \
     https://raw.githubusercontent.com/1475505/Miliastra-toolbox/main/skills/miliastra-knowledge/references/tools.md
   ```
2. **放进任一技能根**（rank 顺序：`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`~/.dsh/skills`、`~/.agents/skills`；也可用 `dsh-skill-filesystem` 的 `customSkillDirs` 自定义）：
   ```sh
   mkdir -p ~/.agents/skills
   cp -r /tmp/miliastra-knowledge ~/.agents/skills/
   ```
3. **启动 dsh**，直接提问；或消息里带 `/miliastra-knowledge` 注入技能正文。

两种方式对比：

| | 插件（本仓库） | 纯 Skill |
|---|---|---|
| 调用方式 | 6 个原生工具，schema 校验、超时、无需 curl | 模型自行 curl（需要 bash 能力） |
| 技能正文 | 本仓库双模版 `skill.md` + `skill-lua.md`（原生工具优先，curl 兜底） | 上游双技能 `skills/miliastra-knowledge` + `skills/miliastra-knowledge-lua`（纯 curl） |
| 依赖 | dsh-tools / dsh-skill / schemastery | 无 |

注意：

- 两种方式都注册同名技能 `miliastra-knowledge`，技能注册表按 rank 二选一，**不要同时启用**。
- 场景划分一致：通用技能不含客户端工具，客户端工具只出现在 `miliastra-knowledge-lua`。纯客户端 lua 开发者可以只装后者。

## 开发者

### 构建

```sh
pnpm build    # tsdown：src/ → lib/index.js
```

入口必须是构建产物 `lib/index.js`：宿主 dsh 用 Node 直接 `import` 插件包，而 Node 对 `node_modules` 下的 `.ts` 文件禁用类型剥离（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`），所以不能把 `main` 指回 `src/index.ts`。**改动 `src/` 后请务必运行 `pnpm build` 并提交新的 `lib/index.js`**，否则发布产物与源码不一致。

### 文件结构

```
dsh-plugin-miliastra-toolbox/
├── src/
│   ├── index.ts      插件入口：导出 name/inject/Config/apply，注册 6 个工具（clientTools 可关掉 2 个客户端工具）和 2 个技能
│   ├── http.ts       知识库 Skill API 客户端：POST 调用、信封解包、信号取消
│   ├── tools.ts      6 个工具定义（defineTool）：参数 schema、语义校验、超时、并发声明
│   └── skill.ts      读取 skill.md 与 skill-lua.md，注册两个运行时技能（按场景分流）
├── skill.md          模型侧使用指引·通用场景（基于上游 skills/miliastra-knowledge/SKILL.md 的双模版：插件工具优先、HTTP curl 兜底），不含客户端工具
├── skill-lua.md      模型侧使用指引·仅 2D+lua 场景（客户端控件与客户端脚本文档），是客户端工具的唯一技能入口
├── cordis.yml        bundle patch：插件行声明，dsh plugin add 时作为 bundle 层插入
├── tsdown.config.ts  tsdown 打包配置：src/ → lib/index.js（单文件 ESM，依赖保持 external）
├── lib/index.js      build 产物（已提交仓库，git/本地安装无需构建即可加载）
├── package.json      包清单：dsh.bundle 声明、registry 依赖、入口指向 lib/index.js
├── pnpm-lock.yaml    依赖锁定，保证可复现安装
├── pnpm-workspace.yaml  发布年龄豁免（minimumReleaseAgeExclude）
└── .gitignore        排除 node_modules 等
```

### 其它约定

- 工具名未加前缀，与上游 SKILL.md 保持一致；与其他插件重名时需要改名并同步两个技能正文。
- 工具结果是知识库 API 的原样 JSON（`data.result` 解包后），字段含义由技能正文向模型说明。
- 客户端工具（`list_client_documents` / `get_client_document`）是**技能级软隔离**：dsh 的工具注册表没有"按场景隐藏工具"的机制（`restrict` 需要 `agent.ctx`，插件侧拿不到），靠 `miliastra-knowledge-lua` 技能指引调用；要彻底不注册可设 `clientTools: false`。
- 依赖：`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-skill`、`@deepseek-ai/schemastery` 取 npm registry 的 `0.1.0-rc.6` 线；`@deepseek-ai/cordis` 是 peerDependency，由宿主 dsh 提供（`^4.0.1`）。

## 上游与贡献

知识工具由 [Miliastra-toolbox](https://github.com/1475505/Miliastra-toolbox) 维护，本插件只是消费方，**不拥有知识库**——内容问题（抓取遗漏、噪声、重复）请提到上游仓库或本仓库的 [issue](https://github.com/1475505/dsh-plugin-miliastra-toolbox/issues)。

- 节点说明、官方指南 / 教程 / FAQ 与社区经验由该仓库的 `knowledge/` 管线构建（爬虫抓取原始文档、`process_docs.py` 派生结构化索引）。
- 客户端控件 / 客户端脚本文档（`knowledge/Miliastra-knowledge/client/`，10 篇）同样由该仓库维护，插件通过 Skill API 的 `list_client_documents` / `get_client_document` 两个仅对外端点消费。

**知识库 API 端点**：https://ugc.070077.xyz
