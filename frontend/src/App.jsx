import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import * as api from './api.js'

let idCounter = 0
const nextId = () => `m${++idCounter}`

export default function App() {
  const [health, setHealth] = useState(null)
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeFilter, setActiveFilter] = useState([])

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await api.getHealth())
    } catch {
      setHealth((h) => (h ? { ...h, ollama_reachable: false } : null))
    }
  }, [])

  const refreshDocuments = useCallback(async () => {
    try {
      const { documents } = await api.listDocuments()
      setDocuments(documents)
    } catch {
      // leave stale list on transient failure
    }
  }, [])

  useEffect(() => {
    refreshHealth()
    refreshDocuments()
    const interval = setInterval(refreshHealth, 15000)
    return () => clearInterval(interval)
  }, [refreshHealth, refreshDocuments])

  const handleUpload = async (file) => {
    setUploading(true)
    setProgress(0)
    try {
      await api.uploadDocument(file, setProgress)
      await refreshDocuments()
      await refreshHealth()
    } catch (e) {
      alert(`Upload failed: ${e.message}`)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document and all its indexed chunks?')) return
    try {
      await api.deleteDocument(docId)
      setActiveFilter((f) => f.filter((id) => id !== docId))
      await refreshDocuments()
      await refreshHealth()
    } catch (e) {
      alert(`Delete failed: ${e.message}`)
    }
  }

  const toggleFilter = (docId) => {
    setActiveFilter((f) => (f.includes(docId) ? f.filter((id) => id !== docId) : [...f, docId]))
  }

  const handleSend = async (question) => {
    const userMsg = { id: nextId(), role: 'user', content: question }
    const pendingMsg = { id: nextId(), role: 'assistant', content: '', pending: true }
    setMessages((m) => [...m, userMsg, pendingMsg])
    setSending(true)

    try {
      const res = await api.sendChat(question, {
        docIds: activeFilter.length > 0 ? activeFilter : null,
      })
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingMsg.id
            ? { ...msg, content: res.answer, sources: res.sources, pending: false }
            : msg
        )
      )
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingMsg.id
            ? { ...msg, content: e.message, pending: false, error: true }
            : msg
        )
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        health={health}
        documents={documents}
        onUpload={handleUpload}
        uploading={uploading}
        progress={progress}
        onDelete={handleDelete}
        activeFilter={activeFilter}
        onToggleFilter={toggleFilter}
      />
      <ChatPanel
        messages={messages}
        onSend={handleSend}
        sending={sending}
        activeFilter={activeFilter}
        documents={documents}
        onClearFilter={() => setActiveFilter([])}
      />
    </div>
  )
}
