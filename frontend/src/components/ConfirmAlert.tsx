// components/ConfirmAlert.tsx
import React from "react";
import { useTranslations } from "next-intl";

interface ConfirmAlertProps {
  type: string;
  message: string;
  onCancel: () => void;
}

const ConfirmAlert: React.FC<ConfirmAlertProps> = ({
  type,
  message,
  onCancel,
}) => {
  const t = useTranslations("ConfirmAlert");
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white rounded-3xl shadow-lg p-6 w-[30%] max-h-[50vh] flex flex-col">
        {type == "success" ? (
          <div className="flex gap-1 items-center text-indigo-500 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="size-5.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
            <h2 className="text-lg font-medium">{t("notice")}</h2>
          </div>
        ) : (
          <div className="flex gap-1 items-center text-red-500 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="size-5.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <h2 className="text-lg font-medium">{t("error")}</h2>
          </div>
        )}
        <p className="mb-6 p-2 overflow-auto">{message}</p>
        <div className="flex justify-end gap-2">
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

export default ConfirmAlert;
