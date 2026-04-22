# 敏感信息与 GitHub 发布规范

本项目公开发布时必须遵守这些规则。

## 1. 不提交真实 `.env`

`.env` 是本地真实配置，可能包含：

```text
DEEPSEEK_API_KEY
JINA_API_KEY
数据库密码
Redis 密码
MinIO 密钥
JWT SECRET_KEY
```

这些内容不能进入 GitHub。

## 2. 只提交 `.env.example`

`.env.example` 用来告诉别人需要哪些配置，但值必须是占位符：

```text
DEEPSEEK_API_KEY=replace-with-your-deepseek-api-key
JINA_API_KEY=replace-with-your-jina-api-key
SECRET_KEY=replace-with-a-long-random-secret
```

## 3. `.gitignore` 要覆盖环境文件

建议规则：

```gitignore
.env
.env.*
*.env
!.env.example
```

这表示忽略真实环境文件，但允许提交示例文件。

## 4. 上传前执行扫描

可以用下面思路检查：

```powershell
rg -n -uu "sk-[A-Za-z0-9_-]{12,}|DEEPSEEK_API_KEY\\s*=\\s*sk-|JINA_API_KEY\\s*=\\s*sk-|gho_[A-Za-z0-9_]+"
```

如果有命中，先删除或替换占位符，再提交。

## 5. 如果密钥已经泄露

如果真实密钥曾经进入公开仓库，不要只删除文件。正确做法是：

1. 到服务商后台吊销旧密钥。
2. 重新生成新密钥。
3. 本地 `.env` 使用新密钥。
4. 清理 Git 历史或重新创建无历史的干净仓库。

## 6. 当前仓库处理方式

当前公开仓库使用的是干净发布方式：

```text
不推送原始历史
  ↓
复制不含 .git 和 .env 的发布副本
  ↓
重新 git init
  ↓
提交并推送到 GitHub
```

这样可以避免 `.env` 这类文件藏在历史提交中。
