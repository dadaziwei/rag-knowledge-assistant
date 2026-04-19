import { useFlowStore } from "@/stores/flowStore";
import { CustomNodeProps, NodeTypeKey } from "@/types/types";
import { Handle, Position } from "@xyflow/react";
import { useTranslations } from "next-intl";

// 根据节点类型配置不同的连接点
const CustomNodeComponent = ({
  data,
  isConnectable,
  id,
  selected,
  ...props
}: CustomNodeProps) => {
  const t=useTranslations("CustomNode")
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const getHandles = (nodeType: NodeTypeKey) => {
    switch (nodeType) {
      case "start":
        return (
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            className="!top-[calc(50%)] h-3 w-3 rounded-full !bg-indigo-500 relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-white after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-white before:content-['']"
          />
        );
      case "loop":
        return (
          <>
            <Handle
              type="target"
              position={Position.Left}
              isConnectable={isConnectable}
              className="!top-[calc(60%)] h-3 w-3 rounded-full !bg-indigo-500 relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-white after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-white before:content-['']"
            />
            <Handle
              type="source"
              position={Position.Right}
              isConnectable={isConnectable}
              className="!top-[calc(60%)] h-3 w-3 rounded-full !bg-indigo-500 relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-white after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-white before:content-['']"
            />
            <Handle
              id="source"
              type="source"
              position={Position.Bottom}
              isConnectable={isConnectable}
              className="!left-[25%] h-3 w-3 rounded-full !bg-white relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-indigo-700 after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-indigo-700 before:content-['']"
            />
            <Handle
              id="target"
              type="target"
              position={Position.Bottom}
              isConnectable={isConnectable}
              className="!left-[75%] h-3 w-3 rounded-full !bg-white relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-indigo-700 after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-indigo-700 before:content-['']"
            />
          </>
        );
      default:
        return (
          <>
            <Handle
              type="target"
              position={Position.Left}
              isConnectable={isConnectable}
              className="!top-[calc(50%)] h-3 w-3 rounded-full !bg-indigo-500 relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-white after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-white before:content-['']"
            />
            <Handle
              type="source"
              position={Position.Right}
              isConnectable={isConnectable}
              className="!top-[calc(50%)] h-3 w-3 rounded-full !bg-indigo-500 relative 
            after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 
            after:w-[10px] after:h-[2px] after:bg-white after:content-[''] 
            before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 
            before:h-[10px] before:w-[2px] before:bg-white before:content-['']"
            />
          </>
        );
    }
  };
  return (
    <div
      className={`${
        data.nodeType == "start"
          ? "w-24 h-24 rounded-l-[64px] rounded-r-2xl pl-[32px]"
          : data.nodeType == "loop"
          ? "w-28 h-36 rounded-t-[64px] rounded-b-3xl"
          : data.nodeType == "vlm"
          ? "w-42 h-32 rounded-4xl"
          : data.nodeType == "condition"
          ? "w-28 h-42 rounded-4xl"
          : "w-32 h-32 rounded-3xl"
      }   p-2 shadow-lg ${
        data.status === "failed"
          ? selected
            ? "border-3 border-red-600"
            : "border-2 border-red-500"
          : data.status === "pause"
          ? selected
            ? "border-2 border-red-600"
            : "border-1 border-red-500"
          : selected
          ? "border-2 border-indigo-500"
          : "border-1 border-white"
      } bg-white`}
    >
      {getHandles(data.nodeType)}
      <button
        onClick={(e) => {
          e.stopPropagation(); // 阻止事件冒泡
          deleteNode(id);
        }}
        className={`${
          data.nodeType == "start"
            ? "top-1 right-1"
            : data.nodeType == "loop"
            ? "top-5 right-5"
            : data.nodeType == "condition" || data.nodeType == "vlm"
            ? "top-3 right-3"
            : "top-2 right-2"
        } cursor-pointer absolute`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-4 text-indigo-500"
        >
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
      <div
        // onBlur={(e) =>
        //   useFlowStore.getState().updateNodeLabel(id, e.currentTarget.innerText)
        // }
        className={`${
          data.nodeType == "start"
            ? "h-[36%]  pr-2"
            : data.nodeType == "loop"
            ? "h-[36%] pt-[18%]"
            : "h-[36%] "
        } h-[40%] flex flex-col items-center justify-center gap-1`}
      >
        <div className="flex items-center justify-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-4 shrink-0"
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

          <span className="whitespace-nowrap">
            {t("label."+data.nodeType)}
          </span>
          {data.debug && (
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
          )}
        </div>
        <div className="flex items-center justify-center gap-1">
          {data.isChatflowInput && (
            <div className="flex items-center justify-center w-full text-xs text-indigo-500 gap-2">
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
            </div>
          )}
          {data.isChatflowOutput && (
            <div className="flex items-center justify-center w-full text-xs text-indigo-500 gap-2">
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
            </div>
          )}
          {data.useChatHistory && (
            <div className="flex items-center justify-center w-full text-xs text-indigo-500 gap-2">
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
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
          )}
          {Object.entries(data.mcpUse || {}).length > 0 && (
            <div className="flex items-center justify-center w-full text-xs text-indigo-500 gap-2">
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
                  d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
      <div
        className={`${
          data.nodeType == "loop"
            ? "h-[calc(64%-16px)] mt-1 mb-3"
            : data.nodeType == "condition"
            ? "h-[calc(60%-12px)] mt-1 mb-5"
            : "h-[calc(64%-12px)] mt-1 mb-3"
        } ${
          data.nodeType == "start"
            ? "mx-[calc(10%-8px)] mr-2"
            : "mx-[calc(20%-8px)]"
        } flex items-center justify-center rounded-3xl bg-gray-100`}
      >
        {data.status === "failed" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6 text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
            />
          </svg>
        ) : data.status === "pause" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6 text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811Z"
            />
          </svg>
        ) : data.status === "running" ? (
          <div className="animate-spin h-4 w-4 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
        ) : data.status === "input" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6 text-indigo-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className={`size-6 ${
              data.status === "ok" ? "text-indigo-500" : "opacity-30"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
            />
          </svg>
        )}
      </div>
      <div
        // onBlur={(e) =>
        //   useFlowStore.getState().updateNodeLabel(id, e.currentTarget.innerText)
        // }
        className="absolute left-1/2 -translate-x-1/2 -top-1 -translate-y-[100%] flex items-center justify-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-4 shrink-0"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>
        <span className="whitespace-nowrap">{data.label}</span>
      </div>
      {data.nodeType === "vlm" && data.modelConfig && (
        <div className="mt-2 absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1">
          <div className="flex flex-col mx-auto">
            <div className="rounded-xl flex flex-col item-center justify-center gap-1">
              <div className="w-full text-sm flex items-center justify-center gap-2 text-gray-500 pb-1">
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
                    d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                {data.modelConfig.modelName ? (
                  <div className="text-gray-500 whitespace-nowrap overflow-x-scroll scrollbar-hide ">
                    {data.modelConfig.modelName}
                  </div>
                ) : (
                  <div className="text-gray-500">{t("noModelChosen")}</div>
                )}
              </div>
              {data.modelConfig.baseUsed?.length > 0 ? (
                <div className="flex flex-col items-center justify-center w-full text-sm text-gray-500 gap-2">
                  <div className="px-10 flex items-center justify-center gap-1">
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
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                    <div className="whitespace-nowrap">
                      {t("knowledgeBaseAccessed")}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center justify-center flex-wrap">
                    {data.modelConfig.baseUsed.map((base, index) => (
                      <div
                        className="flex gap-1 items-center justify-center break-all"
                        key={index}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          className="size-4 shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                          />
                        </svg>

                        <span className="break-words">{base.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full text-sm text-gray-500 gap-1">
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
                      d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                  <div className="whitespace-nowrap">
                    {t("noKnowledgeBaseAccessed")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomNodeComponent;
