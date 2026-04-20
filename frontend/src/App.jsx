import { useState } from 'react'
import Upload from './views/Upload'
import Personas from './views/Personas'
import Configure from './views/Configure'
import Examine from './views/Examine'
import './app.css'

export default function App() {
  const [view, setView] = useState('upload')
  const [segments, setSegments] = useState([])
  const [candidates, setCandidates] = useState([])
  const [personas, setPersonas] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [configPersonaId, setConfigPersonaId] = useState(null)

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
          onSessionStart={(sid) => {
            setSessionId(sid)
            setView('examine')
          }}
        />
      )}

      {view === 'examine' && (
        <Examine
          sessionId={sessionId}
          setSessionId={setSessionId}
          onReset={() => setView('configure')}
        />
      )}
    </div>
  )
}
