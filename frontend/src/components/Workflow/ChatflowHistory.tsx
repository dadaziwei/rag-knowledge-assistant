import ChatMessage from "@/components/AiChat/ChatMessage";
import { getChatflowContent } from "@/lib/api/chatflowApi";
import { getAllKnowledgeBase } from "@/lib/api/knowledgeBaseApi";
import { useAuthStore } from "@/stores/authStore";
import {
  BaseUsed,
  FileUsed,
  KnowledgeBase,
  Message,
  ModelConfig,
} from "@/types/types";
import { parseToBeijingTime } from "@/utils/date";
import { getFileExtension } from "@/utils/file";
import { useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface ChatflowHistoryProps {
  chatflowId: string;
  lastModifyTime: string;
  deleteChatflow: (chatflowId: string) => void;
}

const ChatflowHistoryComponent: React.FC<ChatflowHistoryProps> = ({
  chatflowId,
  lastModifyTime,
  deleteChatflow,
}) => {
  const t = useTranslations("ChatflowHistory");
  const [showRefFile, setShowRefFile] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>();
  const [showConfirmDeleteChatflow, setShowConfirmDeleteChatflow] =
    useState(false);
  const { user } = useAuthStore();

  const confirmDeleteChatflow = () => {
    if (showConfirmDeleteChatflow) {
      deleteChatflow(chatflowId);
      setShowConfirmDeleteChatflow(false); // 关闭对话框
    }
  };

  const cancelDeleteChatflow = () => {
    if (showConfirmDeleteChatflow) {
      setShowConfirmDeleteChatflow(false); // 关闭对话框
    }
  };

  const handleSelectChatflow = () => {
    const fetchChatflowHistoryMessage = async () => {
      if (user?.name) {
        try {
          const responseBase = await getAllKnowledgeBase(user.name);
          const bases: BaseUsed[] = responseBase.data.map((item: any) => ({
            name: item.knowledge_base_name,
            baseId: item.knowledge_base_id,
          }));

          setModelConfig({
            modelId: "",
            baseUsed: bases,
            modelName: "",
            modelURL: "",
            apiKey: "",
            systemPrompt: "",
            temperature: 0,
            maxLength: 0,
            topP: 0,
            topK: 0,
            scoreThreshold: 0,
            useTemperatureDefault: false,
            useMaxLengthDefault: false,
            useTopPDefault: false,
            useTopKDefault: false,
            useScoreThresholdDefault: false,
          });

          const response = await getChatflowContent(chatflowId);
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
                  from: "user",
                },
                {
                  type: "text",
                  content: `${item.ai_message.content}`,
                  messageId: `${item.message_id}`,
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
                  from: "ai",
                })),
              ];
            })
            .flat(); // 使用 flat 将嵌套数组平铺
          setMessages(messages);
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    fetchChatflowHistoryMessage(); // 调用获取聊天记录的函数
  };

  return (
    <div className="relative w-full">
      <details className="group/outer w-full">
        <summary
          className="flex items-center cursor-pointer font-medium w-full"
          onClick={handleSelectChatflow}
        >
          <div className="py-1 px-2 flex mt-1 items-center justify-between w-full text-sm">
            <div className="flex items-center justify-start gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
              {
                parseToBeijingTime(lastModifyTime + "Z")
                  .toISOString()
                  .split("T")[0]
              }{" "}
              {
                parseToBeijingTime(lastModifyTime + "Z")
                  .toISOString()
                  .split("T")[1]
                  .split(".")[0]
              }
              <svg
                className="w-4 h-4 transition-transform group-open/outer:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </summary>
        <div className={`rounded-2xl shadow-lg overflow-auto w-full mb-2 p-2`}>
          <div
            className="flex-1 overflow-y-scroll scrollbar-hide"
            style={{ overscrollBehavior: "contain" }}
          >
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <ChatMessage
                  modelConfig={modelConfig}
                  key={index}
                  message={message}
                  showRefFile={showRefFile}
                  setShowRefFile={setShowRefFile}
                  isLastMessage={
                    message.from === "user"
                      ? index >= messages.length - 3
                      : index >= messages.length - 2
                  }
                />
              ))
            ) : (
              <ChatMessage
                modelConfig={undefined}
                message={{
                  type: "text" as const,
                  content: t("noMessages"),
                  from: "ai" as const,
                }}
                showRefFile={showRefFile}
                setShowRefFile={setShowRefFile}
              />
            )}
          </div>
        </div>
      </details>
      <div className="hover:text-indigo-700 z-10 absolute right-2 top-0 py-[6px] mt-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-4.5 my-auto cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmDeleteChatflow(true);
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      </div>
      {showConfirmDeleteChatflow &&
        createPortal(
          <ConfirmDialog
            message={t("deleteConfirmation")}
            onConfirm={confirmDeleteChatflow}
            onCancel={cancelDeleteChatflow}
          />,
          document.body
        )}
    </div>
  );
};

export default ChatflowHistoryComponent;
