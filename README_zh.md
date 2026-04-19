# DaziKnow 知识库智能问答助手

作者：daziwei

DaziKnow 是一个面向企业/团队知识管理场景的 RAG 知识库智能问答系统。项目围绕文档上传、对象存储、异步解析、向量化检索、权限过滤和大模型流式问答展开，适合作为 FastAPI + LangChain + MinIO + Redis + Kafka + Milvus + DeepSeek 技术栈的完整实践项目。

## 核心能力

- 文档上传与对象存储：原始文件写入 MinIO，数据库只保存文件元数据和对象 key。
- 异步文件处理：上传接口通过 Kafka 投递任务，消费者负责解析、切片、向量化和入库。
- 文档解析转换：支持 PDF、图片、TXT/MD、DOCX 以及基于 unoserver/LibreOffice 的 Office 文档转换。
- 向量检索：使用 Milvus 保存文档页级向量，问答时按 Top-K 召回相关内容。
- 多租户权限隔离：向量写入时携带 `tenant_id`、`org_id`、`owner_username`、`knowledge_db_id`、`tags` 等 metadata，检索阶段执行权限过滤。
- DeepSeek 问答：通过 OpenAI-compatible API 接入 DeepSeek，并针对 `deepseek-chat` 做文本上下文适配。
- 流式响应：FastAPI SSE/WebSocket 将模型输出增量推送到前端。
- Token 管理：JWT + Redis 管理登录状态、刷新 token 和任务进度。

## 技术栈

- 前端：Next.js、TypeScript、Tailwind CSS
- 后端：FastAPI、Pydantic、Uvicorn/Gunicorn
- 存储：MinIO、MongoDB、MySQL
- 缓存与状态：Redis
- 消息队列：Kafka
- 向量数据库：Milvus
- 文档转换：unoserver、LibreOffice、poppler-utils
- 大模型：DeepSeek API

## 系统链路

### 文档上传链路

1. 用户选择知识库并上传文件。
2. FastAPI 校验用户身份与知识库归属。
3. 原始文件存入 MinIO。
4. Redis 初始化任务进度。
5. Kafka 写入文件处理任务。
6. Consumer 异步解析文件并生成图片/文本切片。
7. Embedding 服务生成向量。
8. Milvus 写入向量和权限 metadata。
9. MongoDB 保存文件、页图、知识库关联信息。
10. 前端通过任务进度接口展示处理状态。

### RAG 问答链路

1. 用户在对话配置中选择知识库。
2. 后端读取会话模型配置中的 `base_used`。
3. 对用户问题生成 query embedding。
4. 按知识库 collection 和 metadata filter 检索 Milvus。
5. 对召回结果排序并截取 Top-K。
6. 加载命中文件信息和文本上下文。
7. 将知识库上下文拼接进 prompt。
8. 调用 DeepSeek 生成回答。
9. 通过 SSE/WebSocket 流式返回答案。
10. MongoDB 保存本轮对话、引用文件和 token 统计。

## 本地启动

复制示例环境变量，并填入你自己的密钥和密码：

```powershell
Copy-Item .env.example .env
```

优先使用轻量 compose：

```powershell
docker compose -f docker-compose-no-local-embedding.yml up -d --build
```

启用 Office 文档转换：

```powershell
docker compose -f docker-compose-no-local-embedding.yml --profile document-convert up -d --build
```

访问入口：

- 前端和网关：`http://localhost:18080`
- Kafka 内部地址：`kafka:9092`
- Kafka topic：`task_generation`

## 简历描述建议

项目名称：DaziKnow 知识库智能问答助手

项目描述：面向企业/团队知识管理与智能问答场景，设计并实现基于 FastAPI + MinIO + Redis + Kafka + Milvus + DeepSeek API 的 RAG 知识库系统。系统支持文档上传、对象存储、异步解析、向量化检索和大模型流式问答；通过 Kafka 解耦上传与解析链路，通过 Redis 管理任务进度和 token 状态，通过 metadata 记录租户、组织、用户、知识库和标签信息，并在检索阶段执行权限过滤，保证召回内容与访问权限一致。对话侧接入 DeepSeek OpenAI-compatible API，并基于 FastAPI SSE/WebSocket 实现流式响应。

## 二次开发记录

- 接入 DeepSeek 默认模型配置。
- 补充 JWT refresh token 与 Redis token 状态管理。
- 增加 WebSocket 流式问答入口。
- 增加 Kafka metadata 透传。
- 修复 Milvus dynamic field 兼容问题。
- 增加 metadata-aware Milvus 检索过滤。
- 增加 DeepSeek 文本 RAG 上下文适配。
- 增加 unoserver/LibreOffice 文档转换服务。
- 增加本地 embedding 不可用时的轻量 fallback 方案。

## License

本项目基于 Apache License 2.0。原始许可证声明保留在 [LICENSE](./LICENSE) 中；daziwei 对本仓库中的二次开发、集成和改造部分保留署名。
