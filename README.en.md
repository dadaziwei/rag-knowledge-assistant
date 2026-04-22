# DaziKnow RAG Knowledge Base Q&A Assistant

English | [中文](./README.md)

Author: daziwei

DaziKnow is a RAG knowledge base assistant for enterprise and team knowledge management. It focuses on document upload, object storage, asynchronous parsing, vector retrieval, permission-aware metadata filtering, and streaming LLM responses with DeepSeek.

> Security note: this repository only includes `.env.example`. Do not commit a real `.env` file or real API keys. Copy `.env.example` to `.env` locally and fill in your own credentials.

## Features

- Document upload and object storage with MinIO.
- Kafka-based asynchronous file processing.
- PDF, image, TXT/MD, DOCX, and Office document conversion with unoserver/LibreOffice.
- Milvus vector retrieval with metadata-aware permission filtering.
- DeepSeek OpenAI-compatible chat integration.
- FastAPI SSE/WebSocket streaming responses.
- JWT + Redis token state management and task progress tracking.

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

Open:

```text
http://localhost:18080
```

## Tutorials

Tutorials are organized under [tutorials](./tutorials/README.md). The Chinese documentation is the primary learning guide.

- [Tutorial index](./tutorials/README.md)
- [Learning path](./tutorials/learning-path/README.md)
- [Backend pipeline](./tutorials/backend/README.md)
- [Interview notes](./tutorials/interview/README.md)
- [Secret management](./tutorials/security/secret-management.md)

## License

This project is licensed under Apache License 2.0. The original license notice is retained in [LICENSE](./LICENSE); daziwei maintains authorship of the integration and secondary development work in this repository.
