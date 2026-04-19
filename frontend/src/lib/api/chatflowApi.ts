"use client";
import { BaseUsed, ModelConfig } from "@/types/types";
import axios, { AxiosProgressEvent } from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}`,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle failed token verification globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login if token is invalid or expired
      Cookies.remove("token");
      window.location.href = "/sign-in";
    }
    return Promise.reject(error);
  }
);

export const createChatflow = async (
  chatflowId: string,
  username: string,
  chatflowName: string,
  workflowId: string
) => {
  return api.post("/chatflow/chatflows", {
    chatflow_id: chatflowId,
    username: username,
    chatflow_name: chatflowName,
    workflow_id: workflowId,
  });
};

export const getChatflowHistory = async (workflowId: string) => {
  return api.get("/chatflow/workflow/" + workflowId + "/chatflows");
};

export const renameChatflow = async (chatflowId: string, chatName: string) => {
  return api.post("/chatflow/chatflows/rename", {
    chatflow_id: chatflowId,
    chatflow_new_name: chatName,
  });
};

export const getChatflowContent = async (chatflowId: string) => {
  return api.get("/chatflow/chatflows/" + chatflowId);
};

export const deleteChatflow = async (chatflowId: string) => {
  return api.delete("/chatflow/chatflows/" + chatflowId);
};

export const deleteAllChatflow = async (workflowId: string) => {
  return api.delete("/chatflow/users/" + workflowId + "/chatflows");
};

