import Schema from "@deepseek-ai/schemastery";
import { readFileSync } from "node:fs";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/skill.ts
const skill = {
	name: "miliastra-knowledge",
	description: "查询千星沙箱（原神千星奇域 UGC 编辑器）知识库：节点用法与参数、官方指南/教程/FAQ 文档、语义检索。当用户询问千星沙箱节点（触发器、运动器、造物、仇恨、商店、背包等）、编辑器功能配置、\"为什么不触发/不生效\"类排障问题，或需要把玩法需求拆解为具体节点与参考文档时使用。",
	source: "runtime",
	content: readFileSync(new URL("../skill.md", import.meta.url), "utf8")
};
/**
* Register the runtime skill so the model discovers the routing guidance
* through the skill catalog and loads the full body on demand.
*/
function registerMiliastraSkill(ctx) {
	ctx.skills.register(skill);
}
//#endregion
//#region src/http.ts
/**
* Invoke one Skill API tool and unwrap its envelope.
*
* @param client - resolved plugin connection settings.
* @param tool - endpoint name, e.g. `get_node_info`.
* @param body - JSON request body forwarded verbatim.
* @param signal - aborts the in-flight request on tool cancellation.
* @returns the unwrapped `data.result` payload (`null` when absent).
* @throws On transport failure, non-2xx status, or a `success: false`
*   envelope, so the tool registry marks the call `isError`.
*/
async function callSkillApi(client, tool, body, signal) {
	const response = await fetch(`${client.baseUrl}/api/v1/skills/miliastra-knowledge/tools/${tool}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		body: JSON.stringify(body),
		signal
	});
	if (!response.ok) throw new Error(`miliastra-knowledge ${tool}: HTTP ${response.status}`);
	const envelope = await response.json();
	if (!envelope.success) {
		const detail = typeof envelope.error === "string" ? envelope.error : JSON.stringify(envelope.error);
		throw new Error(`miliastra-knowledge ${tool}: ${detail ?? "request rejected"}`);
	}
	return envelope.data?.result ?? null;
}
//#endregion
//#region src/tools.ts
/**
* Reject empty required lists and blank entries; the DSL validates types but
* not these semantic constraints, and the server cannot answer an empty query.
*/
function requireQueries(values, field) {
	if (values.length === 0 || values.some((value) => value.trim().length === 0)) throw new Error(`${field} must list at least one non-empty entry`);
}
/**
* Register the four miliastra-knowledge Skill API endpoints as native tools.
* Each returns the unwrapped API payload as its canonical JSON value; the
* Native renderer shows that JSON verbatim, and the `miliastra-knowledge`
* skill teaches the model how to route between the tools.
*/
function registerMiliastraTools(ctx, client, timeoutMs) {
	ctx.tools.register(defineTool({
		name: "get_node_info",
		description: "查询千星沙箱（原神千星奇域 UGC 编辑器）节点的用法：功能、参数、归属端（server 服务端 / client 客户端 / both 双端）与来源文档。按节点名模糊匹配，可批量查询多个节点。",
		parameters: { names: {
			type: "array",
			items: { type: "string" },
			required: true,
			description: "节点名称列表。支持子串/子序列模糊匹配（如「运动器」命中「投射运动器」），不区分大小写；多个节点合并为一次调用。"
		} },
		output: {
			schema: { type: "json" },
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value, null, 2)
			}]
		},
		timeoutMs,
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			requireQueries(args.names, "names");
			return await callSkillApi(client, "get_node_info", { names: args.names }, exec.signal);
		}
	}));
	ctx.tools.register(defineTool({
		name: "list_documents",
		description: "列出千星沙箱知识库中的文档标题（官方指南/教程/FAQ，不含正文）。不知道精确文档名时先用它浏览有哪些文档；不传 keywords 时列出全部 300+ 篇文档。",
		parameters: { keywords: {
			type: "array",
			items: { type: "string" },
			description: "过滤关键词列表，对标题和文件名做模糊匹配，多个关键词按关键词分组返回；省略或传空列表时返回全部文档。"
		} },
		output: {
			schema: { type: "json" },
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value, null, 2)
			}]
		},
		timeoutMs,
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			if (args.keywords !== void 0) requireQueries(args.keywords, "keywords");
			return await callSkillApi(client, "list_documents", args.keywords === void 0 ? {} : { keywords: args.keywords }, exec.signal);
		}
	}));
	ctx.tools.register(defineTool({
		name: "get_document",
		description: "按标题获取千星沙箱官方文档全文，支持模糊匹配与批量获取。单个关键词命中超过 5 篇时只返回标题列表（status 为 too_many），需换更精确的关键词重查。",
		parameters: { titles: {
			type: "array",
			items: { type: "string" },
			required: true,
			description: "文档标题或关键词列表，支持模糊匹配；多篇相关文档一次批量获取。"
		} },
		output: {
			schema: { type: "json" },
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value, null, 2)
			}]
		},
		timeoutMs,
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			requireQueries(args.titles, "titles");
			return await callSkillApi(client, "get_document", { titles: args.titles }, exec.signal);
		}
	}));
	ctx.tools.register(defineTool({
		name: "rag_search",
		description: "对千星沙箱知识库做自然语言语义检索，返回相关文档片段（含相似度 similarity 与来源文档）。适合开放问题与「为什么不触发/不生效」类排障；能用节点名或文档名直接定位时优先用 get_node_info / get_document。",
		parameters: {
			queries: {
				type: "array",
				items: { type: "string" },
				required: true,
				description: "自然语言问题或描述列表，越具体越精准；多个独立问题合并为一次调用。"
			},
			top_k: {
				type: "integer",
				description: "每个查询最多返回的结果条数，范围 1–20，默认 5。"
			}
		},
		output: {
			schema: { type: "json" },
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value, null, 2)
			}]
		},
		timeoutMs,
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			requireQueries(args.queries, "queries");
			if (args.top_k !== void 0 && (args.top_k < 1 || args.top_k > 20)) throw new Error("top_k must be between 1 and 20");
			return await callSkillApi(client, "rag_search", args.top_k === void 0 ? { queries: args.queries } : {
				queries: args.queries,
				top_k: args.top_k
			}, exec.signal);
		}
	}));
}
//#endregion
//#region src/index.ts
const name = "miliastra-knowledge";
const inject = ["tools", "skills"];
const Config = Schema.object({
	baseUrl: Schema.string().default("https://ugc.070077.xyz"),
	timeoutMs: Schema.number().default(3e4)
});
function apply(ctx, config) {
	registerMiliastraTools(ctx, { baseUrl: config.baseUrl.replace(/\/+$/, "") }, config.timeoutMs);
	registerMiliastraSkill(ctx);
}
//#endregion
export { Config, apply, inject, name };
