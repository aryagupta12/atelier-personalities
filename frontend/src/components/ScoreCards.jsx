const SCORE_META = {
  consistency: {
    label: 'Consistency',
    desc: 'testimony coherence',
    color: '#374151',
  },
  evasion: {
    label: 'Evasion',
    desc: 'deflection tendency',
    color: '#92400e',
  },
  realism: {
    label: 'Realism',
    desc: 'believability',
    color: '#1a6b2e',
  },
  adversarial: {
    label: 'Adversarial',
    desc: 'combativeness',
    color: '#b91c1c',
  },
}

function ScoreBar({ value, color }) {
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 4 }}>
      <div style={{
        width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        height: '100%',
        background: color,
        borderRadius: 2,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

export default function ScoreCards({ scores, compact = false }) {
  if (!scores) return null

  if (compact) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Object.entries(SCORE_META).map(([key, meta]) => {
          const value = scores[key] ?? 0
          return (
            <div key={key} style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {meta.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: meta.color, fontFamily: 'monospace' }}>
                  {(value * 100).toFixed(1)}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{meta.desc}</div>
              <ScoreBar value={value} color={meta.color} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {Object.entries(SCORE_META).map(([key, meta]) => {
        const value = scores[key] ?? 0
        return (
          <div key={key} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{meta.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: meta.color, fontFamily: 'monospace' }}>
                {(value * 100).toFixed(1)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{meta.desc}</div>
            <ScoreBar value={value} color={meta.color} />
          </div>
        )
      })}
    </div>
  )
}
