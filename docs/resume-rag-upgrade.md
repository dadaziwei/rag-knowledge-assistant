# RAG 知识库智能问答助手二开说明

本仓库基于 DaziKnow 二次开发，目标是收敛为一个面向企业/团队知识管理场景的 RAG 知识库智能问答系统。当前改造重点是让简历中的核心技术链路在代码中有清晰落点：FastAPI、MinIO、Redis、Kafka、Milvus、DeepSeek API、多租户 metadata 过滤、WebSocket 流式问答。

## 当前已落地

- 文档上传后先写入 MinIO，再通过 Kafka 投递异步解析任务。
- Kafka Consumer 处理文件解析、向量化和 Milvus 入库。
- Redis 分库保存 token 状态、文件处理任务状态和锁。
- 注册用户默认生成 DeepSeek OpenAI-compatible 模型配置。
- 登录接口返回 access token 和 refresh token，新增 `/api/v1/auth/refresh` 无感刷新接口。
- 新增 `/api/v1/ws/chat?token=...` WebSocket 流式问答接口。
- 文档上传链路携带 `tenant_id`、`org_id`、`owner_username`、`knowledge_db_id`、`tags` 元数据。
- Milvus 插入向量时保存权限 metadata，检索时按 `owner_username` 做基础隔离过滤。
- 新增 `app/rag/langchain_adapter.py`，提供 LangChain-compatible 的 metadata-aware retriever 接入层。
- `docker-compose-no-local-embedding.yml` 默认跳过 `unoserver` 文档转换服务，避免 LibreOffice 构建拖慢本地检查；如需转换 Office/PDF，使用 `--profile document-convert` 启用。
- Kafka 已切换为本机已有的 `apache/kafka:latest` 镜像，并使用 KRaft 单节点模式；项目内地址为 `kafka:9092`，不映射宿主机 9092，因此不会和已有的 `pai-smart-kafka` 容器抢端口。

## 本机 Kafka 结论

本机 Docker 中已有 Kafka 镜像：

- 镜像：`apache/kafka:latest`
- 镜像 ID：`sha256:6bd928f08f07cfab96a46f5313ad4a3bc875c1c4e95fbbc68c5f41b41ff8019d`
- 现有容器：`pai-smart-kafka`
- 宿主机端口：`9092`

`pai-smart-kafka` 当前是健康状态，能够列出已有 topic。但它的 `KAFKA_ADVERTISED_LISTENERS` 是 `PLAINTEXT://localhost:9092`，这适合宿主机上的客户端访问，不适合另一个 Docker 容器里的 backend 直接访问。因为 Kafka 会把 `localhost:9092` 返回给客户端，而 backend 容器里的 `localhost` 指向自己。

因此项目 compose 采用更稳的方案：复用同一个本地镜像，启动项目自己的 Kafka 服务，内部 advertised listener 配为 `kafka:9092`。这样既不用重新拉 Kafka 镜像，也不用启动 Zookeeper。

## 核心链路

1. 用户创建知识库或临时会话知识库。
2. 前端上传文件到 FastAPI。
3. FastAPI 将原始文件写入 MinIO，并初始化 Redis 任务进度。
4. FastAPI 发送 Kafka 消息，消息中包含文件信息和租户 metadata。
5. Kafka Consumer 拉取任务，解析文件、生成切片、调用 embedding 服务。
6. 向量写入 Milvus，metadata 同步写入动态字段。
7. 问答时根据用户身份构造 metadata filter，只检索当前用户可见内容。
8. DeepSeek API 以 OpenAI-compatible 协议生成流式回答。
9. SSE 或 WebSocket 将回答增量推送到前端。

## 本地启动建议

优先使用轻量 compose：

```powershell
docker compose -f docker-compose-no-local-embedding.yml up -d --build
```

访问入口：

- 前端和网关：`http://localhost:18080`
- 后端容器内部 Kafka：`kafka:9092`
- Kafka topic：`task_generation`

如需启用 LibreOffice/unoserver 文档转换：

```powershell
docker compose -f docker-compose-no-local-embedding.yml --profile document-convert up -d --build
```

## 需要继续补强

- 将当前“按用户隔离”的 metadata filter 扩展为企业级 `tenant_id + org_id + role + tags` 组合过滤。
- 增加父文档/子切片结构，保存 `parent_doc_id`、`chunk_id`、`chunk_index`、`chunk_text`。
- 将 `MetadataAwareRetriever` 接入现有问答主流程，并补充重排、prompt 模板和引用来源展示。
- 将 refresh token 做轮换策略：每次刷新签发新 refresh token，旧 refresh token 加入 Redis 黑名单。
- 增加 Kafka 死信队列和失败重试次数，便于大文件解析失败排查。
- 增加接口测试：上传、任务进度、刷新 token、WebSocket 问答、权限过滤。

## 简历描述建议

项目名称：RAG 知识库智能问答助手

项目描述：面向企业/团队知识管理与智能问答场景，基于 FastAPI + MinIO + Redis + Kafka + Milvus 二次开发 RAG 知识库系统。系统支持文档上传、对象存储、异步解析、向量化检索和大模型流式问答；通过 Kafka 解耦文件上传与解析链路，通过 Redis 管理任务进度和 token 状态，通过 metadata 记录租户、组织、用户和标签信息，并在检索阶段执行权限过滤，保证召回内容与访问权限一致。对话侧接入 DeepSeek OpenAI-compatible API，并新增 FastAPI WebSocket 流式响应和 refresh token 无感刷新接口，提升交互实时性与安全性。
