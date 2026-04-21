import { useEffect, useState } from 'react'
import Upload from './views/Upload'
import Personas from './views/Personas'
import Configure from './views/Configure'
import Examine from './views/Examine'
import './app.css'

const STORAGE_KEY = 'witness-sim-state'

export default function App() {
  const [view, setView] = useState('upload')
  const [segments, setSegments] = useState([])
  const [candidates, setCandidates] = useState([])
  const [personas, setPersonas] = useState([])
  const [session, setSession] = useState(null)
  const [configPersonaId, setConfigPersonaId] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      setSegments(saved.segments || [])
      setCandidates(saved.candidates || [])
      setPersonas(saved.personas || [])
      setSession(saved.session || null)
      setConfigPersonaId(saved.configPersonaId || null)
    } catch {
      // Ignore corrupt local state.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      segments,
      candidates,
      personas,
      session,
      configPersonaId,
    }))
  }, [segments, candidates, personas, session, configPersonaId])

  const nav = [
    { id: 'upload', label: 'Upload' },
    { id: 'personas', label: 'Personas' },
    { id: 'configure', label: 'Configure' },
    { id: 'examine', label: 'Examine' },
  ]

  return (
    <div>
      <nav className="nav">
        <span className="nav-title">WITNESS SIM</span>
        {nav.map(n => (
          <button
            key={n.id}
            className={`nav-btn${view === n.id ? ' active' : ''}`}
            onClick={() => setView(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      {view === 'upload' && (
        <Upload
          segments={segments}
          setSegments={setSegments}
          candidates={candidates}
          setCandidates={setCandidates}
          personas={personas}
          setPersonas={setPersonas}
          onPersonaBuilt={() => setView('personas')}
        />
      )}

      {view === 'personas' && (
        <Personas
          personas={personas}
          setPersonas={setPersonas}
          onConfigure={(personaId) => {
            setConfigPersonaId(personaId)
            setView('configure')
          }}
        />
      )}

      {view === 'configure' && (
        <Configure
          personas={personas}
          configPersonaId={configPersonaId}
          setConfigPersonaId={setConfigPersonaId}
          onSessionStart={(nextSession) => {
            setSession(nextSession)
            setView('examine')
          }}
        />
      )}

      {view === 'examine' && (
        <Examine
          session={session}
          setSession={setSession}
          onReset={() => setView('configure')}
        />
      )}
    </div>
  )
}
