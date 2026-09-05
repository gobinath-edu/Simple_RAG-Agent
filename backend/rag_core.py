"""
Retrieval + generation core, refactored from the original rag.py CLI
script into functions the FastAPI app can call per-request.
"""

import os

import ollama

OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:4b")
DEFAULT_TOP_K = 5

PROMPT_TEMPLATE = """You are a local RAG assistant.

Answer the question using ONLY the provided context.

If the answer is not present in the context,
say: "I couldn't find the answer in the provided document."

Do not invent information.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:"""


def retrieve(question: str, collection, embedding_model, top_k: int = DEFAULT_TOP_K, doc_ids: list[str] | None = None):
    question_embedding = embedding_model.encode([question]).tolist()

    where_filter = None
    if doc_ids:
        where_filter = {"doc_id": {"$in": doc_ids}} if len(doc_ids) > 1 else {"doc_id": doc_ids[0]}

    results = collection.query(
        query_embeddings=question_embedding,
        n_results=top_k,
        where=where_filter,
    )

    documents = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []

    sources = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        score = round(1 / (1 + dist), 4) if dist is not None else None
        sources.append(
            {
                "text": doc,
                "filename": (meta or {}).get("filename", "unknown"),
                "doc_id": (meta or {}).get("doc_id"),
                "chunk_index": (meta or {}).get("chunk_index"),
                "score": score,
            }
        )

    return sources


def generate_answer(question: str, sources: list[dict]) -> str:
    context = "\n\n".join(s["text"] for s in sources)
    prompt = PROMPT_TEMPLATE.format(context=context, question=question)

    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    return response["message"]["content"]


def is_ollama_reachable() -> bool:
    try:
        ollama.list()
        return True
    except Exception:
        return False
