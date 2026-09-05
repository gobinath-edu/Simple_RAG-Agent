import { useRef, useState } from 'react'

export default function UploadDropzone({ onUpload, uploading, progress }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      onUpload(file)
    }
  }

  return (
    <>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <div className="dropzone-icon">↑</div>
        <div className="dropzone-text">
          <strong>Drop a PDF</strong> or click to browse
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {uploading && (
        <div className="upload-progress">
          indexing… {progress}%
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </>
  )
}
