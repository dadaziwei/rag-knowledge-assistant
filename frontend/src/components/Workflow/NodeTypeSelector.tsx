import { useFlowStore } from "@/stores/flowStore";
import { CustomNode, NodeTypeKey, nodeTypesInfo } from "@/types/types";
import { Dispatch, SetStateAction, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import { parseToBeijingTime } from "@/utils/date";
import { useTranslations } from "next-intl";

interface NodeTypeSelectorProps {
  deleteCustomNode: (custom_node_name: string) => Promise<void>;
  workflowName: string;
  addNode: (key: NodeTypeKey) => void;
  addCustomNode: (name: string) => void;
  customNodes: {
    [key: string]: CustomNode;
  };
  setCustomNodes: Dispatch<
    SetStateAction<{
      [key: string]: CustomNode;
    }>
  >;
  lastModifyTime: string;
}

const NodeTypeSelector: React.FC<NodeTypeSelectorProps> = ({
  deleteCustomNode,
  addNode,
  addCustomNode,
  customNodes,
  setCustomNodes,
  workflowName,
  lastModifyTime,
}) => {
  const t = useTranslations("NodeTypeSelector");
  const selectedType = useFlowStore((state) => state.selectedType);
  const setSelectedType = useFlowStore((state) => state.setSelectedType);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmDeleteNode, setShowConfirmDeleteNode] = useState<
    string | null
  >(null);

  const confirmDeleteNode = () => {
    if (showConfirmDeleteNode) {
      deleteCustomNode(showConfirmDeleteNode);
      setShowConfirmDeleteNode(null); // 关闭对话框
    }
  };

  const cancelDeleteNode = () => {
    if (showConfirmDeleteNode) {
      setShowConfirmDeleteNode(null); // 关闭对话框
    }
  };

  // 过滤知识库
  const filteredNodes = Object.entries(customNodes).filter(([name, node]) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-col items-start justify-center px-2 gap-1">
        <div className="flex items-center justify-start gap-1 w-full">
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
              d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>

          <span className="whitespace-nowrap w-[90%] overflow-auto font-medium">
            {workflowName}
          </span>
        </div>
        <span className="whitespace-nowrap overflow-auto text-xs font-medium text-gray-700">
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
        </span>
      </div>
      <details className="group w-full space-y-1" open>
        <summary className="py-1 border-b-2 mb-1 border-gray-200 text-center text-sm">
          {t("baseNodeSection")}
        </summary>
        {Object.entries(nodeTypesInfo).map(([key, type]) => (
          <div
            key={key}
            className={`cursor-pointer py-1 px-2.5 rounded-full text-[15px] text-center hover:bg-indigo-500 hover:text-white
              }`}
            onClick={() => {
              const typeKey = key as NodeTypeKey;
              if (selectedType === typeKey) {
                addNode(typeKey);
              } else {
                setSelectedType(typeKey);
                addNode(typeKey);
              }
            }}
          >
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
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
              {t("label." + key)}
            </div>
          </div>
        ))}
      </details>
      <details className="group w-full space-y-1" open>
        <summary className="py-1 border-b-2 border-gray-200 text-center text-sm">
          {t("customNodeSection")}
        </summary>
        <div className="relative w-[90%] mx-auto text-xs mt-1.5">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="w-full pl-3 pr-6 py-1 rounded-full border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4 absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
          >
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {filteredNodes.map(([name, node]) => (
          <div
            key={name}
            className={`cursor-pointer py-1 px-2.5 rounded-full text-center text-[15px] hover:bg-indigo-500 hover:text-white
              }`}
            onClick={() => {
              addCustomNode(name);
            }}
          >
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center justify-start gap-1 overflow-auto w-full">
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
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                <span className="whitespace-nowrap overflow-auto">{name}</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4.5 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDeleteNode(name);
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </div>
          </div>
        ))}
      </details>
      {showConfirmDeleteNode && (
        <ConfirmDialog
          message={t("deleteConfirm", { nodeName: showConfirmDeleteNode })}
          onConfirm={confirmDeleteNode}
          onCancel={cancelDeleteNode}
        />
      )}
    </div>
  );
};

export default NodeTypeSelector;
