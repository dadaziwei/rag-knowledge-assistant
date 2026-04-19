// components/CustomEdge.tsx
import { useFlowStore } from "@/stores/flowStore";
import { CustomEdgeProps } from "@/types/types";
import { BaseEdge, getBezierPath } from "@xyflow/react";
import { useTranslations } from "next-intl";

const CustomEdge = (props: CustomEdgeProps) => {
  const t = useTranslations("CustomEdge");
  const {
    id,
    data,
    source,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
  } = props;

  // 获取贝塞尔曲线路径和标签坐标
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const deleteEdge = useFlowStore((state) => state.deleteEdge);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={"url(#arrow)"} style={style} />
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(70% 0.233 277)" />
      </marker>
      <circle r="4" fill="oklch(90% 0.233 277.117)">
        <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <foreignObject
        width={16} // 增大点击区域
        height={16}
        x={(sourceX + targetX) / 2 - 8} // 居中计算调整
        y={(sourceY + targetY) / 2 - 8}
        className="pointer-events-none overflow-hidden" // 防止遮挡连线交互
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="pointer-events-auto w-4 h-4 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
            className="w-4 h-4 rounded-full bg-indigo-500 text-white cursor-pointer border-none p-0 hover:opacity-75 transition-opacity relative 
    after:content-[''] after:absolute after:left-1/2 after:top-1/2 
    after:w-3/4 after:h-[2px] after:bg-current 
    after:-translate-x-1/2 after:-translate-y-1/2 
    after:rotate-45 before:content-[''] 
    before:absolute before:left-1/2 before:top-1/2 
    before:w-3/4 before:h-[2px] before:bg-current 
    before:-translate-x-1/2 before:-translate-y-1/2 
    before:-rotate-45"
          ></button>
        </div>
      </foreignObject>
      {data?.conditionLabel && (
        <foreignObject
          width={32} // 增大点击区域
          height={16}
          x={(sourceX + targetX) / 2 - 24} // 居中计算调整
          y={(sourceY + targetY) / 2 - 8}
          className="pointer-events-none overflow-hidde" // 防止遮挡连线交互
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="w-8 h-4 flex items-center justify-start whitespace-nowrap">
            {data?.conditionLabel}
          </div>
        </foreignObject>
      )}
      {data?.loopType && (
        <foreignObject
          width={96} // 增大点击区域
          height={16}
          x={(sourceX + targetX) / 2 - 48} // 居中计算调整
          y={(sourceY + targetY) / 2 - 24}
          className="pointer-events-none overflow-hidde" // 防止遮挡连线交互
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="w-24 h-4 flex items-center justify-center whitespace-nowrap text-sm text-gray-500">
            {data?.loopType === "next" ? t("loopNext") : t("loopBody")}
          </div>
        </foreignObject>
      )}
    </>
  );
};

export default CustomEdge;
