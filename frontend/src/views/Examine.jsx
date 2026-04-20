import { useState, useEffect, useRef } from 'react'
import { getSession, chat, getSuggestedQuestions, deleteSession } from '../api'
import ChatThread from '../components/ChatThread'
import StateDashboard from '../components/StateDashboard'

export default function Examine({ sessionId, setSessionId, onReset }) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [state, setState] = useState(null)
  const [state0, setState0] = useState(null)
  const [memory, setMemory] = useState({})
  const [trajectory, setTrajectory] = useState([])
  const [scores, setScores] = useState(null)
  const [scoresTrajectory, setScoresTrajectory] = useState([])
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      setLoadingSession(false)
      return
    }
    loadSession()
    fetchSuggestedQuestions()
  }, [sessionId])

  const loadSession = async () => {
    setLoadingSession(true)
    try {
      const data = await getSession(sessionId)
      setSession(data)
      setMessages(data.messages || [])
      setState(data.state)
      setState0(data.state_0)
      setMemory(data.memory || {})
      setScores(data.scores)
      setTrajectory([data.state])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSession(false)
    }
  }

  const fetchSuggestedQuestions = async () => {
    try {
      const data = await getSuggestedQuestions(sessionId)
      setSuggestedQuestions(data.questions || [])
    } catch {
      // Non-fatal
    }
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading || !sessionId) return

    setInput('')
    setLoading(true)
    setError(null)

    // Optimistically add user message
    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])

    try {
      const result = await chat(sessionId, msg)

      const assistantMsg = {
        role: 'assistant',
        content: result.reply,
        encoding: result.encoding,
        state_delta: result.state_delta,
        scores: result.scores,
        events: result.events || [],
        tone: result.tone || null,
      }

      setMessages(prev => [...prev, assistantMsg])
      setState(result.state)
      setScores(result.scores)
      setTrajectory(prev => [...prev, result.state])
      setScoresTrajectory(prev => [...prev, result.scores])

      // Update memory + refresh follow-up questions in parallel
      const [sessionData] = await Promise.all([
        getSession(sessionId),
        fetchSuggestedQuestions(),
      ])
      setMemory(sessionData.memory || {})
    } catch (err) {
      setError(err.message)
      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEndSession = async () => {
    if (window.confirm('End this examination session?')) {
      await deleteSession(sessionId)
      setSessionId(null)
      onReset()
    }
  }

  if (loadingSession) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
        <span style={{ marginLeft: 12, color: 'var(--muted)' }}>Loading session...</span>
      </div>
    )
  }

  if (!sessionId || !session) {
    return (
      <div className="view">
        <div className="empty-state">
          <h3>No active session</h3>
          <p>Configure a witness in the Configure tab to start a session.</p>
        </div>
      </div>
    )
  }

  const persona = session?.persona || {}

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>
      {/* Left: Chat Panel - 65% */}
      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
        {/* Session header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{persona.name}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>
              {persona.role}{persona.organization ? ` · ${persona.organization}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              Turn {session?.turn || 0}
            </span>
            <button className="btn btn-sm btn-danger" onClick={handleEndSession}>
              End Session
            </button>
          </div>
        </div>

        {/* Chat Thread */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ChatThread messages={messages} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0 16px' }}>
            <div className="error-msg">{error}</div>
          </div>
        )}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}>Suggested:</span>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 4,
                    color: 'var(--accent)',
                    padding: '3px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(99,102,241,0.2)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(99,102,241,0.1)'}
                >
                  {q.length > 60 ? q.substring(0, 57) + '...' : q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: 12,
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question... (Enter to send, Shift+Enter for newline)"
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: 13,
              outline: 'none',
            }}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '10px 20px', height: 52 }}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <div className="spinner" style={{ width: 14, height: 14 }} />
            ) : 'Send'}
          </button>
        </div>
      </div>

      {/* Right: State Dashboard - 35% */}
      <div style={{ width: '35%', overflowY: 'auto', padding: 16 }}>
        {state && (
          <StateDashboard
            state={state}
            state0={state0}
            memory={memory}
            scores={scores}
            trajectory={trajectory}
            scoresTrajectory={scoresTrajectory}
            messages={messages}
            persona={persona}
          />
        )}
      </div>
    </div>
  )
}
