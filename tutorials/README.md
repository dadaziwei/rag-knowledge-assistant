# DaziKnow 教程目录

这里集中保存项目学习、代码导读和面试复盘文档。README 只保留项目入口，详细教程统一放在本目录，方便持续扩展。

## 推荐学习顺序

1. [学习路线总览](./learning-path/README.md)
2. [Day 1：系统入口、配置与服务拓扑](./learning-path/day-01-system-overview.md)
3. [async / await 基础](./backend/async-await.md)
4. [文件上传接口：base.py](./backend/upload-api.md)
5. [Kafka Producer 与 Consumer](./backend/kafka-producer-consumer.md)
6. [process_file、Milvus 与 metadata 入库](./backend/process-file-and-milvus.md)
7. [RAG 项目常见面试题](./interview/rag-project-qa.md)
8. [敏感信息与 GitHub 发布规范](./security/secret-management.md)

## 分类说明

| 分类 | 目录 | 内容 |
| --- | --- | --- |
| 学习路线 | [learning-path](./learning-path/README.md) | 每天怎么学、按什么顺序看代码 |
| 后端链路 | [backend](./backend/README.md) | 上传、Kafka、Consumer、process_file、Milvus |
| 面试复盘 | [interview](./interview/README.md) | 简历表达和常见问题答案 |
| 安全规范 | [security](./security/README.md) | 密钥、`.env`、GitHub 发布注意事项 |

## 学习建议

不要一上来从头到尾读代码。这个项目的正确打开方式是：

```text
先看系统拓扑
  ↓
再看上传链路
  ↓
再看异步处理
  ↓
最后看 RAG 检索和问答
```

每学完一个文件，都试着回答两个问题：

- 这个文件在链路中负责什么？
- 如果面试官问我，我能不能用 1 分钟讲清楚？
