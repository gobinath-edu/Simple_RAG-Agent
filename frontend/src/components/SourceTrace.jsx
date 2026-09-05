import { useState } from 'react'

export default function SourceTrace({ sources }) {
  const [openIndex, setOpenIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  const maxScore = Math.max(...sources.map((s) => s.score || 0), 0.0001)

  if (!expanded) {
    return (
      <button className="trace-toggle" onClick={() => setExpanded(true)}>
        <span className="trace-toggle-caret">▸</span>
        show sources ({sources.length})
      </button>
    )
  }

  return (
    <div className="trace">
      <div className="trace-header">
        <span>retrieval trace</span>
        <button className="trace-collapse" onClick={() => setExpanded(false)}>
          hide ✕
        </button>
      </div>
      <div className="trace-rows">
        {sources.map((s, i) => {
          const open = openIndex === i
          const pct = Math.round(((s.score || 0) / maxScore) * 100)
          return (
            <div key={i}>
              <div className="trace-row" onClick={() => setOpenIndex(open ? null : i)}>
                <span className="trace-rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="trace-bar-track">
                  <span className="trace-bar-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="trace-score">{s.score?.toFixed(3) ?? '—'}</span>
                <span className="trace-filename">
                  {s.filename}
                  {s.chunk_index !== undefined ? ` · chunk ${s.chunk_index}` : ''}
                </span>
                <span className={`trace-caret${open ? ' open' : ''}`}>▸</span>
              </div>
              {open && <div className="trace-detail">{s.text}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}