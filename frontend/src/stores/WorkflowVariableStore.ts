import { create } from "zustand";

// 类型定义
interface GlobalState {
  globalVariables: {
    [key: string]: string; // 允许动态属性
  };
  globalDebugVariables: {
    [key: string]: string; // 允许动态属性
  };
  DockerImageUse: string;
  updateDockerImageUse: (dockerImage: string) => void;
  addProperty: (key: string, value: string) => void;
  removeProperty: (key: string) => void;
  updateProperty: (key: string, value: string) => void;
  setGlobalVariables: (globalVariables: { [key: string]: string }) => void;
  reset: () => void;
  addDebugProperty: (key: string, value: string) => void;
  removeDebugProperty: (key: string) => void;
  updateDebugProperty: (key: string, value: string) => void;
  setGlobalDebugVariables: (globalVariables: { [key: string]: string }) => void;
  resetDebug: () => void;
}

// 初始状态
const initialState = {};

export const useGlobalStore = create<GlobalState>()((set, get) => ({
  globalVariables: { ...initialState },
  globalDebugVariables: { ...initialState },
  DockerImageUse: "python-sandbox:latest",
  // 添加新属性
  updateDockerImageUse: (dockerImage: string) => {
    set(() => ({
      DockerImageUse: dockerImage,
    }));
  },
  addProperty: (key, value) => {
    if (get().globalVariables.hasOwnProperty(key)) {
      alert(`Property ${key} already exists`);
      return;
    }
    set((state) => ({
      globalVariables: { ...state.globalVariables, [key]: value },
    }));
  },
  // 添加新属性
  addDebugProperty: (key, value) => {
    if (get().globalDebugVariables.hasOwnProperty(key)) {
      alert(`Property ${key} already exists`);
      return;
    }
    set((state) => ({
      globalDebugVariables: { ...state.globalDebugVariables, [key]: value },
    }));
  },
  // 删除属性（保留初始属性）
  removeProperty: (key) => {
    if (Object.keys(initialState).includes(key)) {
      alert(`Cannot remove initial property: ${key}`);
      return;
    }
    set((state) => {
      const newData = { ...state.globalVariables };
      delete newData[key];
      return { globalVariables: newData };
    });
  },
  // 删除属性（保留初始属性）
  removeDebugProperty: (key) => {
    if (Object.keys(initialState).includes(key)) {
      alert(`Cannot remove initial property: ${key}`);
      return;
    }
    set((state) => {
      const newData = { ...state.globalDebugVariables };
      delete newData[key];
      return { globalDebugVariables: newData };
    });
  },
  // 更新属性值
  updateProperty: (key, value) => {
    if (!get().globalVariables.hasOwnProperty(key)) {
      alert(`Property ${key} does not exist`);
      return;
    }
    set((state) => ({
      globalVariables: { ...state.globalVariables, [key]: value },
    }));
  },
  // 更新属性值
  updateDebugProperty: (key, value) => {
    if (!get().globalDebugVariables.hasOwnProperty(key)) {
      alert(`Property ${key} does not exist`);
      return;
    }
    set((state) => ({
      globalDebugVariables: { ...state.globalDebugVariables, [key]: value },
    }));
  },
  setGlobalVariables: (globalVariables) =>
    set({ globalVariables: { ...globalVariables } }),
  setGlobalDebugVariables: (globalDebugVariables) =>
    set({ globalDebugVariables: { ...globalDebugVariables } }),
  // 重置到初始状态
  reset: () => set({ globalVariables: { ...initialState } }),
  resetDebug: () => set({ globalDebugVariables: { ...initialState } }),
}));
