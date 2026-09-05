import SourceTrace from './SourceTrace.jsx'

export default function MessageBubble({ message }) {
  const { role, content, sources, pending, error } = message

  const rowClass = `msg-row ${role}${error ? ' error' : ''}`

  return (
    <div className={rowClass}>
      <div className={`msg-avatar ${role === 'user' ? 'user-av' : 'assistant-av'}`}>
        {role === 'user' ? 'you' : 'ai'}
      </div>
      <div className="msg-body">
        <div className="msg-bubble">
          {pending ? (
            <span className="msg-pending">
              <span className="pulse-dot" />
              <span className="pulse-dot" />
              <span className="pulse-dot" />
            </span>
          ) : (
            content
          )}
        </div>
        {!pending && role === 'assistant' && <SourceTrace sources={sources} />}
      </div>
    </div>
  )
}
