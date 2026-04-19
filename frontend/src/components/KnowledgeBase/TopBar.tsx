import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction } from "react";

interface TopBarProps {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
}

const TopBar: React.FC<TopBarProps> = ({ searchTerm, setSearchTerm }) => {
  const t = useTranslations("KnowledgeBaseTopBar");
  return (
    <div className="bg-white shadow-xs rounded-3xl flex items-center px-6 justify-between w-full h-[12%]">
      <div className="flex items-center gap-2">
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
            transform="translate(0,0.5)"
          />
        </svg>

        <h1 className="text-xl font-medium text-gray-800">{t("title")}</h1>
      </div>
      <div className="relative w-[22%]">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          className="w-full pl-6 pr-10 py-1.5 rounded-full border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-6 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
        >
          <path
            fillRule="evenodd"
            d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
};

export default TopBar;
