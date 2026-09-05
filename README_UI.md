# Local RAG — UI addition

This adds a `backend/` (FastAPI) and `frontend/` (React + Vite) on top of
your existing `simple-local-rag` scripts. Your original files
(`rag.py`, `vector_db.py`, `retrieve.py`, etc.) are untouched — the new
backend reuses the same `data/` and `chroma_db/` folders sitting at the
project root, so whatever you've already ingested (e.g. `python_notes.pdf`)
shows up automatically as a "legacy" document on first run.

```
simple-local-rag/
├── data/                  ← existing, reused
├── chroma_db/             ← existing, reused
├── rag.py, vector_db.py…  ← existing scripts, untouched
├── backend/                ← NEW
│   ├── app.py
│   ├── ingest.py
│   ├── rag_core.py
│   └── requirements.txt
└── frontend/                ← NEW
    ├── src/
    └── package.json
```

## 1. Backend setup

From the project root (reuse your existing venv, or make a new one):

```bash
cd backend
pip install -r requirements.txt
```

Make sure Ollama is running and the model is pulled (same as before):

```bash
ollama serve
ollama pull qwen3:4b
```

Run the API:

```bash
uvicorn app:app --reload --port 8000
```

First boot loads the embedding model and, if it finds chunks from your
old `vector_db.py` run with no document metadata, tags them into a
"legacy" document automatically so the UI can list/delete them.

Check it's alive: `http://localhost:8000/health`

## 2. Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to
`http://localhost:8000`, so both servers need to be running.

## What you get

- **Chat** — ask questions, answers are generated only from retrieved
  chunks via your local Ollama model.
- **Retrieval trace** — every answer shows the ranked chunks that were
  retrieved, with a similarity bar and expandable chunk text.
- **Document manager** (sidebar) — drag-and-drop PDF upload, per-document
  chunk/page counts, delete a document (removes its chunks + file).
- **Scoped queries** — click a document card to scope the next question
  to just that document (multi-select supported); click the filter chip
  in the chat header to clear it.
- **Live status** — LLM/embedding model names, Ollama reachability, and
  total indexed chunk count in the sidebar.

## API surface (backend/app.py)

| Method | Path                   | Purpose                              |
|--------|------------------------|---------------------------------------|
| GET    | `/health`              | model/status info                    |
| GET    | `/documents`           | list ingested documents              |
| POST   | `/documents/upload`    | upload + ingest a PDF (multipart)    |
| DELETE | `/documents/{doc_id}`  | remove a document and its chunks     |
| POST   | `/chat`                | `{question, top_k?, doc_ids?}` → `{answer, sources}` |

## Notes / things you may want to change next

- Only PDF upload is wired up (matches your current pipeline). Extending
  to `.txt`/`.md` just means adding another branch in `ingest.py`.
- Chat is currently request/response, not streamed. Ollama's Python
  client supports `stream=True` if you want token-by-token output later.
- The "similarity score" shown is derived from Chroma's raw distance
  (`1 / (1 + distance)`), not a calibrated cosine similarity — good for
  relative ranking, not for cross-query comparison.
