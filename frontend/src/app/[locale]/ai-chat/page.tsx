"use client";
import Cookies from "js-cookie";
import { useCallback, useEffect, useRef, useState } from "react";
import React from "react";
import Navbar from "@/components/NavbarComponents/Navbar";
import withAuth from "@/middlewares/withAuth";
import LeftSidebar from "@/components/AiChat/LeftSidebar";
import ChatBox from "@/components/AiChat/ChatBox";
import {
  Message,
  Chat,
  Citation,
  FileResponse,
  FeedbackInsights,
  FileUsed,
  MessageFeedback,
  ModelConfig,
  KnowledgeBase,
} from "@/types/types";
import { useAuthStore } from "@/stores/authStore";
import { v4 as uuidv4 } from "uuid";
import {
  createConversation,
  deleteAllConversations,
  deleteConversations,
  getFeedbackInsights,
  getChatContent,
  getChatHistory,
  renameChat,
  submitChatFeedback,
  updateChatModelConfig,
} from "@/lib/api/chatApi";
import useChatStore from "@/stores/chatStore";
import { getFileExtension } from "@/utils/file";
import { EventSourceParserStream } from "eventsource-parser/stream";
import useModelConfigStore from "@/stores/configStore";
import { getAllModelConfig } from "@/lib/api/configApi";
import { getAllKnowledgeBase } from "@/lib/api/knowledgeBaseApi";
import { useTranslations } from "next-intl"; // 添加多语言支持

const AIChat: React.FC = () => {
  const t = useTranslations("AIChat");

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [feedbackInsights, setFeedbackInsights] = useState<FeedbackInsights | null>(
    null
  );
  const { user } = useAuthStore();
  const [conversationName, setConversationName] = useState<string>("");
  const [sendDisabled, setSendDisabled] = useState(false);
  const [receivingMessageId, setReceivingMessageId] = useState<string | null>(
    null
  );
  const chatIdRef = useRef<string | null>(null);
  const [receivingMessages, setReceivingMessages] = useState<Message[]>([]);
  const { chatId, setChatId } = useChatStore();
  const { modelConfig, setModelConfig } = useModelConfigStore();

  useEffect(() => {
    if (chatId !== "") {
      chatIdRef.current = chatId;
    }
  }, [chatId]);

  useEffect(() => {
    setChatId("")
  }, [setChatId]);

  // Wrap fetchModelConfig with useCallback
  const fetchModelConfig = useCallback(async () => {
    if (user?.name) {
      const responseBase = await getAllKnowledgeBase(user.name);
      const bases: KnowledgeBase[] = responseBase.data.map((item: any) => ({
        name: item.knowledge_base_name,
        id: item.knowledge_base_id,
        selected: false,
      }));

      const response = await getAllModelConfig(user.name);

      const modelConfigsResponse: ModelConfig[] = response.data.models.map(
        (item: any) => ({
          modelId: item.model_id,
          modelName: item.model_name,
          modelURL: item.model_url,
          apiKey: item.api_key,
          baseUsed: item.base_used,
          systemPrompt: item.system_prompt,
          temperature: item.temperature === -1 ? 0.1 : item.temperature,
          maxLength: item.max_length === -1 ? 8192 : item.max_length,
          topP: item.top_P === -1 ? 0.01 : item.top_P,
          topK: item.top_K === -1 ? 3 : item.top_K,
          scoreThreshold:
            item.score_threshold === -1 ? 10 : item.score_threshold,
          useTemperatureDefault: item.temperature === -1 ? true : false,
          useMaxLengthDefault: item.max_length === -1 ? true : false,
          useTopPDefault: item.top_P === -1 ? true : false,
          useTopKDefault: item.top_K === -1 ? true : false,
          useScoreThresholdDefault: item.score_threshold === -1 ? true : false,
        })
      );

      const selected = modelConfigsResponse.find(
        (m) => m.modelId === response.data.selected_model
      );

      if (selected) {
        const filter_select = selected.baseUsed.filter((item) =>
          bases.some((base) => base.id === item.baseId)
        );
        setModelConfig((prev) => ({
          ...prev,
          ...selected,
          baseUsed: filter_select,
        }));
      }
    }
  }, [user?.name, setModelConfig]); // Dependencies added

  useEffect(() => {
    fetchModelConfig();
  }, [fetchModelConfig]); // Added fetchModelConfig

  const fetchFeedbackInsightSummary = useCallback(async () => {
    if (user?.name) {
      try {
        const response = await getFeedbackInsights(user.name);
        setFeedbackInsights(response.data.insights);
      } catch (error) {
        console.error("Error fetching feedback insights:", error);
      }
    }
  }, [user?.name]);

  const fetchChatHistory = useCallback(async () => {
    if (user?.name) {
      try {
        const response = await getChatHistory(user.name);
        const chats = response.data.map((item: any) => ({
          name: item.conversation_name,
          conversationId: item.conversation_id,
          isRead: item.is_read,
          lastModifyTime: item.last_modify_at,
          createTime: item.created_at,
          messages: [],
        }));
        setChatHistory(chats);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    }
  }, [user?.name]); // Dependency added

  useEffect(() => {
    fetchChatHistory();
    if (chatId === "") {
      const uniqueId = uuidv4();
      setChatId(user?.name + "_" + uniqueId);
    }
  }, [user?.name, chatId, conversationName, setChatId, fetchChatHistory]); // Added fetchChatHistory

  useEffect(() => {
    fetchFeedbackInsightSummary();
  }, [fetchFeedbackInsightSummary]);

  const handleNewChat = async () => {
    setMessages([]);
    setChatId("");
    fetchModelConfig();
  };

  const handleSelectChat = (inputChatId: string, isRead: boolean) => {
    const fetchChatHistoryMessage = async () => {
      if (user?.name) {
        try {
          const response = await getChatContent(inputChatId);
          const item = response.data.chat_model_config;
          setModelConfig({
            modelId: item.model_id,
            modelName: item.model_name,
            modelURL: item.model_url,
            apiKey: item.api_key,
            baseUsed: item.base_used,
            systemPrompt: item.system_prompt,
            temperature: item.temperature === -1 ? 0.1 : item.temperature,
            maxLength: item.max_length === -1 ? 8192 : item.max_length,
            topP: item.top_P === -1 ? 0.01 : item.top_P,
            topK: item.top_K === -1 ? 3 : item.top_K,
            scoreThreshold:
              item.score_threshold === -1 ? 10 : item.score_threshold,
            useTemperatureDefault: item.temperature === -1 ? true : false,
            useMaxLengthDefault: item.max_length === -1 ? true : false,
            useTopPDefault: item.top_P === -1 ? true : false,
            useTopKDefault: item.top_K === -1 ? true : false,
            useScoreThresholdDefault:
              item.score_threshold === -1 ? true : false,
          });
          const messages: Message[] = response.data.turns
            .map((item: any) => {
              const text = item.user_message.content.find(
                (content: { type: string }) => content.type == "text"
              );
              const file_used = item.file_used;
              const images = item.user_file.filter(
                (file: { filename: string }) =>
                  ["png", "jpg", "jpeg", "gif"].includes(
                    getFileExtension(file.filename)
                  )
              );
              const files = item.user_file.filter(
                (file: { filename: string }) =>
                  !["png", "jpg", "jpeg", "gif"].includes(
                    getFileExtension(file.filename)
                  )
              );

              return [
                ...images.map((file: any) => ({
                  type: "image",
                  content: file.filename,
                  minioUrl: file.url,
                  from: "user",
                })),
                ...files.map((file: any) => ({
                  type: "file",
                  content: "image",
                  fileName: file.filename,
                  fileType: getFileExtension(file.filename), // 新增文件类型字段
                  minioUrl: file.url,
                  from: "user",
                })),
                {
                  type: "text",
                  content: `${text.text}`,
                  parentMessageId:
                    item.parent_message_id === ""
                      ? "root"
                      : item.parent_message_id,
                  from: "user",
                },
                {
                  type: "text",
                  content: `${item.ai_message.content}`,
                  citations: item.ai_message.citations || [],
                  feedback: item.ai_message.feedback || null,
                  messageId: `${item.message_id}`,
                  parentMessageId:
                    item.parent_message_id === ""
                      ? "root"
                      : item.parent_message_id,
                  from: "ai",
                  token_number: {
                    total_token: `${item.total_token}`,
                    completion_tokens: `${item.completion_tokens}`,
                    prompt_tokens: `${item.prompt_tokens}`,
                  },
                },

                ...file_used.map((file: FileUsed, index: number) => ({
                  type: "baseFile",
                  content: `image_${index}`,
                  imageMinioUrl: file.image_url,
                  fileName: file.file_name,
                  messageId: `${item.message_id}`,
                  baseId: file.knowledge_db_id,
                  minioUrl: file.file_url,
                  score: file.score,
                  pageNumber: file.page_number,
                  hideReferenceToggle: (item.ai_message.citations || []).length > 0,
                  from: "ai",
                })),
              ];
            })
            .flat(); // 使用 flat 将嵌套数组平铺
          setMessages(messages);
          setChatId(inputChatId);
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    fetchChatHistoryMessage(); // 调用获取聊天记录的函数
  };

  const handledeleteAllChat = (chatHistory: Chat[]) => {
    const fetchDeleteAllChat = async () => {
      if (user?.name) {
        try {
          await deleteAllConversations(user.name);
          handleNewChat();
          fetchFeedbackInsightSummary();
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    fetchDeleteAllChat(); // 调用获取聊天记录的函数
  };

  const handledeleteChat = (chat: Chat) => {
    const fetchdeleteChat = async () => {
      if (user?.name) {
        try {
          // 从 chatHistory 中移除已删除的聊天记录
          setChatHistory((prevChatHistory: Chat[]) =>
            prevChatHistory.filter(
              (c: { conversationId: string }) =>
                c.conversationId !== chat.conversationId
            )
          );
          await deleteConversations(chat.conversationId);
          fetchFeedbackInsightSummary();
          // 如果当前对话被删除，重置消息和对话 ID
          if (chatId === chat.conversationId) {
            handleNewChat();
          }
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    fetchdeleteChat(); // 调用获取聊天记录的函数
  };

  const handleRenameChat = (chat: Chat, inputValue: string) => {
    const fetchRenameChat = async () => {
      if (user?.name) {
        try {
          // 从 chatHistory 中移除已删除的聊天记录
          setChatHistory((prevChatHistory: Chat[]) =>
            prevChatHistory.map((c) =>
              c.conversationId === chat.conversationId
                ? { ...c, name: inputValue }
                : c
            )
          );
          await renameChat(chat.conversationId, inputValue);
          setConversationName(inputValue);
        } catch (error) {
          console.error("Error fetching rename chat:", error);
        }
      }
    };

    fetchRenameChat(); // 调用获取聊天记录的函数
  };

  // 添加 AbortController 引用
  const abortControllerRef = useRef<AbortController | null>(null);

  const sseConnection = async (
    conversationId: string,
    parentId: string,
    message: string,
    tempBaseId: string,
    userMessages: Message[] // 新增参数
  ) => {
    let aiMessage = "";
    let aiThinking = "";
    let messageId = "";
    let total_token: number = 0;
    let completion_tokens: number = 0;
    let prompt_tokens: number = 0;
    let file_used: FileUsed[] = [];
    let citations: Citation[] = [];

    // 节流控制
    let throttleTimeout: NodeJS.Timeout | null = null;
    let shouldUpdate = true;

    setReceivingMessageId(conversationId);

    try {
      const token = Cookies.get("token");

      // 创建新的 AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      //const response = await fetch("http://192.168.1.5:8000/api/v1/sse/chat", {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sse/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            parent_id: parentId === "root" ? "" : parentId,
            user_message: message,
            temp_db: tempBaseId,
          }),
          signal: controller.signal, // 添加 signal
        }
      );

      if (!response.ok) throw new Error("Request failed");
      if (!response.body) return;

      // 使用EventSourceParserStream处理流
      const eventStream = response.body
        ?.pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream());

      const eventReader = eventStream.getReader();
      while (true) {
        const { done, value } = (await eventReader?.read()) || {};
        if (done) break;

        const payload = JSON.parse(value.data);

        if (payload.type === "file_used") {
          file_used = payload.data; // 自动处理原始换行符
          messageId = payload.message_id;
        }

        if (payload.type === "citations") {
          citations = payload.data;
          messageId = payload.message_id;
        }

        if (payload.type === "thinking") {
          aiThinking += payload.data; // 自动处理原始换行符
          messageId = payload.message_id;
        }

        if (payload.type === "text") {
          aiMessage += payload.data; // 自动处理原始换行符
          messageId = payload.message_id;
        }

        if (payload.type === "token") {
          total_token = payload.total_token;
          completion_tokens = payload.completion_tokens;
          prompt_tokens = payload.prompt_tokens;
        }
        // 使用函数式更新确保基于最新状态
        if (shouldUpdate) {
          shouldUpdate = false;
          setReceivingMessages((prevMessages: string | any[]) => {
            // 查找最后一个AI消息（即加载占位符）
            const lastIndex = prevMessages.length - 1;
            if (lastIndex >= 0 && prevMessages[lastIndex].from === "ai") {
              const updatedMessages = [...prevMessages];
              updatedMessages[lastIndex] = {
                ...updatedMessages[lastIndex],
                content: aiMessage,
                thinking: aiThinking,
                citations,
                feedback: null,
                messageId: messageId ? messageId : "",
                parentMessageId:
                  userMessages[userMessages.length - 1].parentMessageId,
                token_number: {
                  total_token: total_token,
                  completion_tokens: completion_tokens,
                  prompt_tokens: prompt_tokens,
                },
              };
              return updatedMessages;
            }
            // 如果没有找到AI消息，添加新条目（理论上不会发生）
            return [
              ...prevMessages,
              {
                type: "thinking",
                content: aiThinking,
                messageId: messageId ? messageId : "",
                from: "ai",
              },
              {
                type: "text",
                content: aiMessage,
                messageId: messageId ? messageId : "",
                from: "ai",
              },
            ];
          });
          throttleTimeout = setTimeout(() => {
            shouldUpdate = true;
          }, 50); // 50ms秒节流
        }
      }
      setReceivingMessages((prevMessages: string | any[]) => {
        return [
          ...prevMessages,
          ...file_used.map((file, index) => ({
            type: "baseFile",
            content: `image_${index}`,
            messageId: messageId ? messageId : "",
            imageMinioUrl: file.image_url,
            fileName: file.file_name,
            baseId: file.knowledge_db_id,
            minioUrl: file.file_url,
            score: file.score,
            from: "ai",
          })),
        ];
      });
    } catch (error) {
      // 处理中断错误 - 添加类型检查
      if (error instanceof Error && error.name === "AbortError") {
        // 可选的：添加用户中断的视觉反馈
        if (aiMessage) {
          aiMessage += " ⚠️ Abort By User";
        } else {
          aiThinking += " ⚠️ Abort By User";
        }
      } else {
        // 可选的：添加用户中断的视觉反馈
        aiMessage += t("llmError")
        // 错误时更新最后一条AI消息内容
        handleSelectChat(conversationId, true);
      }
    } finally {
      // 直接使用局部变量构建最终消息
      const finalMessages: Message[] = [
        {
          type: "text",
          content: aiMessage,
          thinking: aiThinking,
          citations,
          feedback: null,
          messageId: messageId ? messageId : "",
          parentMessageId:
            userMessages[userMessages.length - 1].parentMessageId,
          token_number: {
            total_token: total_token,
            completion_tokens: completion_tokens,
            prompt_tokens: prompt_tokens,
          },
          from: "ai",
        },
        ...file_used.map(
          (file, index) =>
            ({
              type: "baseFile",
              content: `image_${index}`,
              messageId: messageId || "",
              imageMinioUrl: file.image_url,
              fileName: file.file_name,
              baseId: file.knowledge_db_id,
              minioUrl: file.file_url,
              score: file.score,
              pageNumber: file.page_number,
              hideReferenceToggle: citations.length > 0,
              from: "ai",
            } as Message)
        ),
      ];

      // sse传输结束，receivingMessage切换回messages，
      // 保证receivingMessage和receivingMessageId只在sse传输过程生效
      // 后续可提过receivingMessageId===chatId来判断该选择对话是否在进行sse传输
      if (chatIdRef.current === conversationId) {
        setMessages((prevMessages: Message[]) => {
          return [...prevMessages, ...userMessages, ...finalMessages];
        });
      }
      // 清理状态
      setReceivingMessageId(null);
      setReceivingMessages([]);
      setSendDisabled(false);
    }
  };

  // 添加中断处理函数
  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setSendDisabled(false);
      setReceivingMessageId(null);
      setReceivingMessages([]);
    }
  }, []);

  // 组件卸载时中断请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = async (
    message: string,
    files: FileResponse[],
    tempBaseId: string,
    parentMessageId: string
  ) => {
    setSendDisabled(true);
    const handleCreateConversation = async () => {
      if (user && chatId) {
        const Response = await createConversation(
          chatId,
          user?.name,
          message.slice(0, 30),
          modelConfig
        );
      }
      fetchChatHistory();
      if (user?.name) {
        try {
          await updateChatModelConfig(chatId, modelConfig);
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };
    if (messages.length === 0) {
      await handleCreateConversation();
    }
    const fileMessages: Message[] = files.map((file) => {
      const fileType: string = getFileExtension(file.filename);
      if (["png", "jpg", "jpeg", "gif"].includes(fileType)) {
        const fileMessage: Message = {
          type: "image",
          content: file.filename,
          minioUrl: file.url,
          from: "user",
        };
        return fileMessage;
      } else {
        const fileMessage: Message = {
          type: "file",
          content: message,
          fileName: file.filename,
          fileType: fileType, // 新增文件类型字段
          minioUrl: file.url,
          from: "user",
        };
        return fileMessage;
      }
    });

    const userMessages: Message[] = [
      ...fileMessages,
      {
        type: "text",
        content: message,
        parentMessageId: parentMessageId === "" ? "root" : parentMessageId,
        from: "user",
      },
    ];
    // 添加生成消息中
    const aiLoading: Message = {
      type: "text",
      content: t("parsingMessage"),
      messageId: "newMessageId",
      parentMessageId: parentMessageId === "" ? "root" : parentMessageId,
      from: "ai",
    };

    // 一次性添加所有用户消息和AI加载状态
    setReceivingMessages([...messages, ...userMessages, aiLoading]);

    // 调用 AI 接口并接收 AI 响应
    sseConnection(chatId, parentMessageId, message, tempBaseId, userMessages);
  };

  const updateFeedbackState = useCallback(
    (targetMessageId: string, feedback: MessageFeedback) => {
      const applyFeedback = (prevMessages: Message[]) =>
        prevMessages.map((message) =>
          message.type === "text" &&
          message.from === "ai" &&
          message.messageId === targetMessageId
            ? { ...message, feedback }
            : message
        );

      setMessages(applyFeedback);
      setReceivingMessages(applyFeedback);
    },
    []
  );

  const handleSubmitFeedback = useCallback(
    async (messageId: string, rating: "helpful" | "unhelpful") => {
      const conversationId = chatIdRef.current || chatId;
      if (!conversationId) {
        return;
      }
      try {
        const response = await submitChatFeedback(conversationId, messageId, rating);
        updateFeedbackState(messageId, response.data.feedback);
        fetchFeedbackInsightSummary();
      } catch (error) {
        console.error("Error submitting chat feedback:", error);
      }
    },
    [chatId, fetchFeedbackInsightSummary, updateFeedbackState]
  );

  return (
    <div className="rag-page overflow-hidden">
      <Navbar />
      <div className="rag-shell">
        <LeftSidebar
          onNewChat={handleNewChat}
          chatHistory={chatHistory}
          feedbackInsights={feedbackInsights}
          onSelectChat={handleSelectChat}
          ondeleteAllChat={handledeleteAllChat}
          ondeleteChat={handledeleteChat}
          onRenameChat={handleRenameChat}
        />
        <ChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          onSubmitFeedback={handleSubmitFeedback}
          sendDisabled={sendDisabled}
          onAbort={handleAbort}
          receivingMessageId={receivingMessageId}
          receivingMessages={receivingMessages} // 传递接收消息状态
        />
      </div>
    </div>
  );
};

export default withAuth(AIChat);
