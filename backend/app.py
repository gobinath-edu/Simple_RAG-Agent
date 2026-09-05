"""
FastAPI backend for the local RAG agent.

Wraps the existing pipeline (embeddings.py / vector_db.py / rag.py logic,
now split into ingest.py and rag_core.py) behind a small HTTP API that
the React frontend talks to.

Run with:
    uvicorn app:app --reload --port 8000
"""

import json
import shutil
import uuid
from pathlib import Path

import chromadb
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

import ingest
import rag_core

BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent  # simple-local-rag/ — where your original data/ and chroma_db/ already live
DATA_DIR = PROJECT_ROOT / "data"
CHROMA_DIR = PROJECT_ROOT / "chroma_db"
REGISTRY_PATH = BASE_DIR / "documents_registry.json"
COLLECTION_NAME = "documents"
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

DATA_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Simple Local RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Startup: load embedding model + connect to Chroma
# ------------------------------------------------------------------

print("Loading embedding model...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
print("Embedding model loaded.")

chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)


def load_registry() -> dict:
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {}


def save_registry(registry: dict):
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2))


def migrate_legacy_chunks(registry: dict) -> dict:
    """
    If the collection already has chunks from the original vector_db.py
    script (ids like chunk_0, chunk_1... with no doc_id metadata), group
    them under one legacy document so they show up in the UI and can
    still be deleted.
    """
    if collection.count() == 0:
        return registry

    existing = collection.get(include=["metadatas"])
    ids = existing["ids"]
    metadatas = existing["metadatas"]

    orphan_ids = [i for i, m in zip(ids, metadatas) if not m or "doc_id" not in m]
    if not orphan_ids:
        return registry

    legacy_doc_id = "legacy-" + uuid.uuid4().hex[:8]
    existing_pdfs = list(DATA_DIR.glob("*.pdf"))
    legacy_filename = existing_pdfs[0].name if existing_pdfs else "existing_document.pdf"

    new_metadatas = []
    for i, m in zip(orphan_ids, [mm for mm in metadatas if not mm or "doc_id" not in mm]):
        chunk_index = int(i.split("_")[-1]) if "_" in i else 0
        new_metadatas.append(
            {"doc_id": legacy_doc_id, "filename": legacy_filename, "chunk_index": chunk_index}
        )

    collection.update(ids=orphan_ids, metadatas=new_metadatas)

    registry[legacy_doc_id] = {
        "doc_id": legacy_doc_id,
        "filename": legacy_filename,
        "chunk_count": len(orphan_ids),
        "page_count": None,
        "uploaded_at": None,
        "legacy": True,
    }
    save_registry(registry)
    print(f"Migrated {len(orphan_ids)} pre-existing chunks into legacy document '{legacy_filename}'.")
    return registry


registry = migrate_legacy_chunks(load_registry())


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str
    top_k: int = 5
    doc_ids: list[str] | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "embedding_model": EMBEDDING_MODEL_NAME,
        "llm_model": rag_core.OLLAMA_MODEL,
        "ollama_reachable": rag_core.is_ollama_reachable(),
        "chunk_count": collection.count(),
        "document_count": len(registry),
    }


@app.get("/documents")
def list_documents():
    return {"documents": list(registry.values())}


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now.")

    dest_path = DATA_DIR / file.filename
    with dest_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = ingest.ingest_pdf(dest_path, file.filename, collection, embedding_model)
    except ValueError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {e}")

    import datetime
    result["uploaded_at"] = datetime.datetime.utcnow().isoformat()
    result["legacy"] = False

    registry[result["doc_id"]] = result
    save_registry(registry)

    return result


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if doc_id not in registry:
        raise HTTPException(status_code=404, detail="Document not found.")

    collection.delete(where={"doc_id": doc_id})

    filename = registry[doc_id].get("filename")
    if filename:
        file_path = DATA_DIR / filename
        # Only remove the file if no other registry entry still references it
        still_referenced = any(
            d["filename"] == filename and d["doc_id"] != doc_id for d in registry.values()
        )
        if file_path.exists() and not still_referenced:
            file_path.unlink()

    del registry[doc_id]
    save_registry(registry)

    return {"deleted": doc_id}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if collection.count() == 0:
        raise HTTPException(status_code=400, detail="No documents have been ingested yet. Upload a PDF first.")

    sources = rag_core.retrieve(
        req.question, collection, embedding_model, top_k=req.top_k, doc_ids=req.doc_ids
    )

    if not sources:
        return ChatResponse(
            answer="I couldn't find the answer in the provided document.",
            sources=[],
        )

    if not rag_core.is_ollama_reachable():
        raise HTTPException(
            status_code=503,
            detail="Ollama isn't reachable. Make sure it's running (`ollama serve`) and the model "
                   f"'{rag_core.OLLAMA_MODEL}' is pulled (`ollama pull {rag_core.OLLAMA_MODEL}`).",
        )

    try:
        answer = rag_core.generate_answer(req.question, sources)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama generation failed: {e}")

    return ChatResponse(answer=answer, sources=sources)

    return ChatRespon