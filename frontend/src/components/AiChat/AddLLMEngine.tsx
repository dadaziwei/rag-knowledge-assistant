import { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";

interface AddLLMEngineProps {
  setShowAddLLM: Dispatch<SetStateAction<boolean>>;
  nameError: string | null;
  setNameError: Dispatch<SetStateAction<string | null>>;
  newModelName: string;
  setNewModelName: Dispatch<SetStateAction<string>>;
  onCreateConfirm: () => void;
}

const AddLLMEngine: React.FC<AddLLMEngineProps> = ({
  setShowAddLLM,
  nameError,
  setNameError,
  newModelName,
  setNewModelName,
  onCreateConfirm,
}) => {
  const t = useTranslations("AddLLMEngine");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 w-[35%]">
        <div className="flex items-center gap-2 mb-6 px-2">
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
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
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
            value={newModelName}
            onChange={(e) => {
              setNewModelName(e.target.value);
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
            onClick={() => setShowAddLLM(false)}
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

export default AddLLMEngine;
