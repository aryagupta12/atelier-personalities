import { useState } from 'react'

function ConfidenceBar({ value }) {
  const color = value >= 0.7 ? 'var(--green)' : value >= 0.4 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span style={{ color, fontSize: 11, minWidth: 32, textAlign: 'right' }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

function PersonaCard({ persona, onConfigure }) {
  const [expanded, setExpanded] = useState(false)

  const statement = persona.statement || ''
  const previewText = statement.length > 100 ? statement.substring(0, 100) + '...' : statement
  const claimsCount = (persona.claims || []).length
  const sensitiveCount = (persona.sensitive_topics || []).length

  return (
    <div className="card" style={{ cursor: 'default' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{persona.name}</span>
            <span className="badge badge-blue">{persona.role}</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
            {persona.organization}
          </div>
          <div style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.5 }}>
            {previewText}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              <span style={{ color: 'var(--accent2)' }}>{claimsCount}</span> claims
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              <span style={{ color: sensitiveCount > 0 ? 'var(--yellow)' : 'var(--muted)' }}>{sensitiveCount}</span> sensitive topics
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 16 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); onConfigure(persona.persona_id) }}
          >
            Configure Witness
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
            {expanded ? '▲ collapse' : '▼ expand'}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          {/* Full Statement */}
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Statement</div>
            <div style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {persona.statement}
            </div>
          </div>

          {/* Background */}
          {persona.background && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-title">Background</div>
              <div style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.6 }}>
                {persona.background}
              </div>
            </div>
          )}

          {/* Claims */}
          {persona.claims && persona.claims.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-title">Claims</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {persona.claims.map((claim, i) => (
                  <div key={i} style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      {claim.facet && (
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 2 }}>
                          {claim.facet}
                        </div>
                      )}
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{claim.text}</div>
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <ConfidenceBar value={claim.confidence || 0.5} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Known / Hidden Facts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ color: 'var(--green)' }}>Known Facts</div>
              <div style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.6, background: 'var(--bg)', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border)' }}>
                {persona.known_facts || 'Not specified.'}
              </div>
            </div>
            <div>
              <div className="section-title" style={{ color: 'var(--red)' }}>Hidden Facts</div>
              <div style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.6, background: 'var(--bg)', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border)' }}>
                {persona.hidden_facts || 'Not specified.'}
              </div>
            </div>
          </div>

          {/* Sensitive Topics */}
          {persona.sensitive_topics && persona.sensitive_topics.length > 0 && (
            <div>
              <div className="section-title" style={{ color: 'var(--yellow)' }}>Sensitive Topics</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {persona.sensitive_topics.map((topic, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '6px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                  }}>
                    <span style={{ flex: 1, fontSize: 12 }}>{topic.topic}</span>
                    <ConfidenceBar value={topic.sensitivity || 0.5} />
                    {topic.basis && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topic.basis}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Personas({ personas, setPersonas, onConfigure }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  return (
    <div className="view">
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Witness Personas ({personas.length})
          </div>
          <button className="btn btn-sm" onClick={() => {
            setLoading(true)
            setTimeout(() => setLoading(false), 150)
          }}>
            {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Local State'}
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {personas.length === 0 && !loading ? (
          <div className="empty-state">
            <h3>No personas yet</h3>
            <p>Upload documents and build personas from the Upload tab.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {personas.map((persona, i) => (
              <PersonaCard
                key={persona.persona_id || i}
                persona={persona}
                onConfigure={onConfigure}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
