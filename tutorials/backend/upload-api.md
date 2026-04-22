# 文件上传接口：base.py

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

## 1. 校验当前用户

代码逻辑：

```python
username = knowledge_db_id.split("_")[0]
await verify_username_match(current_user, username)
```

知识库 ID 一般类似：

```text
daziwei_xxx-xxx-xxx
```

`split("_")[0]` 可以拿到用户名 `daziwei`。后面的校验是为了确认当前登录用户是不是这个知识库的拥有者。

## 2. 构造权限 metadata

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

这些字段会一路传到 Milvus：

| 字段 | 含义 |
| --- | --- |
| `tenant_id` | 租户 ID |
| `org_id` | 组织 ID |
| `owner_username` | 文件属于哪个用户 |
| `knowledge_db_id` | 文件属于哪个知识库 |
| `tags` | 标签 |

RAG 检索不是只看语义相似，还必须看用户有没有权限。metadata 就是权限过滤依据。

## 3. Redis 初始化任务状态

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

Redis 记录任务进度。比如上传 3 个文件，初始状态就是：

```text
status: processing
total: 3
processed: 0
message: Initializing file processing...
```

前端可以通过任务 ID 查询进度，所以用户能看到“文件处理中”。

## 4. 文件保存到 MinIO

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

## 5. 发送 Kafka 任务

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

上传接口没有自己解析文件，而是发了一个 Kafka 消息。你可以把 Kafka 消息理解成一张工单：

```text
任务 ID 是什么？
谁上传的？
上传到哪个知识库？
文件在 MinIO 的哪里？
权限 metadata 是什么？
```

## 面试怎么说

> 上传接口先校验用户和知识库权限，然后把原始文件保存到 MinIO，并在 Redis 中初始化任务状态。接口不会同步解析文件，而是通过 Kafka Producer 投递异步处理任务，后续由后台 Consumer 执行解析和向量化。
