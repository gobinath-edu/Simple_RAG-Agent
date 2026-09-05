import UploadDropzone from './UploadDropzone.jsx'

function Led({ state }) {
  const cls = state === true ? 'led-on' : state === false ? 'led-off' : 'led-unknown'
  return <span className={`status-led ${cls}`} />
}

export default function Sidebar({
  health,
  documents,
  onUpload,
  uploading,
  progress,
  onDelete,
  activeFilter,
  onToggleFilter,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <span className="brand-dot" />
          local-rag
        </div>
        <div className="brand-sub">retrieval console</div>
      </div>

      <div className="status-block">
        <div className="status-row">
          <span><Led state={health?.ollama_reachable} /> LLM ({health?.llm_model || '—'})</span>
          <span className="val">{health?.ollama_reachable ? 'online' : health ? 'offline' : '…'}</span>
        </div>
        <div className="status-row">
          <span><Led state={!!health} /> embeddings</span>
          <span className="val">{health?.embedding_model?.split('/').pop() || '…'}</span>
        </div>
        <div className="status-row">
          <span>chunks indexed</span>
          <span className="val">{health?.chunk_count ?? '—'}</span>
        </div>
      </div>

      <div className="section-label">Documents</div>
      <UploadDropzone onUpload={onUpload} uploading={uploading} progress={progress} />

      <div className="doc-list">
        {documents.length === 0 && (
          <div className="doc-empty">No documents indexed yet.</div>
        )}
        {documents.map((doc) => {
          const active = activeFilter.includes(doc.doc_id)
          return (
            <div
              key={doc.doc_id}
              className="doc-card"
              style={active ? { borderColor: 'var(--accent-line)' } : undefined}
              onClick={() => onToggleFilter(doc.doc_id)}
              title="Click to toggle as a chat filter"
            >
              <div className="doc-card-top">
                <div className="doc-name">
                  {doc.filename}
                  {doc.legacy && <span className="legacy-tag">legacy</span>}
                </div>
                <button
                  className="doc-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(doc.doc_id)
                  }}
                  title="Delete document"
                >
                  ✕
                </button>
              </div>
              <div className="doc-meta">
                {doc.chunk_count} chunks{doc.page_count ? ` · ${doc.page_count}p` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
