---
sidebar_position: 3
title: Day 2 文档上传、Kafka Consumer 与向量入库
description: 面向初学者的 RAG 文档上传链路代码解析，从 FastAPI 上传接口讲到 Kafka Consumer、process_file、Milvus metadata 过滤。
---

# Day 2 文档上传、Kafka Consumer 与向量入库

今天的目标不是背代码，而是看懂一条核心业务链路：

```text
用户上传文件
  ↓
FastAPI 接收请求
  ↓
文件保存到 MinIO
  ↓
Redis 记录任务状态
  ↓
Kafka 投递异步任务
  ↓
Kafka Consumer 后台消费
  ↓
process_file 解析、向量化、入库
  ↓
Milvus 支持 RAG 检索
```

如果你基础还不扎实，先记住一个朴素理解：

> 上传接口只负责“接住文件并发出任务”，真正耗时的解析和向量化由后台 Consumer 慢慢处理。

---

## 1. 今天要看的文件

建议按下面顺序阅读，不要一上来从头到尾扫完整个项目。

| 顺序 | 文件 | 主要作用 |
| --- | --- | --- |
| 1 | `backend/app/api/endpoints/base.py` | 上传接口入口，接收文件、保存 MinIO、发送 Kafka 任务 |
| 2 | `backend/app/utils/kafka_producer.py` | 把文件处理任务打包成消息并发送到 Kafka |
| 3 | `backend/app/utils/kafka_consumer.py` | 后台持续监听 Kafka，拿到任务后调用处理函数 |
| 4 | `backend/app/rag/utils.py` | `process_file` 核心处理逻辑：取文件、转换、向量化、入库 |
| 5 | `backend/app/db/milvus.py` | 创建 collection、写入向量、按 metadata 过滤检索 |

---

## 2. 先理解 `await`

项目里很多代码前面都有 `await`，比如：

```python
redis_connection = await redis.get_task_connection()
await redis_connection.hset(...)
minio_filename, minio_url = await save_file_to_minio(username, file)
await kafka_producer_manager.send_embedding_task(...)
```

`await` 可以先理解成：

> 当前操作需要等外部系统返回结果，我先挂起当前任务，等结果回来后再继续往下执行。

这些操作通常都需要 `await`：

| 操作 | 为什么要等待 |
| --- | --- |
| 写 Redis | 要等 Redis 确认写入成功 |
| 上传 MinIO | 文件上传可能比较慢 |
| 发送 Kafka 消息 | 要等消息被客户端发出去 |
| 请求 DeepSeek | 网络调用需要时间 |
| 查询 Milvus | 向量检索需要访问外部服务 |

生活类比：

```text
你点奶茶后不用站在柜台前卡住别人。
你可以先去旁边等，奶茶做好后再回来取。
```

`await` 就是“去旁边等”的动作。等待期间，FastAPI 可以继续处理其他用户请求，不会因为一个慢操作卡死整个服务。

---

## 3. `base.py`：上传接口入口

文件位置：

```text
backend/app/api/endpoints/base.py
```

重点看：

```python
@router.post("/upload/{knowledge_db_id}", response_model=dict)
async def upload_multiple_files(...)
```

这个接口就是前端上传文件时访问的入口。

### 3.1 校验当前用户

代码逻辑：

```python
username = knowledge_db_id.split("_")[0]
await verify_username_match(current_user, username)
```

知识库 ID 一般类似：

```text
daziwei_xxx-xxx-xxx
```

`split("_")[0]` 可以拿到用户名 `daziwei`。后面的校验是为了确认：

```text
当前登录用户是不是这个知识库的拥有者。
```

这是权限校验的第一层。

### 3.2 构造权限 metadata

代码逻辑：

```python
access_metadata = {
    "tenant_id": tenant_id or username,
    "org_id": org_id or username,
    "owner_username": username,
    "knowledge_db_id": knowledge_db_id,
    "tags": tags,
}
```

这些字段非常重要，后面会进入 Milvus：

| 字段 | 含义 |
| --- | --- |
| `tenant_id` | 租户 ID |
| `org_id` | 组织 ID |
| `owner_username` | 文件属于哪个用户 |
| `knowledge_db_id` | 文件属于哪个知识库 |
| `tags` | 标签 |

为什么要这么做？

因为 RAG 检索不是只看“语义相似”，还必须看“用户有没有权限”。metadata 就是权限过滤的依据。

### 3.3 Redis 初始化任务状态

代码逻辑：

```python
await redis_connection.hset(
    f"task:{task_id}",
    mapping={
        "status": "processing",
        "total": total_files,
        "processed": 0,
        "message": "Initializing file processing...",
    },
)
```

Redis 这里记录的是任务进度。比如你上传 3 个文件，初始状态就是：

```text
status: processing
total: 3
processed: 0
message: Initializing file processing...
```

前端可以通过任务 ID 查询进度，所以用户能看到“文件处理中”。

### 3.4 文件保存到 MinIO

代码逻辑：

```python
minio_filename, minio_url = await save_file_to_minio(username, file)
```

MinIO 是对象存储，可以理解成项目里的“文件仓库”。

为什么不把文件直接存进数据库？

```text
PDF、Word、图片这类文件通常比较大。
数据库更适合保存结构化信息，例如文件 ID、文件名、MinIO key。
真正的二进制文件交给对象存储更合适。
```

### 3.5 发送 Kafka 任务

代码逻辑：

```python
await kafka_producer_manager.send_embedding_task(
    task_id=task_id,
    username=username,
    knowledge_db_id=knowledge_db_id,
    file_meta=meta,
    priority=1,
    metadata=access_metadata,
)
```

这一步非常关键。

上传接口没有自己解析文件，而是发了一个 Kafka 消息。你可以把 Kafka 消息理解成一张“工单”：

```text
任务 ID 是什么？
谁上传的？
上传到哪个知识库？
文件在 MinIO 的哪里？
权限 metadata 是什么？
```

---

## 4. `kafka_producer.py`：发送任务的人

文件位置：

```text
backend/app/utils/kafka_producer.py
```

重点看：

```python
async def send_embedding_task(...)
```

Producer 的职责很简单：

```text
把 Python 字典打包成 JSON，发送到 Kafka topic。
```

### 4.1 判断 Kafka 是否启用

```python
if not settings.kafka_enabled:
    logger.warning(...)
    return
```

如果配置里关闭了 Kafka，函数会直接返回。这通常用于本地调试或降级。

### 4.2 组装消息

```python
message = {
    "task_id": task_id,
    "username": username,
    "knowledge_db_id": knowledge_db_id,
    "file_meta": file_meta,
    "metadata": metadata or {},
}
```

这个消息就是 Consumer 后面要处理的“任务说明书”。

一个简化后的消息大概长这样：

```json
{
  "task_id": "daziwei_xxx",
  "username": "daziwei",
  "knowledge_db_id": "daziwei_xxx",
  "file_meta": {
    "file_id": "daziwei_xxx",
    "minio_filename": "daziwei/resume.pdf",
    "original_filename": "resume.pdf",
    "minio_url": "http://minio/..."
  },
  "metadata": {
    "tenant_id": "daziwei",
    "org_id": "daziwei",
    "owner_username": "daziwei",
    "knowledge_db_id": "daziwei_xxx",
    "tags": []
  }
}
```

### 4.3 发到 Kafka

```python
await self.producer.send(
    KAFKA_TOPIC,
    json.dumps(message).encode("utf-8"),
    headers=[(KAFKA_PRIORITY_HEADER, str(priority).encode("utf-8"))],
)
```

这一步做了三件事：

```text
Python dict
  ↓ json.dumps
JSON 字符串
  ↓ encode("utf-8")
字节数据
  ↓ send
Kafka topic
```

Kafka 里存的是字节数据，所以要 encode。

---

## 5. `kafka_consumer.py`：后台任务处理器

文件位置：

```text
backend/app/utils/kafka_consumer.py
```

Consumer 可以理解成：

> 后台工人，专门从 Kafka 队列里取任务，然后交给真正的文件处理函数。

### 5.1 启动 Consumer

核心代码：

```python
self.consumer = AIOKafkaConsumer(
    KAFKA_TOPIC,
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    group_id=KAFKA_GROUP_ID,
    enable_auto_commit=False,
    max_poll_interval_ms=7200000,
)
await self.consumer.start()
```

几个关键词：

| 参数 | 含义 |
| --- | --- |
| `KAFKA_TOPIC` | 要监听哪个任务队列 |
| `bootstrap_servers` | Kafka 服务地址 |
| `group_id` | Consumer 组，同组 Consumer 可以分摊任务 |
| `enable_auto_commit=False` | 不自动确认消息，由代码手动提交 |

### 5.2 持续监听消息

重点看：

```python
async for msg in self.consumer:
    await self.consumer.commit()
    await self.process_message(msg)
```

它的意思是：

```text
只要 Kafka 有新消息，就一条一条取出来，然后交给 process_message。
```

注意：当前代码在 `process_message` 前就执行了 `commit()`。从严格可靠性角度看，更常见的做法是“处理成功后再 commit”。这里你面试时不用主动展开，除非面试官问 Kafka 消息可靠性。

### 5.3 处理单条消息

重点看：

```python
message = json.loads(msg.value.decode("utf-8"))
```

Kafka 里拿到的是字节数据，所以要还原：

```text
bytes
  ↓ decode("utf-8")
JSON 字符串
  ↓ json.loads
Python dict
```

然后取出关键信息：

```python
task_id = message["task_id"]
username = message["username"]
knowledge_db_id = message["knowledge_db_id"]
file_meta = message["file_meta"]
metadata = message.get("metadata", {})
```

接着更新 Redis 状态：

```python
await update_task_progress(
    redis_connection,
    task_id,
    "processing",
    f"Processing {file_meta['original_filename']}...",
)
```

最后把任务交给 `process_file`：

```python
await process_file(
    redis=redis_connection,
    task_id=task_id,
    username=username,
    knowledge_db_id=knowledge_db_id,
    file_meta=file_meta,
    metadata=metadata,
)
```

所以 Consumer 本身不负责解析 PDF，也不负责调用 Milvus。它负责的是：

```text
从 Kafka 拿任务
  ↓
解析任务消息
  ↓
更新任务状态
  ↓
调用 process_file
```

---

## 6. `process_file`：真正干活的函数

文件位置：

```text
backend/app/rag/utils.py
```

重点看：

```python
async def process_file(redis, task_id, username, knowledge_db_id, file_meta, metadata=None):
```

参数含义：

| 参数 | 含义 |
| --- | --- |
| `redis` | 用来更新任务状态 |
| `task_id` | 当前处理任务 ID |
| `username` | 上传用户 |
| `knowledge_db_id` | 当前知识库 ID |
| `file_meta` | 文件 ID、MinIO 文件名、原始文件名、URL |
| `metadata` | 权限过滤信息 |

### 6.1 补齐 metadata

```python
metadata = metadata or {}
metadata.setdefault("tenant_id", username)
metadata.setdefault("owner_username", username)
metadata.setdefault("knowledge_db_id", knowledge_db_id)
```

如果 Kafka 消息里没有传某些字段，这里会补默认值，避免后面入库缺少关键权限字段。

### 6.2 从 MinIO 读取文件

```python
file_content = await async_minio_manager.get_file_from_minio(
    file_meta["minio_filename"]
)
```

这一步根据 MinIO 文件名把原始文件取回来。

### 6.3 转换文件

```python
images_buffer = await convert_file_to_images(file_content, file_meta["original_filename"])
```

当前项目的处理方式偏“视觉文档 RAG”：先把文件转换成页面图片，再对页面图片生成向量。

这里的转换逻辑会根据文件类型走不同分支，例如 PDF、图片、TXT/MD、DOCX、Office 文档等。

### 6.4 生成 image_id

```python
image_ids = [f"{username}_{uuid.uuid4()}" for _ in range(len(images_buffer))]
```

如果一个 PDF 有 5 页，就会有 5 个页面图片，也就会生成 5 个 `image_id`。

### 6.5 生成向量

```python
embeddings = await generate_embeddings(
    images_buffer, file_meta["original_filename"]
)
```

这一步会调用 embedding 服务，把页面图片转换成向量。

向量是什么？

```text
向量是一组数字，用来表示这页文档的语义或视觉内容。
Milvus 后面就是根据这些数字做相似度检索。
```

### 6.6 写入 Milvus

```python
collection_name = f"colqwen{knowledge_db_id.replace('-', '_')}"
await insert_to_milvus(
    collection_name, embeddings, image_ids, file_meta["file_id"], metadata
)
```

每个知识库对应一个 Milvus collection。`knowledge_db_id` 里的 `-` 被替换成 `_`，是为了让 collection 名称更安全。

写入时不只写向量，还写：

```text
image_id
page_number
file_id
metadata
```

### 6.7 保存 MongoDB 元数据

```python
await db.create_files(...)
await db.knowledge_base_add_file(...)
await db.add_images(...)
```

MongoDB 保存的是业务元数据，比如：

```text
文件属于哪个知识库
文件原始名是什么
MinIO 文件路径是什么
每一页图片的 MinIO 路径是什么
```

### 6.8 更新任务完成状态

```python
await redis.hincrby(f"task:{task_id}", "processed", 1)
current = int(await redis.hget(f"task:{task_id}", "processed"))
total = int(await redis.hget(f"task:{task_id}", "total"))

if current == total:
    await redis.hset(f"task:{task_id}", "status", "completed")
```

每处理完一个文件，`processed` 加 1。如果处理数量等于总数量，就把任务标记为完成。

---

## 7. `milvus.py`：metadata 为什么能入库和过滤

文件位置：

```text
backend/app/db/milvus.py
```

### 7.1 动态字段

创建 collection 时有：

```python
schema = self.client.create_schema(
    auto_id=True,
    enable_dynamic_field=True,
)
```

`enable_dynamic_field=True` 的意思是：

```text
除了 schema 里固定定义的字段，也允许插入额外字段。
```

为什么重要？

因为 metadata 里有 `tenant_id`、`org_id`、`owner_username`、`knowledge_db_id` 等字段。如果没有开启动态字段，Milvus 可能会报错：

```text
Attempt to insert an unexpected field tenant_id
```

这个问题之前已经修复过。

### 7.2 写入 metadata

插入时有：

```python
{
    "vector": colqwen_vecs[i],
    "image_id": data["image_id"],
    "page_number": data["page_number"],
    "file_id": data["file_id"],
    **data.get("metadata", {}),
}
```

`**data.get("metadata", {})` 的意思是：

```text
把 metadata 字典展开，作为 Milvus 记录的一部分写进去。
```

例如：

```python
metadata = {
    "tenant_id": "daziwei",
    "owner_username": "daziwei",
    "knowledge_db_id": "daziwei_xxx"
}
```

写入后，每条向量记录都会带这些字段。

### 7.3 检索时按 metadata 过滤

过滤逻辑类似：

```python
tenant_id == 'xxx' and owner_username == 'xxx' and knowledge_db_id == 'xxx'
```

也就是说，RAG 召回不是只看相似度，还要先保证：

```text
这条向量属于当前用户可访问的知识库。
```

这就是多租户权限隔离的核心。

---

## 8. 一句话串起今天内容

你可以这样理解：

> `base.py` 接收上传请求，把文件放到 MinIO，并通过 `kafka_producer.py` 发出处理任务；`kafka_consumer.py` 在后台从 Kafka 取任务，调用 `process_file` 完成文件读取、转换、向量化和 Milvus 入库；Milvus 中的每条向量都带有 metadata，后续 RAG 检索时会按用户、租户和知识库进行过滤，保证召回内容与访问权限一致。

---

## 9. 面试表达模板

### 9.1 上传链路怎么设计？

> 用户上传文档后，FastAPI 上传接口先校验用户和知识库权限，然后将原始文件保存到 MinIO，并在 Redis 中初始化任务状态。接口不会同步解析文件，而是通过 Kafka Producer 投递异步处理任务。后台 Kafka Consumer 消费任务后调用 `process_file`，完成文档转换、向量化、Milvus 入库和 MongoDB 元数据保存。这样可以避免大文件上传阻塞接口，也方便后续横向扩展多个 Consumer。

### 9.2 为什么要用 Kafka？

> 文档解析、Office 转换和向量化都属于耗时任务。如果在上传接口里同步完成，接口容易超时，也会影响用户体验。Kafka 可以把上传和处理解耦，让接口快速返回，后台再异步处理任务。

### 9.3 Kafka Consumer 做什么？

> Consumer 是后台任务处理器。它持续监听 Kafka topic，收到文件处理消息后解析出 `task_id`、`file_meta`、`knowledge_db_id` 和 metadata，先更新 Redis 任务状态，再调用 `process_file` 执行实际文件处理。

### 9.4 metadata 有什么用？

> metadata 用来记录文档归属和权限边界，比如租户、组织、用户、知识库和标签。向量写入 Milvus 时携带这些字段，检索时再按这些字段过滤，避免用户召回没有权限访问的内容。

### 9.5 `await` 有什么用？

> `await` 用于等待异步操作完成，例如 Redis 写入、MinIO 文件读取、Kafka 发送消息、Embedding 请求和 Milvus 操作。等待期间服务不会被阻塞，可以继续处理其他请求。

---

## 10. 课后检查清单

学完今天内容后，你应该能回答：

- 上传接口在哪个文件？
- 文件为什么要先存 MinIO？
- Kafka Producer 发送的消息里有哪些字段？
- Kafka Consumer 为什么不是直接接收前端请求？
- `process_file` 做了哪几步？
- metadata 是在哪里构造、在哪里传递、在哪里入库的？
- Milvus 为什么要开启 dynamic field？
- Redis 在上传链路中保存了什么状态？

如果这些问题都能讲出来，你就已经能把简历里的“异步文件处理链路”和“多租户权限隔离”讲得比较完整了。
