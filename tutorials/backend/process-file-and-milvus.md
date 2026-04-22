# process_file、Milvus 与 metadata 入库

这部分是真正干活的文件处理链路。

对应文件：

```text
backend/app/rag/utils.py
backend/app/db/milvus.py
```

## 1. process_file 的职责

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

主流程：

```text
补齐 metadata
  ↓
从 MinIO 读取文件
  ↓
转换文件
  ↓
生成 image_id
  ↓
生成向量
  ↓
写入 Milvus
  ↓
保存 MongoDB 元数据
  ↓
更新 Redis 任务状态
```

## 2. 补齐 metadata

```python
metadata = metadata or {}
metadata.setdefault("tenant_id", username)
metadata.setdefault("owner_username", username)
metadata.setdefault("knowledge_db_id", knowledge_db_id)
```

如果 Kafka 消息里没有传某些字段，这里会补默认值，避免后面入库缺少关键权限字段。

## 3. 从 MinIO 读取文件

```python
file_content = await async_minio_manager.get_file_from_minio(
    file_meta["minio_filename"]
)
```

这一步根据 MinIO 文件名把原始文件取回来。

## 4. 转换文件

```python
images_buffer = await convert_file_to_images(file_content, file_meta["original_filename"])
```

当前项目的处理方式偏视觉文档 RAG：先把文件转换成页面图片，再对页面图片生成向量。

转换逻辑会根据文件类型走不同分支，例如 PDF、图片、TXT/MD、DOCX、Office 文档等。

## 5. 生成向量

```python
embeddings = await generate_embeddings(
    images_buffer, file_meta["original_filename"]
)
```

向量是一组数字，用来表示这页文档的语义或视觉内容。Milvus 后面就是根据这些数字做相似度检索。

## 6. 写入 Milvus

```python
collection_name = f"colqwen{knowledge_db_id.replace('-', '_')}"
await insert_to_milvus(
    collection_name, embeddings, image_ids, file_meta["file_id"], metadata
)
```

每个知识库对应一个 Milvus collection。写入时不只写向量，还写：

```text
image_id
page_number
file_id
metadata
```

## 7. 保存 MongoDB 元数据

```python
await db.create_files(...)
await db.knowledge_base_add_file(...)
await db.add_images(...)
```

MongoDB 保存的是业务元数据：

```text
文件属于哪个知识库
文件原始名是什么
MinIO 文件路径是什么
每一页图片的 MinIO 路径是什么
```

## 8. 更新任务完成状态

```python
await redis.hincrby(f"task:{task_id}", "processed", 1)
current = int(await redis.hget(f"task:{task_id}", "processed"))
total = int(await redis.hget(f"task:{task_id}", "total"))

if current == total:
    await redis.hset(f"task:{task_id}", "status", "completed")
```

每处理完一个文件，`processed` 加 1。如果处理数量等于总数量，就把任务标记为完成。

## 9. Milvus 动态字段

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

这对 metadata 很重要。否则 Milvus 可能会报：

```text
Attempt to insert an unexpected field tenant_id
```

## 10. 写入 metadata

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

`**data.get("metadata", {})` 的意思是把 metadata 字典展开，作为 Milvus 记录的一部分写进去。

## 11. 检索时按 metadata 过滤

过滤逻辑类似：

```text
tenant_id == 'xxx' and owner_username == 'xxx' and knowledge_db_id == 'xxx'
```

也就是说，RAG 召回不是只看相似度，还要保证这条向量属于当前用户可访问的知识库。

## 面试怎么说

> process_file 是异步文件处理链路的核心函数。Kafka Consumer 收到文件处理任务后，会调用 process_file。它根据 file_meta 从 MinIO 获取原始文件，解析并转换为页面图片，然后生成 embedding，最后将向量、页面信息、文件 ID 和权限 metadata 一起写入 Milvus。同时它会把文件和页面元数据保存到 MongoDB，并通过 Redis 更新任务进度。
