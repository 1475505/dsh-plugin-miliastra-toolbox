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
  /**
   * Whether to register the client-only tools (`list_client_documents` /
   * `get_client_document`), which the `miliastra-knowledge-lua` skill routes
   * to. The dsh tool registry has no per-scenario visibility, so `false` is
   * the only hard way to keep them out of the tool list entirely.
   */
  clientTools: boolean
}

export const Config: Schema<Config> = Schema.object({
  baseUrl: Schema.string().default('https://ugc.070077.xyz'),
  timeoutMs: Schema.number().default(30_000),
  clientTools: Schema.boolean().default(true),
})

export function apply(ctx: Context, config: Config) {
  const client = { baseUrl: config.baseUrl.replace(/\/+$/, '') }
  registerMiliastraTools(ctx, client, config.timeoutMs, config.clientTools !== false)
  registerMiliastraSkill(ctx)
}
