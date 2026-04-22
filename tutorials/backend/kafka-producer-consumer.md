# Kafka Producer 与 Consumer

Kafka 在这个项目里承担的是异步任务队列。

```text
Producer 负责发任务。
Consumer 负责拿任务并触发处理。
```

对应文件：

```text
backend/app/utils/kafka_producer.py
backend/app/utils/kafka_consumer.py
```

## 1. Producer：发送任务的人

重点看：

```python
async def send_embedding_task(...)
```

Producer 的职责是：

```text
把 Python 字典打包成 JSON，发送到 Kafka topic。
```

### 判断 Kafka 是否启用

```python
if not settings.kafka_enabled:
    logger.warning(...)
    return
```

如果配置里关闭了 Kafka，函数会直接返回。这通常用于本地调试或降级。

### 组装消息

```python
message = {
    "task_id": task_id,
    "username": username,
    "knowledge_db_id": knowledge_db_id,
    "file_meta": file_meta,
    "metadata": metadata or {},
}
```

这个消息就是 Consumer 后面要处理的任务说明书。

### 发到 Kafka

```python
await self.producer.send(
    KAFKA_TOPIC,
    json.dumps(message).encode("utf-8"),
    headers=[(KAFKA_PRIORITY_HEADER, str(priority).encode("utf-8"))],
)
```

转换过程：

```text
Python dict
  ↓ json.dumps
JSON 字符串
  ↓ encode("utf-8")
字节数据
  ↓ send
Kafka topic
```

## 2. Consumer：后台任务处理器

Consumer 可以理解成后台工人，专门从 Kafka 队列里取任务，然后交给真正的文件处理函数。

### 启动 Consumer

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

### 持续监听消息

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

注意：当前代码在 `process_message` 前就执行了 `commit()`。从严格可靠性角度看，更常见的做法是“处理成功后再 commit”。面试时不用主动展开，除非面试官问 Kafka 消息可靠性。

### 处理单条消息

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

## 面试怎么说

> Kafka Consumer 是文件异步处理链路的后台消费者。上传接口把文件保存到 MinIO 后，会通过 Kafka Producer 发送一个处理任务，消息里包含 task_id、用户信息、知识库 ID、文件元信息和权限 metadata。Consumer 持续监听 Kafka topic，拿到消息后先更新 Redis 任务状态，然后调用 process_file 完成后续文件处理。
