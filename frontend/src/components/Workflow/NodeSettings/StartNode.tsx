import MarkdownDisplay from "@/components/AiChat/MarkdownDisplay";
import { useFlowStore } from "@/stores/flowStore";
import { useGlobalStore } from "@/stores/WorkflowVariableStore";
import { CustomNode } from "@/types/types";
import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useState } from "react";

interface StartNodeProps {
  isDebugMode: boolean;
  node: CustomNode;
  setCodeFullScreenFlow: Dispatch<SetStateAction<boolean>>;
  codeFullScreenFlow: boolean;
}

const StartNodeComponent: React.FC<StartNodeProps> = ({
  isDebugMode,
  node,
  setCodeFullScreenFlow,
  codeFullScreenFlow,
}) => {
  const {
    globalVariables,
    globalDebugVariables,
    addProperty,
    removeProperty,
    updateProperty,
    updateDebugProperty,
  } = useGlobalStore();
  const t = useTranslations("StartNode");
  const [variable, setVariable] = useState("");
  const handleVariableChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isDebugMode: boolean
  ) => {
    const { name, value } = e.target;
    isDebugMode
      ? updateDebugProperty(name, value)
      : updateProperty(name, value);
  };
  const { updateNodeLabel, updateDescription } = useFlowStore();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="overflow-auto h-full flex flex-col items-start justify-start gap-1 text-[15px]">
      <div className="px-2 py-1 flex items-center justify-between w-full mt-1">
        <div className="flex items-center justify-start max-w-[60%] gap-1 font-medium text-base">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="size-5 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
            />
          </svg>
          <div
            contentEditable
            suppressContentEditableWarning // 避免React警告
            className="focus:outline-none cursor-text overflow-auto whitespace-nowrap" // 移除聚焦时的默认轮廓
            onBlur={(e) => {
              if (e.currentTarget.innerText.length > 1) {
                return updateNodeLabel(node.id, e.currentTarget.innerText);
              } else {
                e.currentTarget.innerText = node.data.label;
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === "Enter") {
                // 按下回车时保存并退出编辑模式
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          >
            {node.data.label}
          </div>
        </div>
      </div>
      <details className="group w-full" open>
        <summary className="flex items-center cursor-pointer w-full">
          <div className="py-1 px-2 flex mt-1 items-center justify-between w-full">
            <div className="flex items-center justify-start gap-1">
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
                  d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                />
              </svg>
              {t("description.title")}
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-180"
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
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsEditing(!isEditing);
              }}
              className="hover:bg-indigo-600 hover:text-white cursor-pointer disabled:cursor-not-allowed py-1 px-2 rounded-full disabled:opacity-50"
            >
              {isEditing ? (
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
                      d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
                    />
                  </svg>
                  <span>{t("description.previewButton")}</span>
                </div>
              ) : (
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
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                    />
                  </svg>
                  <span>{t("description.editButton")}</span>
                </div>
              )}
            </button>
          </div>
        </summary>

        {isEditing ? (
          <div
            className={`rounded-2xl shadow-lg overflow-auto w-full mb-2 px-4 pb-4 pt-2 bg-white`}
          >
            <textarea
              className={`mt-1 w-full px-2 py-2 border border-gray-200 rounded-xl min-h-[10vh] ${
                codeFullScreenFlow ? "max-h-[50vh]" : "max-h-[30vh]"
              } resize-none overflow-y-auto focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              value={node.data.description || ""}
              onChange={(e) => updateDescription(node.id, e.target.value)}
              placeholder={t("description.editingPlaceholder")}
            />
          </div>
        ) : (
          <div
            className={`rounded-2xl shadow-lg overflow-auto w-full mb-2 p-4 bg-gray-100`}
          >
            <MarkdownDisplay
              md_text={node.data.description || t("description.description")}
              message={{
                type: "text",
                content: node.data.description || "",
                from: "ai",
              }}
              showTokenNumber={true}
              isThinking={false}
            />
          </div>
        )}
      </details>
      <details className="group w-full" open>
        <summary className="flex items-center cursor-pointer w-full">
          <div className="px-2 py-1 flex items-center justify-between w-full mt-1">
            <div className="flex items-center justify-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M19.253 2.292a.75.75 0 0 1 .955.461A28.123 28.123 0 0 1 21.75 12c0 3.266-.547 6.388-1.542 9.247a.75.75 0 1 1-1.416-.494c.94-2.7 1.458-5.654 1.458-8.753s-.519-6.054-1.458-8.754a.75.75 0 0 1 .461-.954Zm-14.227.013a.75.75 0 0 1 .414.976A23.183 23.183 0 0 0 3.75 12c0 3.085.6 6.027 1.69 8.718a.75.75 0 0 1-1.39.563c-1.161-2.867-1.8-6-1.8-9.281 0-3.28.639-6.414 1.8-9.281a.75.75 0 0 1 .976-.414Zm4.275 5.052a1.5 1.5 0 0 1 2.21.803l.716 2.148L13.6 8.246a2.438 2.438 0 0 1 2.978-.892l.213.09a.75.75 0 1 1-.584 1.381l-.214-.09a.937.937 0 0 0-1.145.343l-2.021 3.033 1.084 3.255 1.445-.89a.75.75 0 1 1 .786 1.278l-1.444.889a1.5 1.5 0 0 1-2.21-.803l-.716-2.148-1.374 2.062a2.437 2.437 0 0 1-2.978.892l-.213-.09a.75.75 0 0 1 .584-1.381l.214.09a.938.938 0 0 0 1.145-.344l2.021-3.032-1.084-3.255-1.445.89a.75.75 0 1 1-.786-1.278l1.444-.89Z"
                  clipRule="evenodd"
                />
              </svg>
              {t("globalVariable.title")}
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-180"
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
            <button
              className="cursor-pointer disabled:cursor-not-allowed px-2 py-1 rounded-full hover:bg-indigo-600 hover:text-white disabled:opacity-50 flex items-center justify-center gap-1"
              onClick={() => setCodeFullScreenFlow((prev: boolean) => !prev)}
            >
              {codeFullScreenFlow ? (
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
                    d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
                  />
                </svg>
              ) : (
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
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
              )}
            </button>
          </div>
        </summary>
        <div
          className={`space-y-2 px-4 pb-4 pt-2 rounded-2xl shadow-lg ${
            codeFullScreenFlow ? "w-full" : "w-full"
          }`}
        >
          <div className="flex items-center w-full px-2 gap-6 border-gray-200">
            <input
              name={"addVariable"}
              value={variable}
              placeholder={t("globalVariable.placeholder")}
              onChange={(e) => setVariable(e.target.value)}
              className="w-full px-3 py-1 border-2 border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              disabled:opacity-50"
              onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
                if (e.key === "Enter") {
                  // 按下回车时保存并退出编辑模式
                  e.preventDefault();
                  if (variable === "") {
                    return;
                  } else {
                    addProperty(variable, "");
                    setVariable("");
                  }
                }
              }}
            />
            <div
              onClick={() => {
                if (variable === "") {
                  return;
                } else {
                  addProperty(variable, "");
                  setVariable("");
                }
              }}
              className="whitespace-nowrap cursor-pointer hover:text-indigo-700 pr-2 flex items-center gap-1 text-indigo-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{t("globalVariable.addButton")}</span>
            </div>
          </div>
          {Object.keys(isDebugMode ? globalDebugVariables : globalVariables)
            .length === 0 && (
            <div className="px-2 flex w-full items-center gap-2 text-gray-500">
              {t("globalVariable.noVariable")}
            </div>
          )}
          {Object.keys(
            isDebugMode ? globalDebugVariables : globalVariables
          ).map((key) => {
            // 获取当前值和初始值
            const currentValue = isDebugMode
              ? globalDebugVariables[key]
              : globalVariables[key];
            const initialValue = globalVariables[key];

            // 判断是否是未修改状态
            const isUnchanged = isDebugMode && currentValue === initialValue;
            return (
              <div className="px-2 flex w-full items-center gap-2" key={key}>
                <div className="max-w-[50%] whitespace-nowrap overflow-auto">
                  {key}
                </div>
                <div>=</div>
                {/* 输入框容器添加相对定位 */}
                <div className="flex-1 relative">
                  <input
                    name={key}
                    value={currentValue}
                    placeholder={t("globalVariable.variableValuePlaceholder")}
                    onChange={(e) => handleVariableChange(e, isDebugMode)}
                    className={`w-full px-3 py-1 border-2 rounded-xl border-gray-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-50 ${
              isUnchanged ? "text-gray-400" : "text-black"
            }`}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                  {/* 初始值提示（仅在调试模式且未修改时显示） */}
                  {isDebugMode && (
                    <div className="absolute right-1 top-0 px-3 py-1 pointer-events-none text-gray-400">
                      {t("globalVariable.initPrefix")}{initialValue}
                    </div>
                  )}
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-4.5 text-indigo-500 cursor-pointer shrink-0"
                  onClick={() => removeProperty(key)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </div>
            );
          })}
        </div>
      </details>
      <details className="group w-full" open>
        <summary className="flex items-center cursor-pointer w-full">
          <div className="py-1 px-2 flex mt-1 items-center justify-between w-full">
            <div className="flex items-center justify-start gap-1">
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
                  d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                />
              </svg>
              {t("output.title")}
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-180"
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
        <div
          className={`rounded-2xl shadow-lg overflow-auto w-full mb-2 p-4 bg-gray-100`}
        >
          <MarkdownDisplay
            md_text={node.data.output || ""}
            message={{
              type: "text",
              content: node.data.output || "",
              from: "ai", // 消息的来源
            }}
            showTokenNumber={true}
            isThinking={false}
          />
        </div>
      </details>
    </div>
  );
};

export default StartNodeComponent;
