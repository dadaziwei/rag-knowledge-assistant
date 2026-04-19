import MarkdownDisplay from "@/components/AiChat/MarkdownDisplay";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getMcpToolList } from "@/lib/api/workflowApi";
import { useAuthStore } from "@/stores/authStore";
import { useFlowStore } from "@/stores/flowStore";
import { CustomNode } from "@/types/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import McpAdvancedSettingsComponent from "./McpAdvancedSettings";
import { useTranslations } from "next-intl";

interface McpConfigProps {
  node: CustomNode;
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
}

const McpConfigComponent: React.FC<McpConfigProps> = ({
  node,
  visible,
  setVisible,
}) => {
  const t = useTranslations("McpConfig");
  const [mcpUse, setMcpUse] = useState<{
    [key: string]: string[]; // 允许动态属性
  }>({});
  const [mcpName, setMcpName] = useState<string>("");
  const { addMcpConfig, removeMcpConfig, updateMcpUse, updateMcpConfig } =
    useFlowStore();
  const [showConfirmDeleteConfig, setShowConfirmDeleteConfig] =
    useState<string>("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedMcpName, setSelectedMcpName] = useState<string>("");

  const { user } = useAuthStore();

  useEffect(() => {
    setMcpUse(node.data.mcpUse || {});
  }, [node.data.mcpUse]);

  const handleSubmit = () => {
    updateMcpUse(node.id, mcpUse);
    setVisible(false);
  };

  const onClose = () => {
    setVisible(false);
  };

  const onDeleteConfig = async (name: string) => {
    removeMcpConfig(node.id, name);
  };

  const confirmDeleteConfig = () => {
    if (showConfirmDeleteConfig) {
      onDeleteConfig(showConfirmDeleteConfig);
      setShowConfirmDeleteConfig(""); // 关闭对话框
    }
  };

  const cancelDeleteConfig = () => {
    if (showConfirmDeleteConfig) {
      setShowConfirmDeleteConfig(""); // 关闭对话框
    }
  };

  if (!visible) return null;

  const handelGetTools = async (
    url: string,
    headers: {},
    timeout: number,
    sseReadTimeout: number,
    name: string
  ) => {
    try {
      if (user?.name) {
        const response = await getMcpToolList(
          user.name,
          url,
          headers,
          timeout,
          sseReadTimeout
        );
        const tools = response.data.tools;
        if (node.data.mcpConfig) {
          const newMcpConfig = {
            ...node.data.mcpConfig[name],
            mcpTools: tools,
          };
          updateMcpConfig(node.id, name, newMcpConfig);
          const newMcpUse = { ...mcpUse };
          delete newMcpUse[name];
          updateMcpUse(node.id, newMcpUse);
        }
      }
    } catch (error) {
      console.error("Error fetching mcp tool list:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl px-10 py-6 min-w-[40%] max-w-[60%] max-h-[80vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
                d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
              />
            </svg>
            <span className="text-lg font-medium">{t("title")}</span>
          </div>
        </div>
        <div className="flex items-center w-full px-2 gap-6 border-gray-200 mb-4">
          <input
            name={"addMcpConfig"}
            value={mcpName}
            placeholder={t("mcpNamePlaceholder")}
            onChange={(e) => setMcpName(e.target.value)}
            className="w-full px-4 py-1 border-2 border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              disabled:opacity-50"
            onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === "Enter") {
                // 按下回车时保存并退出编辑模式
                e.preventDefault();
                if (mcpName === "") {
                  return;
                } else {
                  addMcpConfig(node.id, mcpName, {
                    mcpServerUrl: "",
                    mcpTools: [],
                  });
                  setMcpName("");
                }
              }
            }}
          />
          <div
            onClick={() => {
              if (mcpName === "") {
                return;
              } else {
                addMcpConfig(node.id, mcpName, {
                  mcpServerUrl: "",
                  mcpTools: [],
                });
                setMcpName("");
              }
            }}
            className="whitespace-nowrap cursor-pointer hover:text-indigo-700 pr-2 flex items-center gap-1 text-indigo-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5"
            >
              <path
                fillRule="evenodd"
                d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t("addButton")}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {(!node.data.mcpConfig ||
              Object.keys(node.data.mcpConfig).length === 0) && (
              <div className="text-gray-500 px-3 py-2">{t("noToolsFound")}</div>
            )}
            {Object.keys(node.data.mcpConfig || {}).map((mcpName) => (
              <div
                className="px-2 flex w-full flex-col items-start gap-2 relative my-2 pb-1 border-b-2 border-gray-200"
                key={mcpName}
              >
                <details className="group w-full space-y-2">
                  <summary className="px-2 py-1 flex items-center cursor-pointer font-medium w-full gap-1">
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
                        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
                      />
                    </svg>
                    <div className="overflow-auto whitespace-nowrap max-w-[60%]">
                      {mcpName}
                    </div>
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
                  </summary>
                  <div className="px-2 flex flex-col items-start justify-center gap-2">
                    <div
                      className="flex w-full items-center gap-2"
                      key={mcpName}
                    >
                      <div className="max-w-[50%] whitespace-nowrap overflow-auto">
                        {t("mcpServerUrl")}
                      </div>
                      <div>=</div>
                      {/* 输入框容器添加相对定位 */}
                      <div className="flex-1 relative">
                        <input
                          name={mcpName}
                          value={
                            node.data.mcpConfig
                              ? node.data.mcpConfig[mcpName]["mcpServerUrl"]
                              : ""
                          }
                          onChange={(e) => {
                            if (node.data.mcpConfig) {
                              const newMcpConfig = {
                                ...node.data.mcpConfig[mcpName],
                                mcpServerUrl: e.target.value,
                              };
                              updateMcpConfig(node.id, mcpName, newMcpConfig);
                            }
                          }}
                          className={`w-full px-3 py-1 border-2 rounded-xl border-gray-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-50  text-black
            }`}
                          onKeyDown={(
                            e: React.KeyboardEvent<HTMLInputElement>
                          ) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-5 text-indigo-500 cursor-pointer shrink-0"
                        onClick={() => setShowConfirmDeleteConfig(mcpName)}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </div>
                    <div className="text-[15px] px-2 flex justify-between items-center w-full">
                      <div
                        className="flex items-start justify-center gap-1 text-indigo-500 hover:text-indigo-700 cursor-pointer"
                        onClick={() => {
                          if (node.data.mcpConfig) {
                            handelGetTools(
                              node.data.mcpConfig[mcpName].mcpServerUrl,
                              node.data.mcpConfig[mcpName].headers || {},
                              node.data.mcpConfig[mcpName].timeout || 5,
                              node.data.mcpConfig[mcpName].sseReadTimeout ||
                                300,
                              mcpName
                            );
                          }
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-5 my-auto"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {t("refreshTools")}
                      </div>
                      <div
                        className="flex items-start justify-center gap-1 text-indigo-500 hover:text-indigo-700 cursor-pointer"
                        onClick={() => {
                          setShowAdvancedSettings(true);
                          setSelectedMcpName(mcpName);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="size-5 my-auto"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />
                        </svg>
                        {t("advancedSettings")}
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      {node.data.mcpConfig &&
                        node.data.mcpConfig[mcpName].mcpTools.map((tool) => (
                          <div
                            key={tool.name}
                            className={`bg-gray-50 px-2 p-2 rounded-2xl m-1 relative text-[15px]`}
                          >
                            <details className="group/inner">
                              <summary className="px-2 py-1 flex items-center cursor-pointer font-medium gap-1">
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
                                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                                    />
                                  </svg>
                                  <div>{tool.name}</div>
                                  <svg
                                    className="w-4 h-4 transition-transform group-open/inner:rotate-180"
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
                              </summary>

                              <MarkdownDisplay
                                md_text={
                                  "```json\n" +
                                    JSON.stringify(tool, null, " ") ||
                                  t("noToolDescriptionFound")
                                }
                                message={{
                                  type: "text",
                                  content: node.data.description || "",
                                  from: "ai",
                                }}
                                showTokenNumber={true}
                                isThinking={false}
                              />
                            </details>
                            <div className="z-10 absolute right-0 top-1 p-2">
                              <label className="text-sm w-full overflow-auto inline-flex items-center group px-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    mcpUse.hasOwnProperty(mcpName)
                                      ? mcpUse[mcpName].includes(tool.name)
                                      : false
                                  }
                                  onChange={() => {
                                    setMcpUse((prev) => {
                                      const currentTools =
                                        prev?.[mcpName] || [];
                                      if (currentTools.includes(tool.name)) {
                                        const newTools = currentTools.filter(
                                          (t) => t !== tool.name
                                        );

                                        if (newTools.length === 0) {
                                          const newPrev = { ...prev };
                                          delete newPrev[mcpName];
                                          return newPrev;
                                        }
                                        return {
                                          ...prev,
                                          [mcpName]: newTools,
                                        };
                                      }
                                      return {
                                        ...prev,
                                        [mcpName]: [...currentTools, tool.name],
                                      };
                                    });
                                  }}
                                  className="shrink-0 appearance-none h-4 w-4 border-1 border-gray-300 rounded-lg transition-colors checked:bg-indigo-500 checked:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
                                />
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="absolute size-3 text-white shrink-0"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                    clipRule="evenodd"
                                    transform="translate(3, 0.2)"
                                  />
                                </svg>
                                <div className="ml-2 flex gap-1 items-center">
                                  <span>{t("useFunctionTool")}</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </details>
                <div className="z-10 absolute right-0 top-1 px-1 pb-1">
                  <label className="text-[15px] w-full overflow-auto inline-flex items-center group px-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mcpUse.hasOwnProperty(mcpName)}
                      onChange={() => {
                        setMcpUse((prev) => {
                          if (prev.hasOwnProperty(mcpName)) {
                            const newPrev = { ...prev };
                            delete newPrev[mcpName];
                            return newPrev;
                          } else {
                            const mcpConfig = node.data.mcpConfig;
                            const tools = mcpConfig
                              ? mcpConfig[mcpName].mcpTools.map(
                                  (tool) => tool.name
                                )
                              : [];
                            return { ...prev, [mcpName]: tools };
                          }
                        });
                      }}
                      className="shrink-0 appearance-none h-4 w-4 border-1 border-gray-300 rounded-lg transition-colors checked:bg-indigo-500 checked:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="absolute size-3 text-white shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                        transform="translate(3, 0.2)"
                      />
                    </svg>
                    <div className="ml-2 flex gap-1 items-center">
                      <span>{t("useThisMCPTools")}</span>
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 操作按钮 */}
        <div className="mt-4 pt-4 flex justify-end gap-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2  text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            {t("cancelButton")}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-700 cursor-pointer"
          >
            {t("saveButton")}
          </button>
        </div>
      </div>
      {/* 确认删除单个mcp配置 */}
      {showConfirmDeleteConfig && (
        <ConfirmDialog
          message={t("confirmDeleteMcpConfig", {
            name: showConfirmDeleteConfig.slice(0, 30),
          })}
          onConfirm={confirmDeleteConfig}
          onCancel={cancelDeleteConfig}
        />
      )}
      {showAdvancedSettings && (
        <McpAdvancedSettingsComponent
          node={node}
          visible={showAdvancedSettings}
          setVisible={setShowAdvancedSettings}
          mcpName={selectedMcpName}
        />
      )}
    </div>
  );
};

export default McpConfigComponent;
