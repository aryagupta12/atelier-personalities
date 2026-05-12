import { useState, useRef } from 'react'
import { ingestFiles, extractCandidates, buildPersona } from '../api'

const SIDE_BADGE = {
  claimant: 'badge-blue',
  respondent: 'badge-red',
  neutral: 'badge-gray',
  unknown: 'badge-gray',
}

export default function Upload({ segments, setSegments, documents, setDocuments, candidates, setCandidates, personas, setPersonas, onPersonaBuilt }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [buildingPersona, setBuildingPersona] = useState({}) // {candidateIdx: true}
  const [selectedDocIds, setSelectedDocIds] = useState(null) // null = all selected
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
      const newDocuments = result.documents || []

      setSegments(prev => [...prev, ...newSegments])
      setDocuments(prev => [...prev, ...newDocuments])

      if (newSegments.length === 0) {
        setError('No text could be extracted from the uploaded file(s). The document may be image-based or empty.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDocument = (documentId) => {
    setSegments(prev => prev.filter(s => s.document_id !== documentId))
    setDocuments(prev => prev.filter(d => d.document_id !== documentId))
    setSelectedDocIds(prev => {
      if (!prev) return null // was all-selected, remain all-selected after removal
      return prev.filter(id => id !== documentId)
    })
    // Clear candidates since corpus changed
    setCandidates([])
  }

  const handleClearAll = () => {
    setSegments([])
    setDocuments([])
    setCandidates([])
    setSelectedDocIds(null)
  }

  const toggleDocSelection = (documentId) => {
    const allIds = documents.map(d => d.document_id)
    const effective = selectedDocIds ?? allIds
    if (effective.includes(documentId)) {
      // deselect — but never allow 0 selected
      const next = effective.filter(id => id !== documentId)
      setSelectedDocIds(next.length === allIds.length ? null : next.length > 0 ? next : effective)
    } else {
      const next = [...effective, documentId]
      setSelectedDocIds(next.length === allIds.length ? null : next)
    }
  }

  const selectAll = () => setSelectedDocIds(null)
  const deselectAll = () => {
    if (documents.length > 0) setSelectedDocIds([documents[0].document_id])
  }

  const activeSegments = () => {
    if (!selectedDocIds) return segments
    return segments.filter(s => selectedDocIds.includes(s.document_id))
  }

  const handleExtract = async () => {
    setExtracting(true)
    setError(null)
    try {
      const segs = activeSegments()
      const result = await extractCandidates(segs)
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
      const segs = activeSegments()
      const result = await buildPersona(candidate, segs)
      setPersonas(prev => [...prev, result.persona])
      onPersonaBuilt()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuildingPersona(prev => ({ ...prev, [idx]: false }))
    }
  }

  const allIds = documents.map(d => d.document_id)
  const effectiveSelected = selectedDocIds ?? allIds
  const activeCount = activeSegments().length

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
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>or click to browse · add more at any time</div>
            </>
          )}
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Documents List */}
        {documents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  {documents.length} Document{documents.length !== 1 ? 's' : ''}
                </div>
                {documents.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                    <button
                      onClick={selectAll}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 11 }}
                    >
                      Select all
                    </button>
                    <span>·</span>
                    <button
                      onClick={deselectAll}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 11 }}
                    >
                      Deselect all
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-sm" onClick={handleClearAll} style={{ color: 'var(--muted)', fontSize: 12 }}>
                Clear All
              </button>
            </div>

            <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {documents.map((doc) => {
                const isSelected = effectiveSelected.includes(doc.document_id)
                return (
                  <div
                    key={doc.document_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: isSelected ? 'var(--surface2)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--border)' : 'transparent'}`,
                      borderRadius: 4,
                      padding: '5px 10px',
                      fontSize: 12,
                      opacity: isSelected ? 1 : 0.45,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDocSelection(doc.document_id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span style={{ color: doc.segment_count === 0 ? 'var(--muted)' : 'var(--accent2)', flexShrink: 0 }}>📄</span>
                    <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </span>
                    <span style={{ color: doc.segment_count === 0 ? '#f87171' : 'var(--muted)', flexShrink: 0 }}>
                      {doc.segment_count === 0 ? 'no text' : `${doc.segment_count} segs`}
                    </span>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveDocument(doc.document_id)}
                      title="Remove document"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        padding: '0 2px',
                        fontSize: 14,
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => e.target.style.color = '#f87171'}
                      onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>

            {selectedDocIds && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                {effectiveSelected.length} of {documents.length} documents selected · {activeCount} segments active
              </div>
            )}
          </div>
        )}

        {/* Segments summary + Extract */}
        {segments.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                {activeCount} Segment{activeCount !== 1 ? 's' : ''} Active
                {selectedDocIds && segments.length !== activeCount && (
                  <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                    ({segments.length} total)
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleExtract}
                disabled={extracting || activeCount === 0}
              >
                {extracting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="spinner" style={{ width: 12, height: 12 }} />
                    Extracting...
                  </span>
                ) : 'Extract Candidates'}
              </button>
            </div>

            {/* Segments table */}
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
                    {activeSegments().map(seg => (
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
            <p>Upload one or more PDF or text files. You can add documents in multiple batches and select which ones to use for extraction.</p>
          </div>
        )}
      </div>
    </div>
  )
}
