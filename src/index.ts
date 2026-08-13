import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { registerMiliastraSkill } from './skill.ts'
import { registerMiliastraTools } from './tools.ts'

export const name = 'miliastra-knowledge'
export const inject = ['tools', 'skills']

export interface Config {
  /** Origin of the miliastra-knowledge Skill API server. */
  baseUrl: string
  /** Cooperative per-call timeout budget in milliseconds. */
  timeoutMs: number
}

export const Config: Schema<Config> = Schema.object({
  baseUrl: Schema.string().default('https://ugc.070077.xyz'),
  timeoutMs: Schema.number().default(30_000),
})

export function apply(ctx: Context, config: Config) {
  const client = { baseUrl: config.baseUrl.replace(/\/+$/, '') }
  registerMiliastraTools(ctx, client, config.timeoutMs)
  registerMiliastraSkill(ctx)
}
