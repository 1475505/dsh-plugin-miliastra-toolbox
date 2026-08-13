import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
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
 * Register the four miliastra-knowledge Skill API endpoints as native tools.
 * Each returns the unwrapped API payload as its canonical JSON value; the
 * Native renderer shows that JSON verbatim, and the `miliastra-knowledge`
 * skill teaches the model how to route between the tools.
 */
export function registerMiliastraTools(ctx: Context, client: SkillApiClient, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'get_node_info',
    description:
      '查询千星沙箱（原神千星奇域 UGC 编辑器）节点的用法：功能、参数、归属端（server 服务端 / client 客户端 / both 双端）与来源文档。按节点名模糊匹配，可批量查询多个节点。',
    parameters: {
      names: {
        type: 'array',
        items: { type: 'string' },
        required: true,
        description: '节点名称列表。支持子串/子序列模糊匹配（如「运动器」命中「投射运动器」），不区分大小写；多个节点合并为一次调用。',
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
      return await callSkillApi(client, 'get_node_info', { names: args.names }, exec.signal) as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'list_documents',
    description:
      '列出千星沙箱知识库中的文档标题（官方指南/教程/FAQ，不含正文）。不知道精确文档名时先用它浏览有哪些文档；不传 keywords 时列出全部 300+ 篇文档。',
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
      return await callSkillApi(client, 'list_documents', body, exec.signal) as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'get_document',
    description:
      '按标题获取千星沙箱官方文档全文，支持模糊匹配与批量获取。单个关键词命中超过 5 篇时只返回标题列表（status 为 too_many），需换更精确的关键词重查。',
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
      return await callSkillApi(client, 'get_document', { titles: args.titles }, exec.signal) as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'rag_search',
    description:
      '对千星沙箱知识库做自然语言语义检索，返回相关文档片段（含相似度 similarity 与来源文档）。适合开放问题与「为什么不触发/不生效」类排障；能用节点名或文档名直接定位时优先用 get_node_info / get_document。',
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
      return await callSkillApi(client, 'rag_search', body, exec.signal) as JsonValue
    },
  }))
}
