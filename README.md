# DaziKnow Knowledge Base Q&A Assistant

Author: daziwei

DaziKnow is a RAG knowledge base assistant for enterprise and team knowledge management. It focuses on document upload, object storage, asynchronous parsing, vector retrieval, permission-aware metadata filtering, and streaming LLM responses with DeepSeek.

## Features

- Document upload and object storage with MinIO.
- Kafka-based asynchronous file processing.
- PDF, image, TXT/MD, DOCX, and Office document conversion with unoserver/LibreOffice.
- Milvus vector retrieval with Top-K recall.
- Tenant-aware metadata fields including `tenant_id`, `org_id`, `owner_username`, `knowledge_db_id`, and `tags`.
- DeepSeek OpenAI-compatible chat integration.
- FastAPI SSE/WebSocket streaming responses.
- JWT + Redis token state management and task progress tracking.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, Pydantic, Uvicorn/Gunicorn
- Storage: MinIO, MongoDB, MySQL
- State and cache: Redis
- Message queue: Kafka
- Vector database: Milvus
- Document conversion: unoserver, LibreOffice, poppler-utils
- LLM: DeepSeek API

## Upload Pipeline

1. The user uploads files to a selected knowledge base.
2. FastAPI validates identity and ownership.
3. Original files are stored in MinIO.
4. Redis initializes task progress.
5. Kafka receives an asynchronous processing task.
6. Consumers parse files and generate page-level images/text.
7. Embeddings are generated for parsed content.
8. Milvus stores vectors and permission metadata.
9. MongoDB stores file, page, and knowledge base relationships.
10. The frontend displays progress through the task progress API.

## RAG Chat Pipeline

1. The user selects knowledge bases in chat settings.
2. The backend reads `base_used` from the conversation model config.
3. The question is embedded as a query vector.
4. Milvus is searched with collection and metadata filters.
5. Results are sorted and trimmed by Top-K.
6. Matched file information and text context are loaded.
7. Retrieved context is injected into the prompt.
8. DeepSeek generates the answer.
9. SSE/WebSocket streams the response to the frontend.
10. MongoDB stores the turn, referenced files, and token usage.

## Local Development

Copy the example environment file and fill in your own secrets:

```powershell
Copy-Item .env.example .env
```

Start the lightweight stack:

```powershell
docker compose -f docker-compose-no-local-embedding.yml up -d --build
```

Start with Office document conversion:

```powershell
docker compose -f docker-compose-no-local-embedding.yml --profile document-convert up -d --build
```

Endpoints:

- Web UI and gateway: `http://localhost:18080`
- Kafka internal address: `kafka:9092`
- Kafka topic: `task_generation`

## Resume Summary

Project: DaziKnow Knowledge Base Q&A Assistant

Description: Designed and implemented a RAG knowledge base system based on FastAPI, MinIO, Redis, Kafka, Milvus, and DeepSeek API for enterprise knowledge management. The system supports document upload, object storage, asynchronous parsing, vector retrieval, and streaming LLM responses. Kafka decouples upload and parsing, Redis manages task progress and token state, and metadata fields enforce tenant, organization, user, knowledge base, and tag-level filtering during retrieval.

## Development Notes

- Added DeepSeek default model configuration.
- Added JWT refresh token support with Redis state management.
- Added WebSocket streaming chat.
- Added Kafka metadata propagation.
- Fixed Milvus dynamic field compatibility.
- Added metadata-aware Milvus filtering.
- Added DeepSeek text-only RAG context adaptation.
- Added unoserver/LibreOffice document conversion.
- Added lightweight embedding fallback for local demos.

## License

This project is licensed under Apache License 2.0. The original license notice is retained in [LICENSE](./LICENSE); daziwei maintains authorship of the integration and secondary development work in this repository.
