import { useTranslations } from "next-intl";
import { useRef } from "react";
import { useClickAway } from "react-use";

interface SupportProps {
  onCancel: () => void;
}

const Support: React.FC<SupportProps> = ({ onCancel }) => {
  const t = useTranslations("Support");
  const ref = useRef(null);
  useClickAway(ref, () => {
    onCancel();
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-5000 bg-black/50">
      <div ref={ref} className="bg-white rounded-3xl shadow-lg p-6 w-[55%] max-h-[70vh] flex flex-col">
        {/* 标题部分 */}
        <div className="flex gap-1 items-center text-indigo-500 mb-2">
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
              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
            />
          </svg>

          <h2 className="text-lg font-medium">{t("title")}</h2>
        </div>
        {/* 可滚动的文本区域 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="h-full p-2 overflow-y-auto">
            {/* 版本号 */}
            <div className="flex flex-col gap-2">
              <div className="py-1 px-2 flex mt-1 items-center justify-between w-full">
                <div className="flex items-center justify-start gap-1 font-medium">
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
                      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                    />
                  </svg>
                  {t("version")}
                </div>
              </div>
              <div className="rounded-2xl shadow-lg w-full mb-2 p-4 bg-gray-100">
                <p className="whitespace-pre-wrap font-mono text-sm px-4">
                  {t("versionText")}
                </p>
              </div>
            </div>
            {/* ISSUE报告 */}
            <div className="flex flex-col gap-2">
              <div className="py-1 px-2 flex mt-1 items-center justify-between w-full">
                <div className="flex items-center justify-start gap-1 font-medium">
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
                      d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                    />
                  </svg>
                  {t("bugReport")}
                </div>
              </div>
              <div className="rounded-2xl shadow-lg w-full mb-2 p-4 bg-gray-100">
                <a
                  href="https://github.com/daziwei/daziknow/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-pre-wrap font-mono text-sm cursor-pointer hover:text-indigo-500 pl-4 pr-[20vw]"
                >
                  https://github.com/daziwei/daziknow/issues
                </a>
              </div>
            </div>
            {/* 社区支持 */}
            <div className="flex flex-col gap-2">
              <div className="py-1 px-2 flex mt-1 items-center justify-between w-full">
                <div className="flex items-center justify-start gap-1 font-medium">
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
                      d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                    />
                  </svg>
                  {t("community")}
                </div>
              </div>
              <div className="rounded-2xl shadow-lg flex flex-col gap-1 w-full mb-2 p-4 bg-gray-100">
                <a
                  href="https://github.com/daziwei/daziknow/blob/main/README_zh.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-pre-wrap font-mono text-sm px-4 hover:text-indigo-500 cursor-pointer"
                >
                  {t("wechatGroup")}
                </a>
                <a
                  href="https://github.com/daziwei/daziknow/blob/main/docs/resume-rag-upgrade.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-pre-wrap font-mono text-sm px-4 hover:text-indigo-500 cursor-pointer"
                >
                  {t("wechatOfficialAccount")}
                </a>
                <a
                  href="https://github.com/daziwei/daziknow#local-development"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-pre-wrap font-mono text-sm px-4 hover:text-indigo-500 cursor-pointer"
                >
                  {t("bilibili")}
                </a>
                <a
                  href="https://github.com/daziwei/daziknow#resume-summary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-pre-wrap font-mono text-sm px-4 hover:text-indigo-500 cursor-pointer"
                >
                  {t("zhihu")}
                </a>
                <a
                  href="https://github.com/daziwei/daziknow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-pre-wrap font-mono text-sm px-4 hover:text-indigo-500 cursor-pointer"
                >
                  {t("githubRepo")}
                </a>
                <p className="whitespace-pre-wrap font-mono text-sm px-4">
                  {t("authorEmail", { email: "daziwei@example.com" })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Support;
