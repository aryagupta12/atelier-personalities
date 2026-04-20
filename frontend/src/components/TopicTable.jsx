import { useState } from 'react'

export default function TopicTable({ topics, onChange }) {
  const addRow = () => {
    onChange([...topics, { topic: '', sensitivity: 0.5, selective: false }])
  }

  const updateRow = (idx, field, value) => {
    const updated = topics.map((t, i) => i === idx ? { ...t, [field]: value } : t)
    onChange(updated)
  }

  const deleteRow = (idx) => {
    onChange(topics.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {topics.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Sensitivity</th>
                <th style={{ textAlign: 'center' }}>Selective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topics.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      value={row.topic}
                      onChange={e => updateRow(idx, 'topic', e.target.value)}
                      placeholder="e.g. financial records"
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={row.sensitivity}
                        onChange={e => updateRow(idx, 'sensitivity', parseFloat(e.target.value))}
                        style={{ width: 80 }}
                      />
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: row.sensitivity >= 0.7 ? 'var(--red)' : row.sensitivity >= 0.4 ? 'var(--yellow)' : 'var(--green)',
                        minWidth: 32,
                      }}>
                        {row.sensitivity.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.selective || false}
                      onChange={e => updateRow(idx, 'selective', e.target.checked)}
                      style={{ cursor: 'pointer', width: 14, height: 14 }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteRow(idx)}
                      style={{ padding: '2px 8px', fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>
          No topics configured. Add topics to track sensitivity during examination.
        </div>
      )}

      <button className="btn btn-sm" onClick={addRow}>
        + Add Topic
      </button>
    </div>
  )
}
