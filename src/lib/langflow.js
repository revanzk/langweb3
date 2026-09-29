/**
 * Call a Langflow flow.
 * ALWAYS uses input_type:"chat" — never "text".
 * Never throws; always returns { ok, data?, error? }.
 */
export async function runFlow(flowId, inputValue) {
  const BASE = import.meta.env.VITE_LANGFLOW_URL || 'http://localhost:7860'
  const API_KEY = import.meta.env.VITE_LANGFLOW_API_KEY || ''
  const url = `${BASE}/api/v1/run/${flowId}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      },
      body: JSON.stringify({
        input_request: {
          input_value: inputValue,
          input_type: 'chat',
          output_type: 'text',
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}: ${text}`, httpStatus: res.status, raw: text }
    }

    const data = await res.json()
    return { ok: true, data, httpStatus: res.status }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Request timeout (120s)' }
    }
    return { ok: false, error: err.message }
  }
}

/**
 * Extract all text candidates from a Langflow response.
 * Search flow emits TWO outputs — order not guaranteed.
 * Returns array of strings.
 */
export function extractCandidates(data) {
  const candidates = []
  try {
    const outputs = data?.outputs?.[0]?.outputs || []
    for (const out of outputs) {
      const text = out?.results?.message?.text
      if (typeof text === 'string' && text.trim()) {
        candidates.push(text.trim())
      }
    }
  } catch {
    // ignore
  }
  return candidates
}
