import { useFlowStore } from "@/stores/flowStore";
import { CustomNode, McpConfig } from "@/types/types";
import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

interface McpConfigProps {
  node: CustomNode;
  visible: boolean;
  mcpName: string;
  setVisible: Dispatch<SetStateAction<boolean>>;
}

const McpAdvancedSettingsComponent: React.FC<McpConfigProps> = ({
  node,
  visible,
  mcpName,
  setVisible,
}) => {
  const t = useTranslations("McpAdvancedSettings");
  const { updateMcpConfig } = useFlowStore();
  const [timeoutValue, setTimeoutValue] = useState<string>("");
  const [sseReadTimeoutValue, setSseReadTimeoutValue] = useState<string>("");
  const [headerPairs, setHeaderPairs] = useState<
    { key: string; value: string }[]
  >([]);

  // 初始化配置值
  useEffect(() => {
    if (visible) {
      const mcpConfig = node.data.mcpConfig?.[mcpName];

      // 初始化header
      if (mcpConfig?.headers) {
        const pairs = Object.entries(mcpConfig.headers).map(([key, value]) => ({
          key,
          value,
        }));
        setHeaderPairs(pairs.length > 0 ? pairs : [{ key: "", value: "" }]);
      } else {
        setHeaderPairs([{ key: "", value: "" }]);
      }

      // 初始化timeout
      setTimeoutValue(mcpConfig?.timeout?.toString() || "");

      // 初始化sseReadTimeout
      setSseReadTimeoutValue(mcpConfig?.sseReadTimeout?.toString() || "");
    }
  }, [visible, node, mcpName]);

  const handleSubmit = () => {
    // 构建header对象
    const newHeader: Record<string, string> = {};
    headerPairs.forEach((pair) => {
      if (pair.key.trim()) {
        newHeader[pair.key.trim()] = pair.value;
      }
    });

    // 构建新的McpConfig
    const prevConfig = node.data.mcpConfig?.[mcpName];
    if (prevConfig) {
      const newMcpConfig: McpConfig = {
        ...prevConfig,
        mcpServerUrl: prevConfig.mcpServerUrl || "",
        mcpTools: prevConfig.mcpTools || [],
        // 只在有值时添加header、timeout和sseReadTimeout
        headers: Object.keys(newHeader).length > 0 ? newHeader : {},
        timeout: timeoutValue ? parseInt(timeoutValue, 10) : 5,
        sseReadTimeout: sseReadTimeoutValue
          ? parseInt(sseReadTimeoutValue, 10)
          : 300,
      };
      updateMcpConfig(node.id, mcpName, newMcpConfig);
    } else {
      alert(t("mcpConfigNotFound"));
    }
    setVisible(false);
  };

  const onClose = () => {
    setVisible(false);
  };

  const updateHeaderPair = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newPairs = [...headerPairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    setHeaderPairs(newPairs);
  };

  const addHeaderPair = () => {
    setHeaderPairs([...headerPairs, { key: "", value: "" }]);
  };

  const removeHeaderPair = (index: number) => {
    if (headerPairs.length > 1) {
      const newPairs = [...headerPairs];
      newPairs.splice(index, 1);
      setHeaderPairs(newPairs);
    } else {
      // 如果只剩最后一项，清空它而不是删除
      setHeaderPairs([{ key: "", value: "" }]);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
      <div className="bg-white rounded-3xl px-10 py-6 min-w-[40%] max-w-[60%] max-h-[80vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="size-6 my-auto"
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
            <span className="text-lg font-medium">{t("title")}</span>
          </div>
        </div>

        {/* Header 配置区域 */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">{t("headers")}</h3>
          <div className="space-y-3">
            {headerPairs.map((pair, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="text"
                  value={pair.key}
                  onChange={(e) =>
                    updateHeaderPair(index, "key", e.target.value)
                  }
                  placeholder={t("keyPlaceholder")}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="font-medium">:</span>
                <input
                  type="text"
                  value={pair.value}
                  onChange={(e) =>
                    updateHeaderPair(index, "value", e.target.value)
                  }
                  placeholder={t("valuePlaceholder")}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => removeHeaderPair(index)}
                  title="Remove header"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-5 text-indigo-500 cursor-pointer shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={addHeaderPair}
              className="flex items-center text-indigo-500 hover:text-indigo-700 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              {t("addHeaders")}
            </button>
          </div>
        </div>

        {/* Timeout 配置区域 */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">{t("timeoutSettings")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                {t("timeout")}
              </label>
              <input
                type="number"
                min="0"
                value={timeoutValue}
                onChange={(e) => setTimeoutValue(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t("timeoutPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                {("sseReadTimeout")}
              </label>
              <input
                type="number"
                min="0"
                value={sseReadTimeoutValue}
                onChange={(e) => setSseReadTimeoutValue(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t("sseTimeoutPlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-auto pt-4 flex justify-end gap-2 border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-700 cursor-pointer"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default McpAdvancedSettingsComponent;
