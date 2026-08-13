# dsh-plugin-miliastra-toolbox

DeepSeek Harness 插件：接入[千星沙箱知识库](https://ugc.070077.xyz)（原神千星奇域 UGC 编辑器的节点/指南/教程/FAQ，300+ 篇文档）。

## 这个插件是什么

可以让你在Deepseek harness对话里直接问千星沙箱的问题：

- 「角色实体和玩家实体有什么区别？」
- 「复杂造物怎么做定点位移？」
- 「我的碰撞触发器不触发是为什么？」
- 「奥黛塔的经典模式 ID 是？」

插件注册 4 个工具（模型会自动选用，不需要你指定）：

| 工具 | 用途 |
|------|------|
| `get_node_info` | 按节点名查功能、参数、归属端（服务端/客户端/双端）与来源文档 |
| `list_documents` | 按关键词列出文档标题（不含正文），不确定文档名时先看有哪些 |
| `get_document` | 按标题获取官方文档全文 |
| `rag_search` | 自然语言语义检索文档片段，适合开放问题与排障 |

插件还注册同名技能 `miliastra-knowledge`：模型看到匹配的问题会先加载技能正文，按其中的指引（选工具优先级、批量原则、输出规范）使用工具。也可以主动说「用 miliastra-knowledge 技能查一下」，或发送 `/miliastra-knowledge`。

## 怎么集成到 DeepSeek Harness 里

前置条件：已安装[Deepseek Harness](https://github.com/deepseek-ai/deepseek-harness)，要求环境 Node 22.19+

### Quick start

**方式一：bundle 安装（推荐，官方 `dsh plugin` 工作流）**。一条命令安装进 profile 并持久化（自动追加 bundle 层，每次启动生效）：

```sh
# 从本仓库安装（建议固定 commit：#<sha>，参见下方说明）
dsh plugin --profile web add github:1475505/dsh-plugin-miliastra-toolbox

# 或本地路径（开发时）
dsh plugin --profile web add /path/to/dsh-plugin-miliastra-toolbox

dsh web   # 启动即带插件
```

卸载：`dsh plugin --profile web remove dsh-plugin-miliastra-toolbox`。

**方式二：临时挂载（`--patch`）**。不改动任何配置，仅本次启动生效；插件路径必须是绝对路径：

```sh
dsh web --patch /path/to/dsh-plugin-miliastra-toolbox/cordis.yml
dsh --profile headless --patch /path/to/dsh-plugin-miliastra-toolbox/cordis.yml "嘲讽目标节点的参数是什么"
```

从 GitHub 安装说明：git 安装获取的是源码而不是构建产物，本插件入口直接是 `src/index.ts`（由 dsh 运行时通过 TS 加载器处理，没有 `prepare`/`build` 脚本），因此无需额外的构建放行配置。建议固定 commit（`github:1475505/dsh-plugin-miliastra-toolbox#<sha>`），避免后续推送改变你信任的代码。

### 配置项

在 profile 的 `cordis.patch.yml` 里覆盖插件行配置（不需要可跳过）：

```yaml
- insert:
    - id: miliastra-knowledge
      name: dsh-plugin-miliastra-toolbox
      config:
        baseUrl: 'https://ugc.070077.xyz'  # 知识库服务器地址
        timeoutMs: 30000                    # 单次工具调用的超时预算（毫秒）
```

### 备选：纯 Skill 集成（不安装插件）

技能文件由上游维护，位于 [Miliastra-toolbox 仓库的 `skills/miliastra-knowledge`](https://github.com/1475505/Miliastra-toolbox/tree/main/skills/miliastra-knowledge)（`SKILL.md` + `references/tools.md`）。Harness 原生支持 SKILL.md 技能（`dsh-skill-filesystem` 扫描项目与用户技能根），集成流程：

1. **获取技能目录**（任选其一）：
   ```sh
   # 方式一：克隆上游仓库后取目录
   git clone --depth 1 https://github.com/1475505/Miliastra-toolbox.git /tmp/miliastra-upstream
   # 方式二：直接下载两个文件
   mkdir -p /tmp/miliastra-knowledge/references
   curl -o /tmp/miliastra-knowledge/SKILL.md \
     https://raw.githubusercontent.com/1475505/Miliastra-toolbox/main/skills/miliastra-knowledge/SKILL.md
   curl -o /tmp/miliastra-knowledge/references/tools.md \
     https://raw.githubusercontent.com/1475505/Miliastra-toolbox/main/skills/miliastra-knowledge/references/tools.md
   ```
2. **复制到任一技能根**（rank 顺序：`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`~/.dsh/skills`、`~/.agents/skills`；也可用 `dsh-skill-filesystem` 的 `customSkillDirs` 配置自定义目录）：
   ```sh
   mkdir -p ~/.agents/skills
   cp -r /tmp/miliastra-knowledge ~/.agents/skills/
   ```
3. **启动 dsh**：`dsh web`（或 headless）。模型在技能目录中看到 `miliastra-knowledge`，匹配问题时会先加载技能正文，按其中的 HTTP 调用方式 curl 请求知识库 API，并按需读取 `references/tools.md`（参数表、关键词表）。
4. **使用**：直接提问千星沙箱问题；或消息里带 `/miliastra-knowledge` 注入技能正文。

注意：本插件与纯 Skill 都注册同名技能 `miliastra-knowledge`，技能注册表按 rank 二选一，不要同时启用。

**知识库 API 端点**：https://ugc.070077.xyz

两种方式对比：

| | 插件（本仓库） | 纯 Skill |
|---|---|---|
| 调用方式 | 4 个原生工具，schema 校验、超时、无需 curl | 模型自行 curl（需要 bash 能力） |
| 技能正文 | 本仓库双模版 `skill.md`（原生工具优先、curl 兜底） | 上游原版（`skills/miliastra-knowledge`） |
| 依赖 | dsh-tools/dsh-skill/schemastery | 无 |

## 文件结构

```
dsh-plugin-miliastra-toolbox/
├── src/
│   ├── index.ts      插件入口：导出 name/inject/Config/apply，注册 4 个工具和技能
│   ├── http.ts       知识库 Skill API 客户端：POST 调用、信封解包、信号取消
│   ├── tools.ts      4 个工具定义（defineTool）：参数 schema、语义校验、超时、并发声明
│   └── skill.ts      读取 skill.md 并注册为运行时技能
├── skill.md          模型侧使用指引（基于上游 mcp/SKILL.md 的双模版：插件工具优先、HTTP curl 兜底）
├── cordis.yml        bundle patch：插件行声明，dsh plugin add 时作为 bundle 层插入
├── package.json      包清单：dsh.bundle 声明、registry 依赖、入口指向 src/index.ts
├── pnpm-lock.yaml    依赖锁定，保证可复现安装
├── pnpm-workspace.yaml  发布年龄豁免（minimumReleaseAgeExclude）
├── .gitignore        排除 node_modules 等
└── README.md         本文档
```

## 注意事项

- 工具名未加前缀，与上游 SKILL.md 保持一致；与其他插件重名时需要改名并同步 `skill.md`。
- 工具结果是知识库 API 的原样 JSON（`data.result` 解包后），字段含义由技能正文向模型说明。
- 依赖：`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-skill`、`@deepseek-ai/schemastery` 取 npm registry 的 `0.1.0-rc.6` 线；`@deepseek-ai/cordis` 是 peerDependency，由宿主 dsh 提供（`^4.0.1`）。

## 上游与贡献

知识工具由 [Miliastra-toolbox](https://github.com/1475505/Miliastra-toolbox) 维护，本插件只是消费方，不拥有知识库：

- 节点说明、官方指南/教程/FAQ 与社区经验由该仓库的 `knowledge/` 管线构建（爬虫抓取原始文档、`process_docs.py` 派生结构化索引）。
