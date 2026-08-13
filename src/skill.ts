import { readFileSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'

/**
 * Model-facing usage guidance, based on the upstream
 * `Miliastra-toolbox/mcp/SKILL.md` with a dual-mode calling section: native
 * tools when the plugin registers them, HTTP curl as the fallback for
 * tool-less skill-only setups. Kept as a sibling markdown file so syncing
 * against upstream stays a diff.
 */
const content = readFileSync(new URL('../skill.md', import.meta.url), 'utf8')

const skill: SkillRegistration = {
  name: 'miliastra-knowledge',
  description:
    '查询千星沙箱（原神千星奇域 UGC 编辑器）知识库：节点用法与参数、官方指南/教程/FAQ 文档、语义检索。当用户询问千星沙箱节点（触发器、运动器、造物、仇恨、商店、背包等）、编辑器功能配置、"为什么不触发/不生效"类排障问题，或需要把玩法需求拆解为具体节点与参考文档时使用。',
  source: 'runtime',
  content,
}

/**
 * Register the runtime skill so the model discovers the routing guidance
 * through the skill catalog and loads the full body on demand.
 */
export function registerMiliastraSkill(ctx: Context): void {
  ctx.skills.register(skill)
}
