import { useState, useRef } from 'react'
import { ingestFiles, extractCandidates, buildPersona } from '../api'

const SIDE_BADGE = {
  claimant: 'badge-blue',
  respondent: 'badge-red',
  neutral: 'badge-gray',
  unknown: 'badge-gray',
}

export default function Upload({ segments, setSegments, candidates, setCandidates, personas, setPersonas, onPersonaBuilt }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [buildingPersona, setBuildingPersona] = useState({}) // {candidateIdx: true}
  const [uploadedFiles, setUploadedFiles] = useState([]) // [{name, segmentCount}]
  const fileInputRef = useRef(null)

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }

  const handleFileInput = async (e) => {
    const files = Array.from(e.target.files)
    await processFiles(files)
    e.target.value = ''
  }

  const processFiles = async (files) => {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const result = await ingestFiles(files)
      const newSegments = result.segments || []
      setSegments(prev => [...prev, ...newSegments])
      // Track which files were added and how many segments each produced
      const fileCounts = {}
      for (const seg of newSegments) {
        fileCounts[seg.source] = (fileCounts[seg.source] || 0) + 1
      }
      setUploadedFiles(prev => [
        ...prev,
        ...Object.entries(fileCounts).map(([name, count]) => ({ name, segmentCount: count }))
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = () => {
    setSegments([])
    setCandidates([])
    setUploadedFiles([])
  }

  const handleExtract = async () => {
    setExtracting(true)
    setError(null)
    try {
      const result = await extractCandidates(segments)
      setCandidates(result.candidates || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setExtracting(false)
    }
  }

  const handleBuildPersona = async (candidate, idx) => {
    setBuildingPersona(prev => ({ ...prev, [idx]: true }))
    setError(null)
    try {
      const result = await buildPersona(candidate, segments)
      setPersonas(prev => [...prev, result.persona])
      onPersonaBuilt()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuildingPersona(prev => ({ ...prev, [idx]: false }))
    }
  }

  return (
    <div className="view">
      <div style={{ maxWidth: 960 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Document Ingestion</div>

        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(99,102,241,0.05)' : 'transparent',
            transition: 'all 0.2s',
            marginBottom: 20,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div className="spinner" />
              <span style={{ color: 'var(--muted)' }}>Processing files...</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ color: 'var(--text)', marginBottom: 4 }}>Drop PDF or text files here</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>or click to browse</div>
            </>
          )}
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                {uploadedFiles.length} Document{uploadedFiles.length !== 1 ? 's' : ''} Loaded
              </div>
              <button className="btn btn-sm" onClick={handleClearAll} style={{ color: 'var(--muted)', fontSize: 12 }}>
                Clear All
              </button>
            </div>
            <div className="card" style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 4, padding: '4px 10px', fontSize: 12 }}>
                  <span style={{ color: 'var(--accent2)' }}>📄</span>
                  <span style={{ color: 'var(--text)' }}>{f.name}</span>
                  <span style={{ color: 'var(--muted)' }}>({f.segmentCount} segs)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segments Table */}
        {segments.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                {segments.length} Segments Extracted
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="spinner" style={{ width: 12, height: 12 }} />
                    Extracting...
                  </span>
                ) : 'Extract Candidates'}
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Source</th>
                      <th>Page</th>
                      <th>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map(seg => (
                      <tr key={seg.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: 11 }}>
                          {seg.id.substring(0, 8)}
                        </td>
                        <td style={{ color: 'var(--accent2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {seg.source}
                        </td>
                        <td style={{ color: 'var(--muted)' }}>{seg.page}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {seg.preview}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Candidates */}
        {candidates.length > 0 && (
          <div>
            <div className="section-title" style={{ marginBottom: 12 }}>
              {candidates.length} Witness Candidates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {candidates.map((candidate, idx) => (
                <div key={idx} className="card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{candidate.name}</span>
                        <span className={`badge ${SIDE_BADGE[candidate.side] || 'badge-gray'}`}>
                          {candidate.side || 'unknown'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {candidate.role}{candidate.organization ? ` · ${candidate.organization}` : ''}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleBuildPersona(candidate, idx)}
                      disabled={buildingPersona[idx]}
                    >
                      {buildingPersona[idx] ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="spinner" style={{ width: 12, height: 12 }} />
                          Building...
                        </span>
                      ) : 'Build Persona'}
                    </button>
                  </div>

                  {candidate.key_points && candidate.key_points.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Key Points</div>
                      <ul style={{ paddingLeft: 16, color: 'var(--text)', fontSize: 12, lineHeight: 1.6 }}>
                        {candidate.key_points.slice(0, 5).map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {segments.length === 0 && !loading && (
          <div className="empty-state">
            <h3>No documents loaded</h3>
            <p>Upload one or more PDF or text files. You can add documents in multiple batches — segments accumulate across uploads.</p>
          </div>
        )}
      </div>
    </div>
  )
}
