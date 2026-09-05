import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'

export default function ChatPanel({ messages, onSend, sending, activeFilter, documents, onClearFilter }) {
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const filterNames = documents
    .filter((d) => activeFilter.includes(d.doc_id))
    .map((d) => d.filename)

  return (
    <div className="main">
      <div className="main-header">
        <div>
          <div className="main-title">Chat</div>
          <div className="main-title-sub">
            {filterNames.length > 0 ? `scoped to ${filterNames.length} document(s)` : 'querying all indexed documents'}
          </div>
        </div>
        {filterNames.length > 0 && (
          <span className="filter-chip" onClick={onClearFilter}>
            {filterNames.join(', ')} ✕
          </span>
        )}
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-glyph">⌁</div>
            <h2>Ask something about your documents</h2>
            <p>
              Upload a PDF from the sidebar, then ask a question here. Answers are grounded
              only in the retrieved chunks — every response shows its retrieval trace below.
            </p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <div className="composer">
        <div className="composer-inner">
          <textarea
            ref={textareaRef}
            value={input}
            placeholder="Ask a question about your documents…"
            rows={1}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
            }}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" onClick={handleSubmit} disabled={!input.trim() || sending}>
            →
          </button>
        </div>
        <div className="composer-hint">enter to send · shift+enter for a new line</div>
      </div>
    </div>
  )
}
