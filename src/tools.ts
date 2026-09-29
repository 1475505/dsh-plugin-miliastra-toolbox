import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { callSkillApi, type SkillApiClient } from './http.ts'

/**
 * Reject empty required lists and blank entries; the DSL validates types but
 * not these semantic constraints, and the server cannot answer an empty query.
 */
function requireQueries(values: string[], field: string): void {
  if (values.length === 0 || values.some((value) => value.trim().length === 0)) {
    throw new Error(`${field} must list at least one non-empty entry`)
  }
}

/**
 * Register the miliastra-knowledge Skill API endpoints as native tools: the
 * four general ones always, and the two client-only ones gated by
 * `includeClientTools` (owned by the `miliastra-knowledge-lua` skill). Each
 * returns the unwrapped API payload as its canonical JSON value; the Native
 * renderer shows that JSON verbatim, and the skills teach the model how to
 * route between the tools.
 */
export function registerMiliastraTools(ctx: Context, client: SkillApiClient, timeoutMs: number, includeClientTools: boolean): void {
  ctx.tools.register(defineTool({
    name: 'get_node_info',
    description:
      '查询千星沙箱（原神千星奇域 UGC 编辑器）节点的用法：功能、参数、归属端（server 服务端 / client 客户端 / both 双端）与来源文档。按节点标题子串匹配，可批量查询多个节点。仅索引节点图节点，编辑器组件与概念/功能章节请改用 get_document 或 list_documents。',
    parameters: {
      names: {
        type: 'array',
        items: { type: 'string' },
        required: true,
        description: '节点名称列表。命中条件为节点标题包含该连续子串，不区分大小写，因此查询词越短命中范围越宽；不支持跨词子序列。多个节点合并为一次调用。本工具仅索引节点图节点，编辑器组件请改用 get_document。',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      requireQueries(args.names, 'names')
      return await callSkillApi(client, 'get_node_info', { names: args.names }, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'list_documents',
    description:
      '列出千星沙箱知识库中的文档标题（官方指南/教程/FAQ，不含正文）。不知道精确文档名时先用它浏览有哪些文档；不传 keywords 时列出全部 300+ 篇文档。不含客户端控件/客户端脚本文档——那是 list_client_documents 的职责。',
    parameters: {
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '过滤关键词列表，对标题和文件名做模糊匹配，多个关键词按关键词分组返回；省略或传空列表时返回全部文档。',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (args.keywords !== undefined) requireQueries(args.keywords, 'keywords')
      const body = args.keywords === undefined ? {} : { keywords: args.keywords }
      return await callSkillApi(client, 'list_documents', body, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'get_document',
    description:
      '按标题获取千星沙箱官方文档全文，支持模糊匹配与批量获取。单个关键词命中超过 5 篇时只返回标题列表（status 为 too_many），需换更精确的关键词重查。不含客户端控件/客户端脚本文档——用 get_client_document。',
    parameters: {
      titles: {
        type: 'array',
        items: { type: 'string' },
        required: true,
        description: '文档标题或关键词列表，支持模糊匹配；多篇相关文档一次批量获取。',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      requireQueries(args.titles, 'titles')
      return await callSkillApi(client, 'get_document', { titles: args.titles }, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rag_search',
    description:
      '对千星沙箱知识库做自然语言语义检索，返回相关文档片段（含相似度 similarity 与来源文档）。适合开放问题与「为什么不触发/不生效」类排障；能用节点名或文档名直接定位时优先用 get_node_info / get_document。仅覆盖服务端语料，客户端语料请用 list_client_documents / get_client_document。',
    parameters: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        required: true,
        description: '自然语言问题或描述列表，越具体越精准；多个独立问题合并为一次调用。',
      },
      top_k: {
        type: 'integer',
        description: '每个查询最多返回的结果条数，范围 1–20，默认 5。',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      requireQueries(args.queries, 'queries')
      if (args.top_k !== undefined && (args.top_k < 1 || args.top_k > 20)) {
        throw new Error('top_k must be between 1 and 20')
      }
      const body = args.top_k === undefined ? { queries: args.queries } : { queries: args.queries, top_k: args.top_k }
      return await callSkillApi(client, 'rag_search', body, exec.signal)
    },
  }))

  if (includeClientTools) {
    ctx.tools.register(defineTool({
      name: 'list_client_documents',
      description:
        '列出千星奇域客户端控件/客户端脚本（lua）文档标题（不含正文），仅用于 2D + lua 脚本游戏制作场景。服务端节点图与玩法逻辑问题用 list_documents，不要用本工具。',
      parameters: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: '过滤关键词列表，对标题和文件名做模糊匹配，多个关键词按关键词分组返回；省略或传空列表时返回全部 10 篇客户端文档。',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      timeoutMs,
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        if (args.keywords !== undefined) requireQueries(args.keywords, 'keywords')
        const body = args.keywords === undefined ? {} : { keywords: args.keywords }
        return await callSkillApi(client, 'list_client_documents', body, exec.signal)
      },
    }))

    ctx.tools.register(defineTool({
      name: 'get_client_document',
      description:
        '按标题获取千星奇域客户端控件/客户端脚本（lua）文档全文，支持模糊匹配与批量获取，仅用于 2D + lua 脚本游戏制作场景。单个关键词命中超过 5 篇时只返回标题列表（status 为 too_many），需换更精确的关键词重查。',
      parameters: {
        titles: {
          type: 'array',
          items: { type: 'string' },
          required: true,
          description: '客户端文档标题或关键词列表，支持模糊匹配；多篇相关文档一次批量获取。',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      timeoutMs,
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        requireQueries(args.titles, 'titles')
        return await callSkillApi(client, 'get_client_document', { titles: args.titles }, exec.signal)
      },
    }))
  }
}
