# 02 用户反馈闭环

## 这个功能解决什么问题

很多 RAG 项目做完以后，表面上能回答问题，但团队很快会遇到一个更现实的问题：

- 哪些回答用户觉得有帮助？
- 哪些回答虽然生成了，但其实没解决问题？
- 哪些知识库内容经常被命中，却依然让用户不满意？

如果没有反馈闭环，后续优化就只能靠感觉。

这个功能的目标，就是先把最基础、最关键的数据采集起来：

```text
用户问题
  + AI 回答
  + 引用来源
  + 用户反馈
  + 时间
```

## 为什么企业需要

企业不会长期接受“模型看起来还行”这种模糊状态。

真正落地以后，业务方会关心：

1. 这个助手到底有没有帮员工省时间
2. 哪类问题答得最好，哪类问题最差
3. 哪些知识库该补文档
4. 哪些回答需要人工兜底

所以一个更像企业系统的做法是：

```text
先采集最简单的有帮助 / 待改进反馈
  ↓
沉淀可分析的问答样本
  ↓
再去做知识缺口分析、效果评估和检索优化
```

## 这一轮改了什么

### 后端

- 在 `backend/app/models/conversation.py` 中新增反馈请求模型
- 在 `backend/app/api/endpoints/chat.py` 中新增对话反馈接口
- 在 `backend/app/db/mongo.py` 中新增 `update_turn_feedback`
- 将反馈写入对应 turn 的 `ai_message.feedback`

反馈结构目前很轻量：

```json
{
  "rating": "helpful",
  "updated_at": "2026-04-27T12:34:56+08:00"
}
```

### 前端

- 在 `frontend/src/components/AiChat/ChatMessage.tsx` 中为 AI 文本消息增加“有帮助 / 待改进”按钮
- 在 `frontend/src/app/[locale]/ai-chat/page.tsx` 中新增反馈提交和本地状态更新
- 在 `frontend/src/lib/api/chatApi.ts` 中新增反馈 API 调用
- 在历史消息回放时，一并恢复已保存的反馈状态

## 涉及文件

- `backend/app/models/conversation.py`
- `backend/app/api/endpoints/chat.py`
- `backend/app/db/mongo.py`
- `frontend/src/types/types.ts`
- `frontend/src/lib/api/chatApi.ts`
- `frontend/src/app/[locale]/ai-chat/page.tsx`
- `frontend/src/components/AiChat/ChatBox.tsx`
- `frontend/src/components/AiChat/ChatMessage.tsx`
- `frontend/messages/zh-CN.json`
- `frontend/messages/en.json`

## 怎么验证

### 功能验证

1. 发起一轮正常的 RAG 对话
2. 等 AI 返回完整回答
3. 点击“有帮助”或“待改进”
4. 检查按钮高亮状态是否立即变化
5. 刷新页面后重新进入这段历史对话
6. 检查之前点过的反馈状态是否还在

### 契约验证

运行：

```powershell
python -m unittest tests.test_resume_rag_upgrade
```

确认新增的 feedback loop 契约测试通过。

### 安全验证

提交前执行敏感信息扫描，确认没有把真实密钥、token 或默认凭据带进仓库：

```powershell
rg -n -uu --hidden --glob '!**/.git/**' "replace-with-your-|real api key|real token|default credentials" .
```

## 这一步的价值

这个版本还不是完整的“效果评估平台”，但它已经把后续升级最重要的地基铺好了：

- 以后可以统计点赞率 / 点踩率
- 可以分析哪些知识库最容易产生差评
- 可以把“待改进”样本回流给检索优化
- 可以为知识缺口分析和人工兜底提供依据

## 简历怎么写

> 设计并实现企业知识问答的用户反馈闭环，在历史会话中关联保存问题、回答、引用来源与有帮助/待改进反馈，为后续知识缺口分析、检索优化和效果评估提供数据基础。

## 面试怎么讲

> 我没有把这个系统只做成一个“能聊天”的 RAG Demo，而是补了最基础的效果反馈闭环。用户在每条 AI 回答后都可以做有帮助或待改进标记，后端把这类反馈直接挂到对应的 turn 上，和原始问题、回答内容、引用来源一起持久化。这样后面我们就能继续往上做点赞率统计、问题分类、知识缺口分析，甚至针对差评样本去优化检索链路。这一步本身不复杂，但很关键，因为它把系统从“生成答案”推进到了“可以持续改进答案”。 
