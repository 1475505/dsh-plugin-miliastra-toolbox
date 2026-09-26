import { readFileSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'

/**
 * Model-facing usage guidance for the general knowledge base (server-side
 * node graphs, systems, troubleshooting), based on the upstream
 * `Miliastra-toolbox/skills/miliastra-knowledge/SKILL.md` with a dual-mode calling section: native
 * tools when the plugin registers them, HTTP curl as the fallback for
 * tool-less skill-only setups. Kept as a sibling markdown file so syncing
 * against upstream stays a diff. Deliberately unaware of the client tools.
 */
const knowledgeContent = readFileSync(new URL('../skill.md', import.meta.url), 'utf8')

/**
 * Model-facing guidance for the client-side scenario only: 2D + lua script
 * game making (client UI programming). A separate skill so the model loads
 * it only in that scenario, and so the general skill never routes to the
 * client-only tools.
 */
const luaContent = readFileSync(new URL('../skill-lua.md', import.meta.url), 'utf8')

const knowledgeSkill: SkillRegistration = {
  name: 'miliastra-knowledge',
  description:
    '查询千星沙箱（原神千星奇域 UGC 编辑器）知识库：节点用法与参数、官方指南/教程/FAQ 文档、语义检索。当用户询问千星沙箱节点（触发器、运动器、造物、仇恨、商店、背包等）、编辑器功能配置、"为什么不触发/不生效"类排障问题，或需要把玩法需求拆解为具体节点与参考文档时使用。仅覆盖服务端节点图与玩法逻辑，不含客户端控件与客户端脚本（lua）——客户端界面编程问题用 miliastra-knowledge-lua。',
  source: 'runtime',
  content: knowledgeContent,
}

const luaSkill: SkillRegistration = {
  name: 'miliastra-knowledge-lua',
  description:
    '千星奇域 2D + lua 脚本游戏制作（客户端 UI 编程）专用：查询客户端控件与客户端脚本文档——客户端控件容器、文本视窗控件、预设按钮控件、按键提示控件、光标检测区域控件、网格视窗控件、模板引用控件、容器节点控件，以及客户端控件 API 与 lua 脚本接口。仅当用户进行客户端脚本（lua）编程、制作 2D 界面/HUD 或配置客户端控件时使用；服务端节点图与玩法逻辑问题不用本技能。',
  source: 'runtime',
  content: luaContent,
}

/**
 * Register the runtime skills so the model discovers the routing guidance
 * through the skill catalog and loads the full body on demand. The two
 * skills are scenario-partitioned: `miliastra-knowledge` covers server-side
 * gameplay, `miliastra-knowledge-lua` owns the 2D + lua client scenario and
 * the client-only tools.
 */
export function registerMiliastraSkill(ctx: Context): void {
  ctx.skills.register(knowledgeSkill)
  ctx.skills.register(luaSkill)
}
