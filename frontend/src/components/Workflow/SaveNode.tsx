import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction } from "react";

interface SaveCustomNodeProps {
  setShowSaveNode: Dispatch<SetStateAction<boolean>>;
  nameError: string | null;
  setNameError: Dispatch<SetStateAction<string | null>>;
  newNodeName: string;
  setNewNodeName: Dispatch<SetStateAction<string>>;
  onCreateConfirm: () => void;
}

const SaveCustomNode: React.FC<SaveCustomNodeProps> = ({
  setShowSaveNode,
  nameError,
  setNameError,
  newNodeName,
  setNewNodeName,
  onCreateConfirm,
}) => {
  const t = useTranslations("SaveCustomNode");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 w-[35%]">
        <div className="flex items-center gap-1 mb-6">
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
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
          <h3 className="text-lg font-medium">{t("title")}</h3>
        </div>
        <div className="px-4 w-full">
          <input
            type="text"
            placeholder={t("placeholder")}
            className={`w-full px-4 py-2 mb-2 border border-gray-200 rounded-3xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
              nameError ? "border-red-500" : "border-gray-300"
            }`}
            value={newNodeName}
            onChange={(e) => {
              setNewNodeName(e.target.value);
              setNameError(null);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault(); // 防止默认回车行为
                onCreateConfirm();
              }
            }}
            autoFocus
          />
          {nameError && (
            <p className="text-red-500 text-sm mb-2 px-2">{nameError}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setShowSaveNode(false)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onCreateConfirm}
            className="px-4 py-2 text-white bg-indigo-500 rounded-full hover:bg-indigo-700 cursor-pointer"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveCustomNode;
