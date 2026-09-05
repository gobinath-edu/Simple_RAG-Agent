# Simple Local RAG

### A Local Retrieval-Augmented Generation Application for PDF Question Answering

Simple Local RAG is a lightweight, locally running Retrieval-Augmented Generation (RAG) application that allows users to upload PDF documents and ask questions about their content.

The application combines:

- PDF text extraction
- Text chunking
- Semantic embeddings
- ChromaDB vector search
- Local LLM inference with Ollama
- Qwen3:4b
- FastAPI backend
- React + Vite frontend
- Source retrieval and document-scoped queries

The entire application runs locally without requiring a cloud LLM API.

---

## Features

### Document Processing

- Upload PDF documents through the web interface
- Extract text from PDF files
- Split extracted text into overlapping chunks
- Generate vector embeddings for each chunk
- Store embeddings in ChromaDB
- Maintain document metadata
- Delete uploaded documents and their indexed chunks

### Retrieval

- Semantic vector search using BGE embeddings
- Configurable number of retrieved chunks
- Document-specific filtering
- Retrieval source information
- Similarity scores for retrieved chunks

### Generation

- Local LLM inference using Ollama
- Qwen3:4b as the default model
- Context-grounded responses
- Prompt instructs the model not to invent information
- Returns a fallback response when the answer cannot be found in the retrieved context

### User Interface

- React-based chat interface
- PDF drag-and-drop upload
- Document catalog
- Document selection
- Multi-document selection
- Document deletion
- Retrieval/source trace
- Similarity visualization
- Backend and model status information

---

# Architecture

```text
                         USER
                           |
                           v
                  React + Vite Frontend
                     localhost:5173
                           |
                           | /api
                           v
                    FastAPI Backend
                     localhost:8000
                           |
             +-------------+-------------+
             |                           |
             v                           v
       Document Upload               User Question
             |                           |
             v                           v
       PDF Text Extraction       BGE Embedding
             |                           |
             v                           v
          Chunking                  ChromaDB
             |                           |
             v                           v
      BGE Embeddings             Similarity Search
             |                           |
             v                           v
          ChromaDB                 Top-K Chunks
                                         |
                                         v
                                      Context
                                         |
                                         v
                                  Ollama + Qwen3
                                         |
                                         v
                                  Generated Answer
                                         |
                                         v
                                  Answer + Sources