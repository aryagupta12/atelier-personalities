const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

async function errorDetail(res) {
  const t = await res.text()
  try {
    const j = JSON.parse(t)
    const d = j.detail
    if (Array.isArray(d)) return (d[0] ?? t) || String(res.status)
    return (d ?? t) || String(res.status)
  } catch {
    return t || String(res.status)
  }
}

export async function ingestFiles(files) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const res = await fetch(`${BASE}/ingest`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Ingest failed: ${await errorDetail(res)}`)
  return res.json()
}

export async function extractCandidates(segmentIds, supplementalInfo = '') {
  const res = await fetch(`${BASE}/extract-candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segment_ids: segmentIds, supplemental_info: supplementalInfo })
  })
  if (!res.ok) throw new Error(`Extract candidates failed: ${await errorDetail(res)}`)
  return res.json()
}

export async function buildPersona(candidate, supportSegmentIds, supplementalInfo = '', mode = 'cross_examination') {
  const res = await fetch(`${BASE}/build-persona`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate, support_segment_ids: supportSegmentIds, supplemental_info: supplementalInfo, mode })
  })
  if (!res.ok) throw new Error(`Build persona failed: ${res.status}`)
  return res.json()
}

export async function createSession(personaId, personalityState, memoryOverrides = []) {
  const res = await fetch(`${BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona_id: personaId, personality_state: personalityState, memory_overrides: memoryOverrides })
  })
  if (!res.ok) throw new Error(`Create session failed: ${res.status}`)
  return res.json()
}

export async function chat(sessionId, message) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message })
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`)
  return res.json()
}

export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/session/${sessionId}`)
  if (!res.ok) throw new Error(`Get session failed: ${res.status}`)
  return res.json()
}

export async function getTrajectory(sessionId) {
  const res = await fetch(`${BASE}/session/${sessionId}/trajectory`)
  if (!res.ok) throw new Error(`Get trajectory failed: ${res.status}`)
  return res.json()
}

export async function deleteSession(sessionId) {
  await fetch(`${BASE}/session/${sessionId}`, { method: 'DELETE' })
}

export async function getPersonas() {
  const res = await fetch(`${BASE}/personas`)
  if (!res.ok) throw new Error(`Get personas failed: ${res.status}`)
  return res.json()
}

export async function getSuggestedQuestions(sessionId) {
  const res = await fetch(`${BASE}/session/${sessionId}/suggested-questions`, { method: 'POST' })
  if (!res.ok) throw new Error(`Get suggested questions failed: ${res.status}`)
  return res.json()
}
