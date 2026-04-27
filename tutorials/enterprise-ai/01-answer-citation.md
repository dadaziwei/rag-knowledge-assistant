# 01 回答引用与来源追踪

## 这个功能解决什么问题

企业不会只关心“AI 能不能回答”，还会追问：

- 这句话依据的是哪份文档？
- 依据的是哪一页？
- 如果答案有问题，我怎么回溯证据？

普通聊天机器人往往只给答案，不给证据。这样一旦进入制度、流程、绩效、合规场景，就很难被信任。

这个功能的目标，就是把问答结果从“像在猜”升级成“有依据可追溯”。

## 为什么企业需要

在企业知识问答场景里，最怕三件事：

1. 模型说得像真的，但没有依据
2. 用户不知道答案来自哪份制度
3. 回答出错后，无法回溯命中的知识内容

所以一个更像企业系统的做法是：

```text
回答正文
  + 引用摘要
  + 可展开证据详情
  + 与历史记录一起持久化
```

## 这一轮改了什么

### 后端

- 在 `backend/app/rag/llm_service.py` 中新增 citations 构建逻辑
- 基于已命中的 `file_used` 和 `retrieved_contexts` 生成引用摘要
- SSE / WebSocket 流式消息新增 `citations` 事件
- 保存对话时，把 citations 一起写入 `ai_message`

### 前端

- 在 AI 文本消息下方新增“本次回答依据”摘要框
- 展示文件名、页码、检索分数和截断摘要
- 保留原来的参考文件详情卡片，但把展开入口收敛到回答摘要区
- 历史消息回放时也能看到同样的引用信息

## 涉及文件

- `backend/app/rag/llm_service.py`
- `frontend/src/types/types.ts`
- `frontend/src/app/[locale]/ai-chat/page.tsx`
- `frontend/src/components/AiChat/ChatMessage.tsx`
- `frontend/messages/zh-CN.json`
- `frontend/messages/en.json`

## 怎么验证

### 功能验证

1. 选择一个已上传文档的知识库
2. 提一个能明确命中文档的问题
3. 检查回答下方是否出现“本次回答依据”
4. 检查摘要里是否包含文件名、页码、分数、截断内容
5. 点击“查看证据详情”，确认可展开参考文件卡片
6. 刷新页面后重新进入历史对话，确认引用摘要仍然存在

### 契约验证

运行：

```powershell
python -m unittest tests.test_resume_rag_upgrade
```

确认新的 citations 契约测试通过。

### 安全验证

提交前执行密钥扫描，确认没有真实 API Key、GitHub token 或硬编码默认凭据混入：

```powershell
rg -n -uu --hidden --glob '!**/.git/**' "replace-with-your-|real api key|real token|default credentials" .
```

## 简历怎么写

> 为企业知识问答系统设计并实现回答引用与来源追踪机制，在流式回答中同步返回文档名、页码、检索分数和证据摘要，并将引用信息持久化到历史会话中，提升制度类问答的可解释性与可信度。

## 面试怎么讲

> 我在原有 RAG 问答链路上增加了回答引用能力。后端在检索完成后，不只把命中的文件作为附件返回，还会基于命中的文件和文本上下文生成 citations 摘要，包括文件名、页码、检索分数和证据片段。前端在回答正文旁边展示“本次回答依据”，用户可以直接看到答案基于哪些知识，并进一步展开查看详细参考文件。这样可以提升企业制度问答场景下的可信度，也便于后续审计和问题回溯。
