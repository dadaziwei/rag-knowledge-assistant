# DaziKnow RAG 知识库智能问答助手

[English](./README.en.md) | 中文

作者：daziwei

DaziKnow 是一个面向企业和团队知识管理场景的 RAG 知识库智能问答系统。项目围绕文档上传、对象存储、异步解析、向量检索、多租户权限过滤和大模型流式问答展开，适合作为 FastAPI + LangChain + MinIO + Redis + Kafka + Milvus + DeepSeek 技术栈的完整实践项目。

> 安全提醒：仓库只提供 `.env.example` 示例配置，不提交真实 `.env`。使用前请复制 `.env.example` 为 `.env`，再填入你自己的 DeepSeek、Jina、数据库和对象存储密钥。

## 项目亮点

- 文档上传与对象存储：原始文件写入 MinIO，数据库只保存文件元数据和对象 key。
- Kafka 异步文件处理：上传接口快速返回，后台 Consumer 负责解析、向量化和入库。
- 多格式文档解析：支持 PDF、图片、TXT/MD、DOCX，以及基于 unoserver/LibreOffice 的 Office 文档转换。
- 向量检索：使用 Milvus 保存文档页级向量，问答时按 Top-K 召回相关内容。
- 多租户权限隔离：向量写入时携带 `tenant_id`、`org_id`、`owner_username`、`knowledge_db_id`、`tags` 等 metadata，检索阶段执行过滤。
- DeepSeek 问答：通过 OpenAI-compatible API 接入 DeepSeek，并适配 `deepseek-chat` 的文本上下文输入。
- 流式响应：FastAPI SSE/WebSocket 将模型输出增量推送到前端。
- Token 状态管理：JWT + Redis 管理登录状态、刷新 token 和任务进度。

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

2. 修改 `.env`，至少填入你自己的密钥和密码：

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

## 系统主链路

### 文档上传链路

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
Consumer 解析文件并生成页面图片/文本
  ↓
Embedding 服务生成向量
  ↓
Milvus 写入向量和权限 metadata
  ↓
MongoDB 保存文件、页面和知识库关系
```

面试表达：

> 文档上传接口不会同步完成解析和向量化，而是将原始文件保存到 MinIO 后，通过 Kafka 投递异步任务。后台 Consumer 从 Kafka 消费任务，执行文档解析、向量化和 Milvus 入库。这样可以避免大文件上传阻塞接口，同时通过 Redis 记录任务进度，让前端能够看到处理状态。

### RAG 问答链路

```text
用户选择知识库并提问
  ↓
后端读取会话配置中的知识库列表
  ↓
问题生成 query embedding
  ↓
Milvus 按 collection + metadata filter 检索
  ↓
Top-K 结果排序和裁剪
  ↓
加载命中文件和上下文
  ↓
将知识库上下文注入 prompt
  ↓
DeepSeek 生成答案
  ↓
SSE/WebSocket 流式返回给前端
```

## 学习路线

这部分是为面试复盘和二次开发准备的。建议不要一开始就硬啃所有代码，而是按链路看。

### Day 1：系统入口、配置与服务拓扑

目标：先建立全局地图，知道系统由哪些服务组成，请求从哪里进入。

推荐顺序：

```text
docker-compose-no-local-embedding.yml
  ↓
backend/app/core/config.py
  ↓
backend/app/main.py
  ↓
backend/app/api/__init__.py
```

你需要掌握：

- Docker Compose 中每个容器的职责。
- `.env` 如何进入后端配置。
- FastAPI 启动时初始化了哪些资源。
- API 路由是如何按业务模块注册的。

详细文档：[Day 1 系统入口、配置与服务拓扑](./docs/docs/day1-architecture.md)

### Day 2：文档上传、Kafka Consumer 与向量入库

目标：看懂简历里最关键的一条链路：文件上传后如何异步解析、向量化并进入 Milvus。

推荐顺序：

```text
backend/app/api/endpoints/base.py
  ↓
backend/app/utils/kafka_producer.py
  ↓
backend/app/utils/kafka_consumer.py
  ↓
backend/app/rag/utils.py
  ↓
backend/app/db/milvus.py
```

你需要掌握：

- `await` 为什么用于 Redis、MinIO、Kafka、Milvus 这类耗时操作。
- 上传接口为什么只保存文件和投递任务，不直接解析。
- Kafka Producer 和 Consumer 分别负责什么。
- `process_file` 如何串起文件读取、解析、向量化和入库。
- metadata 如何保证知识库和用户权限隔离。

详细文档：[Day 2 文档上传、Kafka Consumer 与向量入库](./docs/docs/day2-upload-kafka-consumer.md)

## 文件级代码导读

| 文件 | 你应该怎么看 |
| --- | --- |
| `backend/app/api/endpoints/base.py` | 知识库和文件上传入口，重点看 `upload_multiple_files` |
| `backend/app/utils/kafka_producer.py` | 发送文件处理任务，重点看 `send_embedding_task` |
| `backend/app/utils/kafka_consumer.py` | 后台消费 Kafka 消息，重点看 `consume_messages` 和 `process_message` |
| `backend/app/rag/utils.py` | 文件处理核心，重点看 `process_file`、`generate_embeddings`、`insert_to_milvus` |
| `backend/app/db/milvus.py` | 向量库管理，重点看动态字段、metadata filter 和 `insert/search` |
| `backend/app/rag/llm_service.py` | RAG 问答核心，重点看检索、上下文拼接和 DeepSeek 调用 |

## 常见面试问题

**为什么要用 Kafka？**

因为文档解析、Office 转换、向量化都是耗时任务。如果上传接口同步执行这些逻辑，大文件容易导致接口阻塞或超时。Kafka 可以把上传和处理解耦，后续也可以横向扩展多个 Consumer 提高吞吐。

**为什么要用 MinIO？**

MinIO 负责保存原始文件和解析后的页面图片，避免把大文件直接存进数据库。数据库只保存文件 ID、文件名、对象 key、知识库关系等元数据，结构更清晰，也方便后续重新解析或下载。

**metadata 有什么用？**

metadata 记录文档归属和权限边界，例如租户、组织、用户、知识库和标签。向量检索时不仅要按语义相似度召回，还要按 metadata 做过滤，避免用户检索到没有权限的内容。

**`await` 是什么？**

`await` 表示当前操作需要等待外部系统返回结果，例如 Redis 写入、MinIO 上传、Kafka 发送消息、请求大模型 API。等待期间，FastAPI 可以继续处理其他请求，避免整个服务被一个慢操作卡住。

**Kafka Consumer 在项目中做什么？**

Consumer 是后台任务处理器。它不直接接收用户请求，而是持续监听 Kafka topic，拿到 Producer 发来的文件处理消息后，更新 Redis 任务状态，并调用 `process_file` 完成解析、向量化和入库。

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
