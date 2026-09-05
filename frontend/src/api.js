const BASE = '/api'

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      // ignore
    }
    throw new Error(detail)
  }
  return res.json()
}

export async function getHealth() {
  const res = await fetch(`${BASE}/health`)
  return handle(res)
}

export async function listDocuments() {
  const res = await fetch(`${BASE}/documents`)
  return handle(res)
}

export async function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/documents/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body)
        } else {
          reject(new Error(body.detail || 'Upload failed'))
        }
      } catch {
        reject(new Error('Upload failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}

export async function deleteDocument(docId) {
  const res = await fetch(`${BASE}/documents/${docId}`, { method: 'DELETE' })
  return handle(res)
}

export async function sendChat(question, { topK = 5, docIds = null } = {}) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK, doc_ids: docIds }),
  })
  return handle(res)
}
