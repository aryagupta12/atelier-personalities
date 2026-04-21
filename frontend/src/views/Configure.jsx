import { useState, useEffect } from 'react'
import { createSession } from '../api'
import { ARCHETYPES, inferArchetype } from '../archetypes'
import { computeScores } from '../stateFormulas'
import TopicTable from '../components/TopicTable'
import ScoreCards from '../components/ScoreCards'

const DIMS = [
  { key: 'C', label: 'Composure', desc: 'Rattled (0) → Calm (1)', color: '#6366f1' },
  { key: 'K', label: 'Knowledge', desc: 'Unreliable (0) → Sharp (1)', color: '#22d3ee' },
  { key: 'A', label: 'Agreeableness', desc: 'Combative (0) → Cooperative (1)', color: '#22c55e' },
  { key: 'V', label: 'Verbosity', desc: 'Terse (0) → Verbose (1)', color: '#eab308' },
  { key: 'R', label: 'Rigidity', desc: 'Flexible (0) → Rigid (1)', color: '#f97316' },
  { key: 'P', label: 'Performance', desc: 'Unprepared (0) → Polished (1)', color: '#ec4899' },
]

const DEFAULT_STATE = { C: 0.7, K: 0.7, A: 0.6, V: 0.4, R: 0.5, P: 0.6 }

export default function Configure({ personas, configPersonaId, setConfigPersonaId, onSessionStart }) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(configPersonaId || '')
  const [state, setState] = useState({ ...DEFAULT_STATE })
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const persona = personas.find(p => p.persona_id === selectedPersonaId)

  // When configPersonaId changes from parent, sync
  useEffect(() => {
    if (configPersonaId) {
      setSelectedPersonaId(configPersonaId)
    }
  }, [configPersonaId])

  // When persona changes, load its sensitive topics
  useEffect(() => {
    if (persona) {
      const t = (persona.sensitive_topics || []).map(tp => ({
        topic: tp.topic || '',
        sensitivity: tp.sensitivity || 0.5,
        selective: false,
      }))
      setTopics(t)
    }
  }, [selectedPersonaId])

  const scores = computeScores(state)
  const archetype = inferArchetype([state.C, state.K, state.A, state.V, state.R, state.P])

  const applyArchetype = (name) => {
    const preset = ARCHETYPES[name]
    if (!preset) return
    const [C, K, A, V, R, P] = preset
    setState({ C, K, A, V, R, P })
  }

  const handleStartSession = async () => {
    if (!selectedPersonaId) {
      setError('Please select a persona first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const memoryOverrides = topics.map(t => ({
        topic: t.topic,
        sensitivity: t.sensitivity,
        selective: t.selective,
      }))
      const result = await createSession(persona, state, memoryOverrides)
      onSessionStart(result.session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="view" style={{ padding: 0, display: 'flex', height: 'calc(100vh - 57px)' }}>
      {/* Left Panel - 40% */}
      <div style={{
        width: '40%',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        padding: 24,
      }}>
        {/* Persona Selector */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Select Witness</div>
          {personas.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>No personas built yet. Go to Upload tab first.</div>
          ) : (
            <select
              value={selectedPersonaId}
              onChange={(e) => {
                setSelectedPersonaId(e.target.value)
                setConfigPersonaId(e.target.value)
              }}
              style={{ width: '100%' }}
            >
              <option value="">-- Select a persona --</option>
              {personas.map(p => (
                <option key={p.persona_id} value={p.persona_id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Archetype Presets */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Archetype Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {Object.keys(ARCHETYPES).map(name => (
              <button
                key={name}
                className="btn btn-sm"
                style={{
                  borderColor: archetype === name ? 'var(--accent)' : 'var(--border)',
                  color: archetype === name ? 'var(--accent)' : 'var(--muted)',
                  background: archetype === name ? 'rgba(99,102,241,0.1)' : 'transparent',
                  fontSize: 11,
                  padding: '4px 8px',
                }}
                onClick={() => applyArchetype(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
            Inferred: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{archetype}</span>
          </div>
        </div>

        {/* Dimension Sliders */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Personality Dimensions</div>
          {DIMS.map(dim => (
            <div key={dim.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{ fontWeight: 500, color: dim.color }}>{dim.key}</span>
                  <span style={{ color: 'var(--text)', marginLeft: 6 }}>{dim.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>— {dim.desc}</span>
                </div>
                <span style={{ fontFamily: 'monospace', color: dim.color, minWidth: 36, textAlign: 'right' }}>
                  {state[dim.key].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={state[dim.key]}
                style={{ '--thumb-color': dim.color }}
                onChange={(e) => setState(s => ({ ...s, [dim.key]: parseFloat(e.target.value) }))}
              />
            </div>
          ))}
        </div>

        {/* Derived Scores */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Derived Scores (live)</div>
          <ScoreCards scores={scores} compact />
        </div>
      </div>

      {/* Right Panel - 60% */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 24,
      }}>
        {/* Session Controls */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Session Setup</div>
          {persona ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{persona.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
                {persona.role} · {persona.organization}
              </div>
              <div style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.5 }}>
                {(persona.statement || '').substring(0, 200)}
                {(persona.statement || '').length > 200 ? '...' : ''}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Select a witness persona from the left panel to configure the session.
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            onClick={handleStartSession}
            disabled={loading || !selectedPersonaId}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                Starting session...
              </span>
            ) : 'Start Examination Session'}
          </button>
        </div>

        {/* Memory Config */}
        <div>
          <div className="section-title">Memory Configuration</div>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>
            Configure topic sensitivity. High sensitivity topics will trigger stronger state changes when questioned.
            &ldquo;Selective&rdquo; topics are known only to the witness.
          </div>

          {/* Known / Hidden Facts Preview */}
          {persona && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Known Facts</div>
                <textarea
                  readOnly
                  value={persona.known_facts || ''}
                  rows={3}
                  style={{ width: '100%', resize: 'none', fontSize: 11, color: 'var(--muted)' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Hidden Facts</div>
                <textarea
                  readOnly
                  value={persona.hidden_facts || ''}
                  rows={3}
                  style={{ width: '100%', resize: 'none', fontSize: 11, color: 'var(--muted)' }}
                />
              </div>
            </div>
          )}

          <TopicTable topics={topics} onChange={setTopics} />
        </div>
      </div>
    </div>
  )
}
