# DaziKnow RAG 知识库智能问答助手

[English](./README.en.md) | 中文

作者：daziwei

DaziKnow 是一个面向企业和团队知识管理场景的 RAG 知识库智能问答系统。项目围绕文档上传、对象存储、异步解析、向量检索、多租户权限过滤和大模型流式问答展开，适合作为 FastAPI + LangChain + MinIO + Redis + Kafka + Milvus + DeepSeek 技术栈的完整实践项目。

> 安全提醒：仓库只提供 `.env.example` 示例配置，不提交真实 `.env`。使用前请复制 `.env.example` 为 `.env`，再填入你自己的 DeepSeek、Jina、数据库和对象存储密钥。

## 项目亮点

- 文档上传与对象存储：原始文件写入 MinIO，数据库只保存文件元数据和对象 key。
- Kafka 异步文件处理：上传接口快速返回，后台 Consumer 负责解析、向量化和入库。
- 多格式文档解析：支持 PDF、图片、TXT/MD、DOCX，以及基于 unoserver/LibreOffice 的 Office 文档转换。
- 向量检索与权限过滤：Milvus 保存文档页级向量，并通过 metadata 过滤租户、组织、用户和知识库。
- DeepSeek 流式问答：通过 OpenAI-compatible API 接入 DeepSeek，并使用 SSE/WebSocket 返回增量答案。
- JWT + Redis 状态管理：支持登录状态、刷新 token 和任务进度跟踪。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Next.js、TypeScript、Tailwind CSS |
| 后端 | FastAPI、Pydantic、Uvicorn/Gunicorn |
| 对象存储 | MinIO |
| 元数据存储 | MongoDB、MySQL |
| 状态与缓存 | Redis |
| 消息队列 | Kafka |
| 向量数据库 | Milvus |
| 文档转换 | unoserver、LibreOffice、poppler-utils |
| 大模型 | DeepSeek API |

## 快速启动

1. 复制环境变量示例文件：

```powershell
Copy-Item .env.example .env
```

2. 修改 `.env`，填入你自己的密钥和密码。示例文件中只保留占位符：

```text
DEEPSEEK_API_KEY=replace-with-your-deepseek-api-key
JINA_API_KEY=replace-with-your-jina-api-key
SECRET_KEY=replace-with-a-long-random-secret
```

3. 启动轻量版本：

```powershell
docker compose -f docker-compose-no-local-embedding.yml up -d --build
```

4. 如果需要 Office 文档转换能力，启用 document-convert profile：

```powershell
docker compose -f docker-compose-no-local-embedding.yml --profile document-convert up -d --build
```

5. 打开页面：

```text
http://localhost:18080
```

## 教程索引

教程统一放在 [tutorials](./tutorials/README.md) 目录，README 只保留入口。

### 学习路线

- [教程总览](./tutorials/README.md)
- [学习路线总览](./tutorials/learning-path/README.md)
- [Day 1：系统入口、配置与服务拓扑](./tutorials/learning-path/day-01-system-overview.md)

### 后端链路

- [后端链路总览](./tutorials/backend/README.md)
- [async / await 基础](./tutorials/backend/async-await.md)
- [文件上传接口：base.py](./tutorials/backend/upload-api.md)
- [Kafka Producer 与 Consumer](./tutorials/backend/kafka-producer-consumer.md)
- [process_file、Milvus 与 metadata 入库](./tutorials/backend/process-file-and-milvus.md)

### 企业级 AI 升级

- [企业级 AI 升级总览](./tutorials/enterprise-ai/README.md)
- [01 回答引用与来源追踪](./tutorials/enterprise-ai/01-answer-citation.md)

### 面试复盘

- [面试复盘总览](./tutorials/interview/README.md)
- [RAG 项目常见面试题](./tutorials/interview/rag-project-qa.md)

### 安全规范

- [敏感信息与 GitHub 发布规范](./tutorials/security/secret-management.md)

## 核心链路速览

```text
前端上传文件
  ↓
FastAPI 校验用户和知识库权限
  ↓
原始文件保存到 MinIO
  ↓
Redis 初始化任务进度
  ↓
Kafka 写入异步处理任务
  ↓
Consumer 调用 process_file
  ↓
文档转换、向量化、Milvus 入库
  ↓
RAG 检索时按 metadata 做权限过滤
```

## 简历描述建议

项目名称：RAG 知识库智能问答助手

项目描述：

> 面向企业和团队知识管理场景，设计并实现基于 FastAPI + LangChain + MinIO + Redis + Kafka + Milvus + DeepSeek API 的 RAG 知识库系统。系统支持文档分片上传、对象存储、异步解析、向量化检索和大模型流式问答。针对大文件处理和多租户权限隔离问题，采用 Kafka 异步文件处理链路、MinIO 对象存储和 Metadata 权限过滤机制，降低上传接口阻塞风险，并保证检索结果与访问权限一致。对话侧接入 DeepSeek API，基于 FastAPI SSE/WebSocket 实现流式响应，并结合 JWT + Redis 完成 Token 状态管理与刷新。

## 敏感信息规范

- 不提交 `.env`。
- 不提交真实 API Key、数据库密码、对象存储密钥。
- 使用 `.env.example` 提供占位配置。
- GitHub 上传前建议执行密钥扫描。
- 如果密钥曾经提交到公开仓库，应立即在服务商后台吊销并重新生成。

## License

本项目遵循 Apache License 2.0。原始许可证声明保留在 [LICENSE](./LICENSE) 中；daziwei 对本仓库中的二次开发、集成和改造部分保留署名。
