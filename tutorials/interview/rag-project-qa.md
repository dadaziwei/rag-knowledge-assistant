# RAG 项目常见面试题

## 1. 这个项目整体做了什么？

> 这是一个面向企业和团队知识管理场景的 RAG 知识库智能问答系统。系统支持文档上传、对象存储、异步解析、向量化检索和大模型流式问答。上传侧使用 MinIO 保存原始文件，Kafka 解耦上传和解析，Consumer 后台完成文档转换、向量化和 Milvus 入库；问答侧根据用户选择的知识库进行向量检索，并通过 metadata 做权限过滤，最后调用 DeepSeek 生成流式回答。

## 2. 为什么要用 Kafka？

> 文档解析、Office 转换和向量化都属于耗时任务。如果在上传接口里同步完成，接口容易超时，也会影响用户体验。Kafka 可以把上传和处理解耦，让接口快速返回，后台再异步处理任务。后续如果文件量增加，也可以扩展多个 Consumer 提高吞吐。

## 3. 为什么要用 MinIO？

> MinIO 负责保存原始文件和解析后的页面图片，避免把大文件直接存进数据库。数据库只保存文件 ID、文件名、对象 key、知识库关系等元数据，结构更清晰，也方便后续重新解析或下载。

## 4. metadata 有什么用？

> metadata 用来记录文档归属和权限边界，比如租户、组织、用户、知识库和标签。向量写入 Milvus 时携带这些字段，检索时再按这些字段过滤，避免用户召回没有权限访问的内容。

## 5. Kafka Consumer 做什么？

> Consumer 是后台任务处理器。它持续监听 Kafka topic，收到文件处理消息后解析出 `task_id`、`file_meta`、`knowledge_db_id` 和 metadata，先更新 Redis 任务状态，再调用 `process_file` 执行实际文件处理。

## 6. process_file 做什么？

> process_file 根据 Kafka 消息中的 file_meta 从 MinIO 读取原始文件，转换为页面图片，生成 embedding，并将向量、页面信息、文件 ID 和权限 metadata 写入 Milvus。同时它会把文件和页面元数据写入 MongoDB，并更新 Redis 中的任务进度。

## 7. 为什么 Milvus 要开启 dynamic field？

> 因为 metadata 中包含 `tenant_id`、`org_id`、`owner_username`、`knowledge_db_id` 等字段，这些字段可能不在最初固定 schema 中。开启 dynamic field 后，Milvus 可以接收这些额外字段，避免插入时报 unexpected field 错误，也方便后续扩展权限维度。

## 8. `await` 有什么用？

> `await` 用于等待异步操作完成，例如 Redis 写入、MinIO 文件读取、Kafka 发送消息、Embedding 请求和 Milvus 操作。等待期间服务不会被阻塞，可以继续处理其他请求。

## 简历描述建议

项目名称：RAG 知识库智能问答助手

项目描述：

> 面向企业和团队知识管理场景，设计并实现基于 FastAPI + LangChain + MinIO + Redis + Kafka + Milvus + DeepSeek API 的 RAG 知识库系统。系统支持文档分片上传、对象存储、异步解析、向量化检索和大模型流式问答。针对大文件处理和多租户权限隔离问题，采用 Kafka 异步文件处理链路、MinIO 对象存储和 Metadata 权限过滤机制，降低上传接口阻塞风险，并保证检索结果与访问权限一致。对话侧接入 DeepSeek API，基于 FastAPI SSE/WebSocket 实现流式响应，并结合 JWT + Redis 完成 Token 状态管理与刷新。
