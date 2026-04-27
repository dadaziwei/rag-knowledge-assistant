// components/Sidebar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Chat, FeedbackInsights } from "@/types/types";
import useChatStore from "@/stores/chatStore";
import { getTimeLabel } from "@/utils/date";
import ConfirmDialog from "../ConfirmDialog";
import { useClickAway } from "react-use";
import { useTranslations } from "next-intl";

interface SidebarProps {
  onNewChat: () => void;
  chatHistory: Chat[];
  feedbackInsights: FeedbackInsights | null;
  onSelectChat: (inputChatId: string, isRead: boolean) => void;
  ondeleteAllChat: (chatHistory: Chat[]) => void;
  ondeleteChat: (chat: Chat) => void;
  onRenameChat: (chat: Chat, inputValue: string) => void;
}

const LeftSidebar: React.FC<SidebarProps> = ({
  onNewChat,
  chatHistory,
  feedbackInsights,
  onSelectChat,
  ondeleteAllChat,
  ondeleteChat,
  onRenameChat,
}) => {
  const t = useTranslations("ChatLeftSidebar");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setSettingsOpen] = useState<boolean[]>([]);
  const [isEditOpen, setIsEditOpen] = useState<boolean[]>([]);
  const [inputValues, setInputValues] = useState<string[]>([]);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] =
    useState<boolean>(false);
  const [showConfirmDeleteChat, setShowConfirmDeleteChat] = useState<{
    index: number;
    chat: Chat;
  } | null>(null);
  const { chatId } = useChatStore();

  const ref = useRef(null);
  useClickAway(ref, () => {
    setSettingsOpen((prev) => prev.map(() => false));
  });

  // 更新 isSettingsOpen 以匹配 chatHistory 的长度
  useEffect(() => {
    setSettingsOpen(new Array(chatHistory.length).fill(false));
    setIsEditOpen(new Array(chatHistory.length).fill(false));
    setInputValues(chatHistory.map((chat) => chat.name));
  }, [chatHistory]);

  const handleDeleteAllChats = () => {
    setShowConfirmDeleteAll(true); // 显示全局确认对话框
  };

  const handleDeleteChat = (chat: Chat, index: number) => {
    toggleSettings(index); // 关闭设置面板
    setShowConfirmDeleteChat({ index, chat }); // 显示单个对话框
  };

  const confirmDeleteAll = () => {
    ondeleteAllChat(chatHistory);
    setShowConfirmDeleteAll(false); // 关闭对话框
  };

  const cancelDeleteAll = () => {
    setShowConfirmDeleteAll(false); // 关闭对话框
  };

  const confirmDeleteChat = () => {
    if (showConfirmDeleteChat) {
      ondeleteChat(showConfirmDeleteChat.chat);
      setShowConfirmDeleteChat(null); // 关闭对话框
    }
  };

  const cancelDeleteChat = () => {
    if (showConfirmDeleteChat) {
      setShowConfirmDeleteChat(null); // 关闭对话框
    }
  };

  const toggleSettings = (index: number) => {
    setSettingsOpen(
      (prev) => prev.map((item, idx) => (idx === index ? !item : false)) // 只切换当前项
    );
  };

  const handleEditChat = (index: number) => {
    toggleSettings(index);
    setIsEditOpen(
      (prev) => prev.map((item, idx) => (idx === index ? !item : false)) // 只切换当前项
    );
  };

  const handleBlur = (chat: Chat, index: number) => {
    if (
      inputValues[index].trim() !== "" &&
      inputValues[index].trim() !== chat.name
    ) {
      onRenameChat(chat, inputValues[index]);
      //renameChat(chat.conversationId, inputValues[index]);
    } else {
      inputValues[index] = chat.name;
    }
    setIsEditOpen(
      (prev) => prev.map((item, idx) => (idx === index ? !item : false)) // 只切换当前项
    );
  };

  const handleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = e.target.value; // 更新输入框的值
    setInputValues(newInputValues); // 设置新的输入值
  };

  const handleSelectChat = (chat: Chat) => {
    onSelectChat(chat.conversationId, chat.isRead);
  };

  // 过滤对话
  const filteredChatHistory = chatHistory.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rag-sidebar">
      {/* 新会话按钮 */}
      <div
        className="w-full"
        onClick={onNewChat}
      >
        <div className="rag-button-primary w-full cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
            />
          </svg>
          <div className=" text-sm">{t("newChat")}</div>
        </div>
      </div>

      {/* 历史生成标题和清空按钮 */}
      <h2 className="text-sm font-semibold text-[var(--rag-text)]">
        {t("historyChat")}
      </h2>

      <div className="relative flex w-full text-xs">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          className="rag-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4 absolute right-2.5 top-1/2 transform -translate-y-1/2 text-[var(--rag-muted)]"
        >
          <path
            fillRule="evenodd"
            d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div className="flex gap-4">
        <div
          className="rag-control-link"
          onClick={handleDeleteAllChats} // 修正这里
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
            />
          </svg>

          <div className="text-sm">{t("clear")}</div>
        </div>
        <div
          className="rag-control-link"
          onClick={onNewChat} // 修正这里
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
              clipRule="evenodd"
            />
          </svg>

          <div className="text-sm">{t("refresh")}</div>
        </div>
      </div>
      {feedbackInsights && feedbackInsights.total_feedback > 0 && (
        <div className="w-full rounded-lg border border-[var(--rag-border)] bg-[var(--rag-panel)] p-3 text-sm text-[var(--rag-text)]">
          <div className="flex items-center gap-2 font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5 9 18.75l11.25-13.5"
              />
            </svg>
            <span>{t("feedbackInsightsTitle")}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-[var(--rag-border)] bg-[var(--rag-panel-soft)] p-2">
              <div className="text-[var(--rag-muted)]">{t("feedbackTotal")}</div>
              <div className="mt-1 text-base font-semibold">
                {feedbackInsights.total_feedback}
              </div>
            </div>
            <div className="rounded-md border border-[var(--rag-border)] bg-[var(--rag-panel-soft)] p-2">
              <div className="text-[var(--rag-muted)]">{t("feedbackHelpfulRate")}</div>
              <div className="mt-1 text-base font-semibold">
                {(feedbackInsights.helpful_rate * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-emerald-700">
              {t("feedbackHelpfulCount", {
                count: feedbackInsights.helpful_count,
              })}
            </span>
            <span className="rounded-full bg-amber-500/12 px-2 py-1 text-amber-700">
              {t("feedbackNeedsWorkCount", {
                count: feedbackInsights.unhelpful_count,
              })}
            </span>
          </div>
          {feedbackInsights.top_knowledge_gaps.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--rag-muted)]">
                {t("feedbackKnowledgeGapTitle")}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {feedbackInsights.top_knowledge_gaps.map((item) => (
                  <div
                    key={item.knowledge_base_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--rag-border)] bg-[var(--rag-panel-soft)] px-2 py-1.5 text-xs"
                  >
                    <span className="truncate">{item.knowledge_base_name}</span>
                    <span className="shrink-0 text-amber-700">
                      {t("feedbackNeedsWorkShort", {
                        count: item.unhelpful_count,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {feedbackInsights.recent_unhelpful_questions.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--rag-muted)]">
                {t("feedbackRecentQuestionsTitle")}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {feedbackInsights.recent_unhelpful_questions.map((item) => (
                  <div
                    key={item.message_id}
                    className="rounded-md border border-[var(--rag-border)] bg-[var(--rag-panel-soft)] px-2 py-1.5 text-xs"
                  >
                    <div className="line-clamp-2">{item.question || t("feedbackUnknownQuestion")}</div>
                    {item.knowledge_base_names.length > 0 && (
                      <div className="mt-1 text-[var(--rag-muted)] line-clamp-1">
                        {item.knowledge_base_names.join(" / ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* 聊天列表 */}
      <div className="border-b border-[var(--rag-border)] w-full"></div>
      <div className="px-1 w-full flex-1 overflow-y-auto scrollbar-hide">
        {filteredChatHistory.map((chat, index) => {
          const timeLabel = getTimeLabel(chat.lastModifyTime);
          const lastTimeLabel = getTimeLabel(
            index === 0
              ? chat.lastModifyTime
              : filteredChatHistory[index - 1].lastModifyTime
          );
          const isFirstInGroup = index === 0 || timeLabel !== lastTimeLabel;
          return (
            <div key={index} className="flex flex-col gap-1">
              {isFirstInGroup && (
                <div className="pl-1 py-1 text-xs font-semibold uppercase text-[var(--rag-muted)] mt-2">
                  {t("timeLabel." + timeLabel)}{" "}
                </div>
              )}
              <div
                key={index}
                className={`rag-conversation-item ${
                  chatId === chat.conversationId
                    ? "rag-conversation-item-active"
                    : ""
                } mb-1`}
              >
                <div
                  key={index}
                  className="py-2 pl-2 pr-0 flex items-center gap-2 w-[85%] cursor-pointer text-sm"
                  onClick={() => handleSelectChat(chat)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-4.5 shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                      transform="translate(0, 0.3)"
                    />
                  </svg>

                  <div
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {isEditOpen[index] ? (
                      <input
                        type="text"
                        value={inputValues[index]} // 使用状态中的输入值
                        onChange={(e) => handleChange(index, e)} // 更新输入值
                        onBlur={() => handleBlur(chat, index)}
                        className="bg-transparent outline-hidden border-none p-0 m-0 w-full"
                        autoFocus
                      />
                    ) : (
                      chat.name.slice(0, 30)
                    )}
                  </div>
                </div>
                <div
                  className="w-[15%] flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
                  onClick={() => toggleSettings(index)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="size-5 shrink-0"
                  >
                    <path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                  </svg>
                </div>
                {isSettingsOpen[index] && ( // 根据数组状态显示悬浮框
                  <div
                    ref={ref}
                    className="absolute right-0 top-full mt-1 bg-white text-[var(--rag-text)] rounded-lg border py-2 px-1 border-[var(--rag-border)] shadow-lg z-10"
                  >
                    <div
                      className="flex gap-2 cursor-pointer hover:bg-[var(--rag-brand)] hover:text-white px-2 py-1 rounded-md"
                      onClick={() => handleEditChat(index)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                        />
                      </svg>

                      <div className="text-sm">{t("rename")}</div>
                    </div>
                    <div
                      className="flex gap-2 cursor-pointer hover:bg-[var(--rag-brand)] hover:text-white px-2 py-1 rounded-md"
                      onClick={() => handleDeleteChat(chat, index)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                      <div className="text-sm">{t("delete")}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 确认删除所有聊天 */}
      {showConfirmDeleteAll && (
        <ConfirmDialog
          message={t("deleteAllConfirm")}
          onConfirm={confirmDeleteAll}
          onCancel={cancelDeleteAll}
        />
      )}

      {/* 确认删除单个聊天 */}
      {showConfirmDeleteChat && (
        <ConfirmDialog
          message={`${t(
            "deleteSingleConfirm"
          )}"${showConfirmDeleteChat.chat.name.slice(0, 30)}"？`}
          onConfirm={confirmDeleteChat}
          onCancel={cancelDeleteChat}
        />
      )}
    </div>
  );
};

export default LeftSidebar;
