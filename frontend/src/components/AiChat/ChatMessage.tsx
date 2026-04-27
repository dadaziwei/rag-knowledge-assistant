// components/ChatMessage.tsx
"use client";
import React, { Dispatch, useEffect, useMemo, useState } from "react";
import { FileResponse, Message, ModelConfig } from "@/types/types";
import Image from "next/image";
import LoadingCircle from "./LoadingCircle";
import { getFileIcon } from "@/utils/file";
import MarkdownDisplay from "./MarkdownDisplay";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface ChatMessageProps {
  modelConfig: ModelConfig | undefined;
  message: Message;
  showRefFile: string[];
  setShowRefFile: Dispatch<React.SetStateAction<string[]>>;
  onSendEditingMessage?: (
    inputMessage: string,
    sendingFiles: FileResponse[],
    tempBaseId: string,
    parentMessageId: string
  ) => void;
  lastUserMessage?: () => string; // 最后一条用户消息
  sendDisabled?: boolean; // 是否禁用发送按钮
  enableOperation?: boolean; // 是否启用操作栏
  handleBranchChange?: (parentId: string, newIndex: number) => void;
  branchIndex?: number; // 当前分支
  branchCount?: number; // 分支数量
  parentId?: string; // 父消息ID，用于分支切换
  isLastMessage?: boolean; // 判断是否为最后一条消息
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  modelConfig,
  message,
  showRefFile,
  setShowRefFile,
  lastUserMessage = () => "",
  sendDisabled = false,
  onSendEditingMessage = () => {},
  enableOperation = false,
  handleBranchChange = () => {},
  branchIndex = 1, // 当前分支索引
  branchCount = 5, // 分支总数
  parentId = "root", // 父消息ID，用于分支切换
  isLastMessage = false,
}) => {
  const t = useTranslations("ChatMessage");
  const isUser = message.from === "user"; // 判断是否是用户消息
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [messageEditing, setMessageEditing] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>(
    message.content || ""
  );

  // 提取thinking内容和剩余内容
  const { thinkingContent, displayContent } = useMemo(() => {
    let thinkingContent = "";
    let displayContent = message.content || "";

    // 仅处理文本类型的消息
    if (message.type === "text" && displayContent) {
      // 检查是否有<think>开头
      if (displayContent.startsWith("<think>")) {
        const endTagIndex = displayContent.indexOf("</think>");

        if (endTagIndex !== -1) {
          // 有闭合标签：提取思考内容
          thinkingContent = displayContent.substring(
            7, // "<think>" 长度
            endTagIndex
          );
          displayContent = displayContent.substring(endTagIndex + 8).trim(); // "</think>" 长度
        } else {
          // 没有闭合标签：整个内容作为思考内容
          thinkingContent = displayContent.substring(7);
          displayContent = "";
        }
      }
    }

    return { thinkingContent, displayContent };
  }, [message.content, message.type]);

  const handleImageClick = (selctImage: string) => {
    setSelectedImage(selctImage);
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleDownload = async (url: string) => {
    try {
      window.open(url, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed!");
    }
  };

  // 复制全部内容的处理函数
  const handleCopyAll = async (md_text: string) => {
    // 直接使用原始的md_text（base64编码之前的内容）
    try {
      await navigator.clipboard.writeText(md_text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      // 降级方案：使用textarea
      const textArea = document.createElement("textarea");
      textArea.value = md_text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  useEffect(() => {
    if (message.from == "user") {
      setInputMessage(message.content || "");
      setMessageEditing(false);
    }
  }, [message.content]);

  const bubbleTone =
    message.from === "user" && message.type === "text"
      ? "rag-message-user"
      : "rag-message-ai";

  const toggleReferences = () => {
    if (!message.messageId) {
      return;
    }
    setShowRefFile((prev) =>
      prev.includes(message.messageId!)
        ? prev.filter((item) => item !== message.messageId)
        : [...prev, message.messageId!]
    );
  };

  return (
    <div className="rag-message group">
      <div
        className={`rag-message-bubble ${bubbleTone} flex flex-col ${
          message.type === "text"
            ? "px-4 py-3"
            : "overflow-hidden p-2"
        }`}
      >
        {/* user message */}
        {message.type === "text" &&
          message.from === "user" &&
          message.content &&
          (messageEditing ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-center items-center h-full">
                <textarea
                  className="rag-composer-input w-[50vw] min-h-[10vh] max-h-[20vh]"
                  placeholder=""
                  value={inputMessage}
                  rows={1}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      if (!sendDisabled) {
                        onSendEditingMessage(
                          inputMessage,
                          [],
                          "",
                          message.parentMessageId || ""
                        );
                        setMessageEditing(false);
                      }
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setMessageEditing(false);
                    setInputMessage(message.content || "");
                  }}
                  className="rag-button-secondary cursor-pointer"
                >
                  {t("cancelButton")}
                </button>
                <button
                  onClick={() => {
                    if (!sendDisabled) {
                      onSendEditingMessage(
                        inputMessage,
                        [],
                        "",
                        message.parentMessageId || ""
                      );
                      setMessageEditing(false);
                    }
                  }}
                  disabled={sendDisabled || inputMessage.trim() === ""}
                  className="rag-button-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {t("sendButton")}
                </button>
              </div>
            </div>
          ) : (
            <MarkdownDisplay
              md_text={message.content}
              message={message}
              showTokenNumber={false}
              isThinking={false}
            />
          ))}
        {/* AI thinking 1 */}
        {message.type === "text" && message.thinking && (
          <MarkdownDisplay
            md_text={message.thinking}
            message={message}
            showTokenNumber={false}
            isThinking={true}
          />
        )}
        {/* AI thinking 2 */}
        {message.type === "text" &&
          message.from === "ai" &&
          thinkingContent && (
            <MarkdownDisplay
              md_text={thinkingContent}
              message={message}
              showTokenNumber={false}
              isThinking={true}
            />
          )}
        {/* AI message */}
        {message.type === "text" && message.from === "ai" && displayContent && (
          <MarkdownDisplay
            md_text={displayContent}
            message={message}
            showTokenNumber={true}
            isThinking={false}
          />
        )}
        {message.type === "text" &&
          message.from === "ai" &&
          message.citations &&
          message.citations.length > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--rag-border)] bg-[var(--rag-panel-soft)] p-3 text-sm text-[var(--rag-text)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[var(--rag-muted)]">
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
                      d="M9.813 15.904 9 18l-.813-2.096a4.5 4.5 0 0 0-2.206-2.206L3.885 12l2.096-.813a4.5 4.5 0 0 0 2.206-2.206L9 6.885l.813 2.096a4.5 4.5 0 0 0 2.206 2.206l2.096.813-2.096.813a4.5 4.5 0 0 0-2.206 2.206ZM18.259 8.715 18 9.375l-.259-.66a3.375 3.375 0 0 0-1.466-1.466L15.625 7l.65-.259a3.375 3.375 0 0 0 1.466-1.466L18 4.625l.259.65a3.375 3.375 0 0 0 1.466 1.466l.65.259-.65.259a3.375 3.375 0 0 0-1.466 1.466ZM18 16.125l.202.514c.444 1.127 1.333 2.016 2.46 2.46l.514.202-.514.202a3.375 3.375 0 0 0-2.46 2.46L18 22.5l-.202-.514a3.375 3.375 0 0 0-2.46-2.46l-.514-.202.514-.202a3.375 3.375 0 0 0 2.46-2.46L18 16.125Z"
                    />
                  </svg>
                  <span className="font-medium">{t("citationsTitle")}</span>
                </div>
                {message.messageId && (
                  <button
                    onClick={toggleReferences}
                    className="cursor-pointer text-[var(--rag-brand)] hover:text-[var(--rag-brand-strong)] transition-colors"
                  >
                    {showRefFile.includes(message.messageId)
                      ? t("hideEvidence")
                      : t("viewEvidence")}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {message.citations.slice(0, 3).map((citation, index) => (
                  <div
                    key={`${citation.file_name}-${citation.page_number}-${index}`}
                    className="rounded-md border border-[var(--rag-border)] bg-[var(--rag-panel)] px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{citation.file_name}</span>
                      {typeof citation.page_number === "number" && (
                        <span className="text-[var(--rag-muted)]">
                          {t("pageLabel", { page: citation.page_number + 1 })}
                        </span>
                      )}
                      {typeof citation.score === "number" && (
                        <span className="text-[var(--rag-muted)]">
                          {t("score")}{citation.score.toFixed(4)}
                        </span>
                      )}
                    </div>
                    {citation.excerpt && (
                      <div className="mt-1 text-[var(--rag-muted)]">
                        {citation.excerpt}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* 消息操作栏--复制、重试、切换等 */}
        {message.type === "text" && (
          <div
            className={`flex gap-2 items-center mt-3 text-sm ${
              message.from === "user" ? "pr-2 justify-end" : "justify-start"
            } ${message.from === "user" ? "text-white/80" : "text-[var(--rag-muted)]"}`}
          >
            {message.from === "ai" &&
              enableOperation &&
              !messageEditing &&
              branchCount > 1 && (
                <div className="flex gap-0.5 font-medium">
                  <button
                    className="cursor-pointer hover:text-[var(--rag-brand)] transition-colors disabled:cursor-not-allowed disabled:hover:text-[var(--rag-muted)] disabled:opacity-50"
                    onClick={() =>
                      handleBranchChange(parentId ?? "root", branchIndex - 1)
                    }
                    disabled={branchIndex === 0}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                  <span>{branchIndex + 1}</span>/<span>{branchCount}</span>
                  <button
                    className="cursor-pointer hover:text-[var(--rag-brand)] transition-colors disabled:cursor-not-allowed disabled:hover:text-[var(--rag-muted)] disabled:opacity-50"
                    onClick={() =>
                      handleBranchChange(parentId ?? "root", branchIndex + 1)
                    }
                    disabled={branchIndex === branchCount - 1}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
              )}
            {/* 复制全部按钮 - 只在非思考状态下显示 */}
            {(message.from === "ai" ||
              (message.from === "user" && !messageEditing)) && (
              <button
                onClick={() => handleCopyAll(displayContent)}
                className={`${
                  isLastMessage ? "" : "group-hover:opacity-100 opacity-0"
                } cursor-pointer flex items-center gap-0.5 hover:text-[var(--rag-brand)] transition-colors`}
                aria-label="Copy all content"
              >
                {copiedAll ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                    />
                  </svg>
                )}
                <span>{copiedAll ? t("copied") : t("copy")}</span>
              </button>
            )}
            {message.from === "ai" && enableOperation && (
              <div
                onClick={() => {
                  if (!sendDisabled) {
                    onSendEditingMessage(
                      lastUserMessage(),
                      [],
                      "",
                      message.parentMessageId || ""
                    );
                    setMessageEditing(false);
                  }
                }}
                className={`${
                  sendDisabled
                    ? isLastMessage
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-not-allowed group-hover:opacity-50 opacity-0"
                    : isLastMessage
                    ? "cursor-pointer"
                    : "cursor-pointer group-hover:opacity-100 opacity-0"
                } flex items-center gap-0.5 hover:text-[var(--rag-brand)] transition-colors`}
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
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>{t("regenerate")}</span>
              </div>
            )}
            {message.from === "user" && enableOperation && !messageEditing && (
              <div
                onClick={() => setMessageEditing(true)}
                className={`${
                  isLastMessage ? "" : "group-hover:opacity-100 opacity-0"
                } cursor-pointer flex items-center gap-0.5 hover:text-white transition-colors`}
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
                <span>{t("edit")}</span>
              </div>
            )}
            {/* 分支选择器 */}
            {message.from === "user" &&
              enableOperation &&
              !messageEditing &&
              branchCount > 1 && (
                <div className="flex gap-0.5 font-medium">
                  <button
                    className="cursor-pointer hover:text-white transition-colors disabled:cursor-not-allowed disabled:hover:text-white disabled:opacity-50"
                    onClick={() =>
                      handleBranchChange(parentId ?? "root", branchIndex - 1)
                    }
                    disabled={branchIndex === 0}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                  <span>{branchIndex + 1}</span>/<span>{branchCount}</span>
                  <button
                    className="cursor-pointer hover:text-white transition-colors disabled:cursor-not-allowed disabled:hover:text-white disabled:opacity-50"
                    onClick={() =>
                      handleBranchChange(parentId ?? "root", branchIndex + 1)
                    }
                    disabled={branchIndex === branchCount - 1}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
              )}
          </div>
        )}

        {message.type === "file" && (
          <div className="flex items-center gap-0.5">
            <span className="text-sm">{getFileIcon(message.fileType)}</span>
            <div className="flex">
              <span
                onClick={() =>
                  handleDownload(message.minioUrl ? message.minioUrl : "")
                }
                className="pr-2 text-xs font-medium hover:text-[var(--rag-brand)] hover:cursor-pointer"
              >
                {message.fileName}
              </span>
            </div>
          </div>
        )}

        {message.type === "image" && (
          <div className="flex items-center justify-center">
            {message.content === "loading" ? (
              <LoadingCircle />
            ) : (
              <div>
                <Image
                  src={message.minioUrl || ""}
                  alt={`image`}
                  width={200}
                  height={200}
                  onClick={() => handleImageClick(message.minioUrl || "")}
                  className="cursor-pointer rounded-lg"
                />
              </div>
            )}
          </div>
        )}
        {message.type === "baseFile" &&
          message.content === "image_0" &&
          message.messageId &&
          !message.hideReferenceToggle && (
            <div
              className={`pl-2 flex gap-1 items-center text-sm text-[var(--rag-brand)] hover:text-[var(--rag-brand-strong)] cursor-pointer ${
                showRefFile.includes(message.messageId) ? "pb-2" : "pb-6"
              }`}
              onClick={toggleReferences}
            >
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
                  d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                />
              </svg>

              <div>
                {showRefFile.includes(message.messageId)
                  ? t("closeReferences")
                  : t("viewReferences")}
              </div>
              {showRefFile.includes(message.messageId) ? (
                <svg
                  className="w-4 h-4 transition-transform rotate-180"
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
              ) : (
                <svg
                  className="w-5 h-4 transition-transform"
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
              )}
            </div>
          )}
        {message.type === "baseFile" &&
          message.messageId &&
          showRefFile.includes(message.messageId) && (
            <div className="pl-2 flex flex-col gap-2 items-start justify-center mb-3 rounded-lg border border-[var(--rag-border)] bg-[var(--rag-panel-soft)] p-3">
              <div className="flex items-center justify-center gap-1">
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
                    d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                  />
                </svg>
                <div className="text-[var(--rag-muted)] text-sm">
                  {t("score")}{message.score}
                </div>
              </div>
              <div>
                <Image
                  src={message.imageMinioUrl || ""}
                  alt={`image`}
                  width={100}
                  height={100}
                  onClick={() => handleImageClick(message.imageMinioUrl || "")}
                  className="cursor-pointer rounded-lg"
                />
              </div>
              <div
                onClick={() => {
                  return handleDownload(
                    message.minioUrl ? message.minioUrl : ""
                  );
                }}
                className="text-[var(--rag-muted)] text-sm hover:text-[var(--rag-brand)] cursor-pointer"
              >
                {message.fileName}
              </div>
              <div className="flex items-center justify-start gap-1 text-[var(--rag-muted)] pb-2 border-b border-[var(--rag-border)] w-full">
                <div className="text-sm font-medium">{t("fromLabel")}</div>
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
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                  />
                </svg>
                <div className="text-sm font-medium">
                  {modelConfig?.baseUsed.find(
                    (item) => item.baseId === message.baseId
                  )?.name || t("defaultBaseName")}
                </div>
              </div>
            </div>
          )}
        {/* 大图弹窗 */}
        {isOpen &&
          createPortal(
            <div
              className="overflow-visible top-0 left-0 w-[100vw] h-[100vh] flex items-center justify-center fixed !z-[50000] bg-black/80"
              onClick={handleCloseModal}
            >
              <Image
                src={selectedImage}
                alt="Selected large"
                fill // 使用 fill 布局
                style={{ objectFit: "contain" }} // 使用 style 来设置 objectFitobjectFit="contain" // 保持图像比例
                className="max-h-[90%] m-auto"
              />
            </div>,
            document.body
          )}
      </div>
    </div>
  );
};

export default ChatMessage;
