import {
  deleteFile,
  getKBFiles,
  getUserFiles,
} from "@/lib/api/knowledgeBaseApi";
import { useAuthStore } from "@/stores/authStore";
import { Base, KnowledgeFile } from "@/types/types";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ShowFiles from "./ShowFiles";
import { SupportUploadFormat } from "@/utils/file";
import { useTranslations } from "next-intl"; // 添加多语言支持

interface KnowledgeBaseDetailsProps {
  bases: Base[];
  setBases: Dispatch<SetStateAction<Base[]>>;
  selectedBase: string | null;
  setSelectedBase: Dispatch<SetStateAction<string | null>>;
  onFileUpload: (files: FileList) => void;
  buttonText: string;
  isSendDisabled: boolean;
}

const KnowledgeBaseDetails: React.FC<KnowledgeBaseDetailsProps> = ({
  bases,
  setBases,
  selectedBase,
  setSelectedBase,
  onFileUpload,
  buttonText,
  isSendDisabled,
}) => {
  const t = useTranslations("KnowledgeBaseDetails");
  // 拖放处理
  const [dragActive, setDragActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const { user } = useAuthStore();
  // 在组件顶部声明 ref（如果是函数组件）
  // 为每个搜索框创建独立 ref
  const search1Ref = useRef<HTMLInputElement>(null);
  const search2Ref = useRef<HTMLInputElement>(null);
  const loadFiles = useCallback(async () => {
    if (!user?.name) return;
    try {
      let response;
      if (selectedBase) {
        response = await getKBFiles(
          selectedBase,
          currentPage,
          pageSize,
          searchKeyword
        );
      } else {
        response = await getUserFiles(
          user.name,
          currentPage,
          pageSize,
          searchKeyword
        );
      }
      setFiles(response.data.data);
      setTotalFiles(response.data.total);
    } catch (error) {
      console.error("Error loading files:", error);
    }
  }, [currentPage, searchKeyword, pageSize, user?.name, selectedBase]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    setSearchKeyword("");
    setCurrentPage(1);
  }, [selectedBase]); // Only selectedBase as dependency

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1); // 搜索时重置页码
  };

  const handleDeleteFile = async (file: KnowledgeFile) => {
    try {
      setFiles((prevFiles) =>
        prevFiles.filter((pre_file) => pre_file.file_id !== file.file_id)
      );
      setBases((prevBases) =>
        prevBases.map((base) =>
          base.baseId === file.kb_id
            ? { ...base, fileNumber: Math.max(0, base.fileNumber - 1) } // 防止负数
            : base
        )
      );
      await deleteFile(file.kb_id, file.file_id);
    } catch (error) {
      console.error("Error delete file:", error);
    }
  };

  const handleDownload = async (file: KnowledgeFile) => {
    try {
      window.open(file.url, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
      alert(t("downloadFailed"));
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        onFileUpload(e.dataTransfer.files);
      }
    },
    [onFileUpload] // Add onFileUpload to dependencies
  );

  return (
    <div className="flex-1 h-full">
      {selectedBase ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm h-full  flex flex-col">
          <div className="h-[15%]">
            <div className="flex items-center gap-2 mb-2 justify-between">
              <div className="flex items-center gap-2 max-w-[70%] overflow-scroll scrollbar-hide">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-6 mr-2 hover:cursor-pointer text-indigo-500 hover:text-indigo-700"
                  onClick={() => setSelectedBase(null)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                  />
                </svg>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                  />
                </svg>

                <h2 className="text-xl font-medium overflow-x-auto whitespace-nowrap">
                  {bases.find((r) => r.baseId === selectedBase)?.name}
                </h2>
              </div>
              <div className="relative w-[25%]">
                <input
                  ref={search1Ref}
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  className="w-full pl-6 pr-10 py-1 rounded-full border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch(search1Ref.current?.value || "");
                      search1Ref.current?.blur();
                    }
                  }}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:cursor-pointer"
                  onClick={() => {
                    if (search1Ref.current) {
                      handleSearch(search1Ref.current.value || "");
                      search1Ref.current.blur();
                    }
                  }}
                >
                  <path
                    fillRule="evenodd"
                    d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-gray-500">
              <span>
                {t("fileNumber")}
                {bases.find((r) => r.baseId === selectedBase)?.fileNumber}
              </span>
              <span>
                {t("createTime")}
                {bases.find((r) => r.baseId === selectedBase)?.createTime}
              </span>
            </div>
          </div>

          {/* 上传区域 */}
          <div
            className={`h-[25%] mb-6 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 text-center transition-all
                  ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
                      : "border-gray-300"
                  }
                  ${isSendDisabled ? "pointer-events-none opacity-75" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="hidden"
              id="file-upload"
              multiple
              onChange={(e) => e.target.files && onFileUpload(e.target.files)}
              accept={SupportUploadFormat}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer inline-block px-6 py-2 rounded-full transition-colors
                    ${
                      dragActive
                        ? "bg-indigo-700"
                        : "bg-indigo-500 hover:bg-indigo-700"
                    } text-white`}
            >
              <div className="flex items-center gap-2 text-[15px]">
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
                    d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                    transform="translate(0,0.5)"
                  />
                </svg>
                <span>{buttonText}</span>
              </div>
            </label>
            <p className="mt-4 text-gray-600">
              {t("dragPrompt")}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {t("supportedFormats")}
            </p>
          </div>

          <div className="w-full h-[calc(60%-24px)]">
            <ShowFiles
              files={files}
              onDownload={handleDownload}
              bases={bases}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalFiles={totalFiles}
              ondeleteFile={handleDeleteFile}
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center bg-white rounded-3xl shadow-sm flex-col pb-6">
          <div className="flex items-center justify-center h-[10%] w-full">
            <p className="text-gray-500 text-lg">
             {t("choosePrompt")}
            </p>
          </div>
          <div className="h-[90%] flex flex-col bg-white rounded-3xl shadow-sm p-6 w-[90%]">
            <div className="mb-6 flex items-center justify-between h-[10%]">
              <h2 className="text-xl font-medium flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                  />
                </svg>
                {t("allFilesTitle")}
              </h2>
              <div className="relative w-[25%]">
                <input
                  ref={search2Ref}
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  className="w-full pl-6 pr-10 py-1 rounded-full border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch(search2Ref.current?.value || "");
                      search2Ref.current?.blur();
                    }
                  }}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:cursor-pointer"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                    clipRule="evenodd"
                    onClick={() => {
                      if (search2Ref.current) {
                        handleSearch(search2Ref.current.value || "");
                        search2Ref.current.blur();
                      }
                    }}
                  />
                </svg>
              </div>
            </div>
            <div className="w-full h-[90%]">
              <ShowFiles
                files={files}
                onDownload={handleDownload}
                bases={bases}
                pageSize={pageSize}
                setPageSize={setPageSize}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalFiles={totalFiles}
                ondeleteFile={handleDeleteFile}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseDetails;
