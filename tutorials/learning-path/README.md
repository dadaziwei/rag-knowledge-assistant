# 学习路线总览

这个目录记录按天学习的路线。目标是让你逐步掌握项目，而不是被大量代码淹没。

## 当前路线

| 天数 | 主题 | 目标 |
| --- | --- | --- |
| Day 1 | [系统入口、配置与服务拓扑](./day-01-system-overview.md) | 知道系统由哪些服务组成，请求从哪里进入 |
| Day 2 | 上传链路与异步处理 | 分散在 `backend/` 分类下学习上传、Kafka、Consumer 和 Milvus |

## 先掌握什么

第一阶段只需要建立这张地图：

```text
Nginx / Frontend
  ↓
FastAPI Backend
  ↓
Redis / MongoDB / MySQL / MinIO / Kafka / Milvus
  ↓
DeepSeek / Embedding / unoserver
```

第二阶段再进入链路：

```text
文件上传
  ↓
MinIO
  ↓
Kafka
  ↓
Consumer
  ↓
process_file
  ↓
Milvus
```

## 学习方式

- 先读教程，再看对应代码。
- 不懂语法时先问语法，不要硬猜。
- 看每个函数时只问三件事：输入是什么、做了什么、输出给谁。
- 学完一段后，用自己的话复述一遍。
