/**
 * Shared client for the miliastra-knowledge HTTP Skill API.
 *
 * Every knowledge-base tool is one endpoint:
 * `POST <baseUrl>/api/v1/skills/miliastra-knowledge/tools/<tool>` with a JSON
 * body, wrapped in a `{ success, data: { result }, error }` envelope.
 */

/** Resolved connection settings for one Skill API origin. */
export interface SkillApiClient {
  /** Server origin without a trailing slash, e.g. `https://ugc.070077.xyz`. */
  readonly baseUrl: string
}

/** Response envelope shared by all Skill API tool endpoints. */
interface SkillApiEnvelope {
  readonly success: boolean
  readonly data?: { readonly result?: unknown }
  readonly error?: unknown
}

/**
 * Lossless JSON value carried by the unwrapped `data.result` payload.
 *
 * Declared here rather than imported: the harness type lives in
 * `@deepseek-ai/dsh-tools` on the 0.1 line but moved to
 * `@deepseek-ai/dsh-util-values` in 0.2, and no single import path covers both.
 * A structural copy keeps this source compiling against either baseline.
 */
export type SkillApiJson = null | boolean | number | string | SkillApiJson[] | { [key: string]: SkillApiJson }

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
export async function callSkillApi(
  client: SkillApiClient,
  tool: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<SkillApiJson> {
  const response = await fetch(`${client.baseUrl}/api/v1/skills/miliastra-knowledge/tools/${tool}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(`miliastra-knowledge ${tool}: HTTP ${response.status}`)
  const envelope = (await response.json()) as SkillApiEnvelope
  if (!envelope.success) {
    const detail = typeof envelope.error === 'string' ? envelope.error : JSON.stringify(envelope.error)
    throw new Error(`miliastra-knowledge ${tool}: ${detail ?? 'request rejected'}`)
  }
  return (envelope.data?.result ?? null) as SkillApiJson
}
