"use client";

import Navbar from "@/components/NavbarComponents/Navbar";
import AddWorkflow from "@/components/Workflow/AddWorkflow";
import FlowEditor from "@/components/Workflow/FlowEditor";
import LeftSideBar from "@/components/Workflow/LeftSideBar";
import TopBar from "@/components/Workflow/TopBar";
import {
  createWorkflow,
  deleteWorkflow,
  getAllWorkflow,
  getWorkflowDetails,
  renameWorkflow,
} from "@/lib/api/workflowApi";
import withAuth from "@/middlewares/withAuth";
import { useAuthStore } from "@/stores/authStore";
import { Flow, WorkflowAll } from "@/types/types";
import { useState, useEffect, useCallback } from "react";
import { useFlowStore } from "@/stores/flowStore";
import { useGlobalStore } from "@/stores/WorkflowVariableStore";
import { useTranslations } from "next-intl";

const Workflow = () => {
  const t=useTranslations("WorkflowPage")
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [flows, setFlows] = useState<Flow[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const [refresh, setRefresh] = useState<boolean>(false);
  const [fullScreenFlow, setFullScreenFlow] = useState<boolean>(false);
  const [workflowAll, setWorkflowAll] = useState<WorkflowAll | null>(null);
  const { resethistory, resetfuture, setNodes, setEdges } = useFlowStore();
  const { setGlobalVariables, updateDockerImageUse } = useGlobalStore();

  // 成功消息自动消失
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Wrap fetchAllWorkflow with useCallback
  const fetchAllWorkflow = useCallback(async () => {
    if (user?.name) {
      try {
        const response = await getAllWorkflow(user.name);
        const flows: Flow[] = response.data.map((item: any) => ({
          name: item.workflow_name,
          flowId: item.workflow_id,
          lastModifyTime: item.last_modify_at.split("T")[0],
          createTime: item.created_at.split("T")[0],
        }));
        setFlows(flows);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    }
  }, [user?.name]); // Add dependencies

  // Wrap fetchWorkflowDetails with useCallback
  const fetchWorkflowDetails = useCallback(async () => {
    if (user?.name && selectedFlow) {
      try {
        const response = await getWorkflowDetails(selectedFlow);
        const item = response.data;
        const workflowAllData: WorkflowAll = {
          workflowId: item.workflow_id,
          workflowName: item.workflow_name,
          workflowConfig: item.workflow_config,
          nodes: item.nodes,
          edges: item.edges,
          startNode: item.start_node,
          globalVariables: item.global_variables,
          createTime: item.created_at,
          lastModifyTime: item.last_modify_at,
        };
        setNodes(item.nodes);
        setEdges(item.edges);
        setGlobalVariables(item.global_variables);
        setWorkflowAll(workflowAllData);
        updateDockerImageUse(item.workflow_config.docker_image_use);
        resethistory(item.nodes, item.edges);
        resetfuture();
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    }
  }, [
    user?.name,
    selectedFlow,
    resetfuture,
    resethistory,
    setEdges,
    setGlobalVariables,
    setNodes,
    updateDockerImageUse,
  ]);

  useEffect(() => {
    fetchAllWorkflow();
  }, [user?.name, refresh, fetchAllWorkflow]); // Add fetchAllWorkflow

  useEffect(() => {
    fetchWorkflowDetails();
  }, [user?.name, selectedFlow, fetchWorkflowDetails]);

  // 创建工作流校验
  const handleCreateConfirm = async () => {
    if (!newFlowName.trim()) {
      setNameError(t("createError.nameRequired"));
      return;
    }
    if (flows.some((flow) => flow.name === newFlowName)) {
      setNameError(t("createError.nameExists"));
      return;
    }

    if (user?.name) {
      try {
        setFlows((prevFlow: Flow[]) => {
          return [
            {
              name: t("loadingText"),
              flowId: "1",
              lastModifyTime: t("loadingText"),
              createTime: t("loadingText"),
              fileNumber: 0,
            },
            ...prevFlow,
          ];
        });
        setShowCreateModal(false);
        setNewFlowName("");
        setNameError(null);
        const response = await createWorkflow(
          "",
          user.name,
          newFlowName,
          { docker_image_use: "python-sandbox:latest" },
          "node_start",
          {},
          [],
          []
        );
        setSelectedFlow(null);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    }
    setRefresh((pre) => !pre);
  };

  // 删除工作流
  const handledeleteFlow = async (flow: Flow) => {
    if (user?.name) {
      try {
        setFlows((prevFlow: Flow[]) =>
          prevFlow.filter((c: { flowId: string }) => c.flowId !== flow.flowId)
        );
        const response = await deleteWorkflow(flow.flowId);
      } catch (error) {
        console.error("Error delete Knowledge Flow:", error);
      }
      setSelectedFlow(null);
      setRefresh((pre) => !pre);
    }
  };

  const handleRenameWorkflow = (flow: Flow, inputValue: string) => {
    const fetchRenameChat = async () => {
      if (user?.name) {
        try {
          setFlows((prevFlow: Flow[]) =>
            prevFlow.map((c) =>
              c.flowId === flow.flowId ? { ...c, name: inputValue } : c
            )
          );
          await renameWorkflow(flow.flowId, inputValue);
          setWorkflowAll((prev) => {
            return prev ? { ...prev, workflowName: inputValue } : prev;
          });
          setRefresh((prev) => !prev);
        } catch (error) {
          console.error("Error fetching rename chat:", error);
        }
      }
    };
    fetchRenameChat(); // 调用获取聊天记录的函数
  };

  return (
    <div className="rag-page overflow-hidden flex flex-col">
      <Navbar />
      <div className="rag-shell">
        <div className="w-full h-full px-6 pb-6 pt-2">
          {/* 新建工作流弹窗 */}
          {showCreateModal && (
            <AddWorkflow
              setShowCreateModal={setShowCreateModal}
              nameError={nameError}
              setNameError={setNameError}
              newWorkflowName={newFlowName}
              setNewWorkflowName={setNewFlowName}
              onCreateConfirm={handleCreateConfirm}
            />
          )}

          {/* 成功提示 */}
          {successMessage && (
            <div className="w-[20%] text-center fixed top-[40%] left-[40%] rag-button-primary shadow-lg animate-bounce">
              {successMessage}
            </div>
          )}

          {/* 顶部导航 */}
          {!fullScreenFlow && (
            <TopBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          )}

          <div
            className={`mx-auto px-4 pt-4 flex gap-6 ${
              fullScreenFlow ? "h-full" : "h-[88%]"
            }`}
          >
            {/* 左侧边栏 */}
            {!fullScreenFlow && (
              <LeftSideBar
                flows={flows}
                searchTerm={searchTerm}
                setShowCreateModal={setShowCreateModal}
                selectedFlow={selectedFlow}
                setSelectedFlow={setSelectedFlow}
                ondeleteFlow={handledeleteFlow}
                onRenameWorkflow={handleRenameWorkflow}
              />
            )}

            {/* 右侧内容区 */}
            {selectedFlow && workflowAll ? (
              <FlowEditor
                workFlow={workflowAll}
                setFullScreenFlow={setFullScreenFlow}
                fullScreenFlow={fullScreenFlow}
              />
            ) : (
              <div className="flex-1 h-full flex items-center flex-col justify-center gap-2 bg-white rounded-3xl shadow-sm p-6">
                <p className="text-gray-500 text-2xl">
                  {t("emptyPrompt.createOrChoose")}
                </p>
                <p className="text-gray-500 text-lg">
                  {t("emptyPrompt.accessTutorials")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(Workflow);
