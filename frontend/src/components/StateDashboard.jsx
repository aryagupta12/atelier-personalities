import { useEffect, useRef } from 'react'
import {
  composureLabel, knowledgeLabel, agreeablenessLabel,
  verbosityLabel, rigidityLabel, performanceLabel,
} from '../stateFormulas'
import { inferArchetype } from '../archetypes'

const DIMS = [
  { key: 'C', label: 'Composure',     fn: composureLabel },
  { key: 'K', label: 'Knowledge',     fn: knowledgeLabel },
  { key: 'A', label: 'Agreeableness', fn: agreeablenessLabel },
  { key: 'V', label: 'Verbosity',     fn: verbosityLabel },
  { key: 'R', label: 'Rigidity',      fn: rigidityLabel },
  { key: 'P', label: 'Performance',   fn: performanceLabel },
]

const ARCHETYPE_DESC = {
  Neutral:       'balanced, no strong tendencies',
  Loquacious:    'talks a lot, hard to pin down',
  Combative:     'hostile, pushes back hard',
  Cooperative:   'eager to help, very open',
  Forgetful:     'unreliable memory, gaps everywhere',
  Inventive:     'fills gaps with fabrication',
  Evasive:       'avoids direct answers, deflects',
  Defensive:     'reads everything as an attack',
  Overconfident: 'certain of themselves, won\'t concede',
  Dogmatic:      'rigidly fixed story, immovable',
  Nervous:       'easily rattled, self-contradicts',
  Overprepared:  'rehearsed, anticipates angles',
  Pedantic:      'corrects details obsessively',
  Charming:      'likeable, controls the room',
}

const BREAKING_POINT_WHAT_IT_MEANS = {
  BREAKING:   'The witness is actively cracking — expect contradictions, memory failures, and visible distress in their speech.',
  RATTLED:    'The witness is losing control — stumbling, over-explaining, walking back statements. Keep the pressure on.',
  UNEASY:     'The witness feels the pressure but is holding on. They\'re being careful. A few more hard questions should move them.',
  COMPOSED:   'The witness is stable and in control. They need harder, more targeted questioning.',
  CONTROLLED: 'The witness is calm and may even be guiding the examination. Switch tactics — try sensitive topics.',
}


// ── Dimension slider ────────────────────────────────────────────────────────

function DimSlider({ dim, value, baseline }) {
  const delta = baseline != null ? value - baseline : null
  const label = dim.fn(value)

  // Color the fill based on value for Composure (low = danger), or neutral gray otherwise
  const fillColor = dim.key === 'C'
    ? (value < 0.3 ? '#b91c1c' : value < 0.5 ? '#d97706' : '#374151')
    : '#374151'

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Top row: name, label, delta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{dim.label}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 7 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {delta != null && Math.abs(delta) >= 0.005 && (
            <span style={{
              fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
              color: delta < 0 ? '#b91c1c' : '#15803d',
            }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(3)}
            </span>
          )}
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--muted)' }}>
            {value.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', height: 20 }}>
        {/* Track background */}
        <div style={{
          position: 'absolute', top: 8, left: 0, right: 0,
          height: 6, background: '#e5e7eb', borderRadius: 3,
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', top: 8, left: 0,
          height: 6, width: `${value * 100}%`,
          background: fillColor, borderRadius: 3,
          transition: 'width 0.35s ease',
        }} />
        {/* Baseline tick */}
        {baseline != null && (
          <div style={{
            position: 'absolute',
            left: `${baseline * 100}%`,
            top: 4, width: 2, height: 14,
            background: '#9ca3af',
            borderRadius: 1,
            transform: 'translateX(-50%)',
          }} />
        )}
        {/* Current value thumb */}
        <div style={{
          position: 'absolute',
          left: `${value * 100}%`,
          top: 5, width: 12, height: 12,
          background: fillColor,
          border: '2px solid white',
          boxShadow: '0 0 0 1px #d1d5db',
          borderRadius: '50%',
          transform: 'translateX(-50%)',
          transition: 'left 0.35s ease',
        }} />
      </div>

      {/* Axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
        <span style={{ fontSize: 9, color: '#d1d5db' }}>0</span>
        <span style={{ fontSize: 9, color: '#d1d5db' }}>0.5</span>
        <span style={{ fontSize: 9, color: '#d1d5db' }}>1</span>
      </div>
    </div>
  )
}


// ── Composure bar chart ─────────────────────────────────────────────────────

function ComposureChart({ trajectory }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !trajectory || trajectory.length < 1) return

    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth || 300
    const H = 130

    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const PAD = { top: 8, right: 12, bottom: 22, left: 36 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const n = trajectory.length

    // Background
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(PAD.left, PAD.top, plotW, plotH)

    // Red zone below 0.4
    const breakY = PAD.top + (1 - 0.4) * plotH
    ctx.fillStyle = '#fff1f2'
    ctx.fillRect(PAD.left, breakY, plotW, PAD.top + plotH - breakY)

    // Grid + y labels
    ctx.font = '9px system-ui'
    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'right'
    ;[[1.0, '1.0'], [0.75, '.75'], [0.5, '.50'], [0.25, '.25'], [0.0, '0']].forEach(([v, lbl]) => {
      const y = PAD.top + (1 - v) * plotH
      ctx.strokeStyle = '#eeeeee'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke()
      ctx.fillText(lbl, PAD.left - 3, y + 3)
    })

    // Breaking point dashed line
    ctx.strokeStyle = '#fca5a5'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(PAD.left, breakY); ctx.lineTo(PAD.left + plotW, breakY); ctx.stroke()
    ctx.setLineDash([])

    // Bars
    const barW = Math.max(4, Math.min(32, (plotW / n) * 0.65))
    const gap = plotW / n
    trajectory.forEach((s, i) => {
      const v = s.C
      const x = PAD.left + i * gap + gap / 2 - barW / 2
      const bH = v * plotH
      const y = PAD.top + plotH - bH
      ctx.fillStyle = v < 0.3 ? '#b91c1c' : v < 0.5 ? '#d97706' : '#374151'
      ctx.fillRect(x, y, barW, bH)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '9px system-ui'
      ctx.textAlign = 'center'
      if (n <= 14 || i % 2 === 0) ctx.fillText(String(i), PAD.left + i * gap + gap / 2, H - PAD.bottom + 11)
    })

    // Border
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1; ctx.setLineDash([])
    ctx.strokeRect(PAD.left, PAD.top, plotW, plotH)

  }, [trajectory])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {trajectory && trajectory.length >= 1
        ? <canvas ref={canvasRef} style={{ display: 'block' }} />
        : <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 11, border: '1px solid var(--border)', borderRadius: 3 }}>Ask a question to start tracking</div>
      }
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, textAlign: 'center' }}>turn →</div>
    </div>
  )
}


// ── Hot topics ──────────────────────────────────────────────────────────────

function HotTopics({ memory }) {
  const topics = Object.entries(memory || {})
  if (!topics.length) return <div style={{ color: 'var(--muted)', fontSize: 12 }}>No sensitive topics identified.</div>

  return (
    <div>
      {topics.map(([topic, data]) => {
        const rho = data.rho ?? 1.0
        const sigma = data.sigma ?? 0.5
        const hits = data.hit_count ?? 0
        let statusLabel, statusColor, statusBg
        if (hits === 0) { statusLabel = 'Not yet asked'; statusColor = '#6b7280'; statusBg = '#f3f4f6' }
        else if (rho > 0.7) { statusLabel = `${hits}x asked — still reliable`; statusColor = '#15803d'; statusBg = '#dcfce7' }
        else if (rho > 0.4) { statusLabel = `${hits}x asked — memory slipping`; statusColor = '#92400e'; statusBg = '#fef3c7' }
        else { statusLabel = `${hits}x asked — recall breaking down`; statusColor = '#b91c1c'; statusBg = '#fee2e2' }

        return (
          <div key={topic} style={{
            padding: '8px 10px', marginBottom: 6,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${hits > 0 ? statusColor : '#d1d5db'}`, borderRadius: 3,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{topic}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 2, background: statusBg, color: statusColor, whiteSpace: 'nowrap' }}>
                {statusLabel}
              </span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Sensitivity:</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 1, background: i < Math.round(sigma * 5) ? '#111' : '#e5e7eb' }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                {sigma >= 0.8 ? 'very high' : sigma >= 0.6 ? 'high' : sigma >= 0.4 ? 'medium' : 'low'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ── Question technique ──────────────────────────────────────────────────────

function TechniqueSummary({ messages }) {
  const exchanges = (messages || []).filter(m => m.role === 'assistant' && m.encoding && m.state_delta)
  if (!exchanges.length) return null

  const byType = {}
  exchanges.forEach(msg => {
    const qtype = msg.encoding.question_type
    if (!byType[qtype]) byType[qtype] = { count: 0, composureTotal: 0 }
    byType[qtype].count++
    byType[qtype].composureTotal += (msg.state_delta.C || 0)
  })

  const TYPE_DESC = {
    leading: 'Leading ("Isn\'t it true...")', closed: 'Closed (yes/no)',
    open: 'Open (narrative)', hypothetical: 'Hypothetical',
  }

  return (
    <div>
      {Object.entries(byType).sort((a, b) => (a[1].composureTotal / a[1].count) - (b[1].composureTotal / b[1].count)).map(([type, data]) => {
        const avgC = data.composureTotal / data.count
        return (
          <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
            <div>
              <span style={{ fontWeight: 600 }}>{TYPE_DESC[type] || type}</span>
              <span style={{ color: 'var(--muted)', marginLeft: 6 }}>×{data.count}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: avgC < -0.03 ? '#b91c1c' : avgC < -0.01 ? '#92400e' : '#6b7280' }}>
                {avgC > 0 ? '+' : ''}{avgC.toFixed(3)} composure/q
              </span>
              <div style={{ fontSize: 10, color: avgC < -0.02 ? '#b91c1c' : '#9ca3af' }}>
                {avgC < -0.02 ? 'effective' : 'minimal effect'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ── Main dashboard ──────────────────────────────────────────────────────────

export default function StateDashboard({ state, state0, memory, trajectory, messages }) {
  if (!state) return null

  const composure = state.C
  const archetype = inferArchetype([state.C, state.K, state.A, state.V, state.R, state.P])

  const composureStatus =
    composure < 0.25 ? { label: 'BREAKING',   color: '#b91c1c', bg: '#fee2e2' } :
    composure < 0.40 ? { label: 'RATTLED',    color: '#b45309', bg: '#fef3c7' } :
    composure < 0.60 ? { label: 'UNEASY',     color: '#374151', bg: '#f3f4f6' } :
    composure < 0.78 ? { label: 'COMPOSED',   color: '#374151', bg: '#f3f4f6' } :
                       { label: 'CONTROLLED', color: '#1a6b2e', bg: '#dcfce7' }

  const composureDelta = state0 ? state.C - state0.C : null

  return (
    <div>

      {/* ── Witness status ── */}
      <div style={{ padding: '14px 16px', marginBottom: 20, background: composureStatus.bg, border: `1px solid ${composureStatus.color}44`, borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: composureStatus.color, marginBottom: 2 }}>
              Witness Status
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: composureStatus.color, letterSpacing: 0.5 }}>
              {composureStatus.label}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 2 }}>
              Closest Archetype
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{archetype}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 130, textAlign: 'right', marginTop: 1 }}>
              {ARCHETYPE_DESC[archetype]}
            </div>
          </div>
        </div>

        {/* Breaking point explanation */}
        <div style={{ fontSize: 12, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>
          {BREAKING_POINT_WHAT_IT_MEANS[composureStatus.label]}
        </div>

        {/* Composure with delta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 8, background: '#ffffff88', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${composure * 100}%`, background: composureStatus.color, borderRadius: 4, transition: 'width 0.35s' }} />
          </div>
          <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: composureStatus.color, minWidth: 36 }}>
            {(composure * 100).toFixed(0)}%
          </span>
          {composureDelta != null && Math.abs(composureDelta) >= 0.005 && (
            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: composureDelta < 0 ? '#b91c1c' : '#15803d' }}>
              {composureDelta > 0 ? '+' : ''}{composureDelta.toFixed(3)}
            </span>
          )}
        </div>
      </div>

      {/* ── All 6 dimension sliders ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Psychological Dimensions</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
          Dot = current value · gray tick = where they started · number on right = change
        </div>
        {DIMS.map(dim => (
          <DimSlider key={dim.key} dim={dim} value={state[dim.key] ?? 0} baseline={state0?.[dim.key]} />
        ))}
      </div>

      {/* ── Composure over time ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Composure Over Time</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#374151', display: 'inline-block' }} />
            stable
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#d97706', display: 'inline-block' }} />
            rattled ({'<'}50%)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#b91c1c', display: 'inline-block' }} />
            breaking ({'<'}30%)
          </span>
        </div>
        <ComposureChart trajectory={trajectory} />
      </div>

      {/* ── Sensitive topics ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Sensitive Topics</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          Ask about high-sensitivity topics to erode recall quality.
        </div>
        <HotTopics memory={memory} />
      </div>

      {/* ── Question technique ── */}
      {messages && messages.some(m => m.role === 'assistant' && m.encoding) && (
        <div>
          <div className="section-title">Question Technique</div>
          <TechniqueSummary messages={messages} />
        </div>
      )}
    </div>
  )
}
