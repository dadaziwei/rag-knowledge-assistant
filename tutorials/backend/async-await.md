# async / await 基础

项目里很多代码前面都有 `await`，比如：

```python
redis_connection = await redis.get_task_connection()
await redis_connection.hset(...)
minio_filename, minio_url = await save_file_to_minio(username, file)
await kafka_producer_manager.send_embedding_task(...)
```

`await` 可以先理解成：

> 当前操作需要等外部系统返回结果，我先挂起当前任务，等结果回来后再继续往下执行。

## 哪些操作需要等待

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

## 和 async 的关系

通常只有 `async def` 定义的异步函数里，才能使用 `await`：

```python
async def upload_multiple_files(...):
    minio_filename, minio_url = await save_file_to_minio(username, file)
```

简单记法：

```text
async 表示这个函数支持异步。
await 表示这里要等待一个异步操作完成。
```

## 面试怎么说

> `await` 用于等待异步操作完成，例如 Redis 写入、MinIO 文件读取、Kafka 发送消息、Embedding 请求和 Milvus 操作。等待期间服务不会被阻塞，可以继续处理其他请求。
