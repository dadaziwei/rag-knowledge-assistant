# 后端链路教程

这个目录专门讲后端代码。建议按下面顺序看：

1. [async / await 基础](./async-await.md)
2. [文件上传接口：base.py](./upload-api.md)
3. [Kafka Producer 与 Consumer](./kafka-producer-consumer.md)
4. [process_file、Milvus 与 metadata 入库](./process-file-and-milvus.md)

## 总链路

```text
base.py
  ↓
kafka_producer.py
  ↓
kafka_consumer.py
  ↓
rag/utils.py process_file
  ↓
db/milvus.py
```

先记住一句话：

> 上传接口只负责接住文件并发出任务，真正耗时的解析和向量化由后台 Consumer 慢慢处理。
