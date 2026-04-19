"use client";
import UserMenuExpand from "./UserMenuExpand";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const Navbar = () => {
  const t = useTranslations("Navbar");
  const pathname = usePathname();
  const navbarButtonStyle = "rag-nav-button cursor-pointer";
  const activeNavButtonStyle = `${navbarButtonStyle} rag-nav-button-active`;

  return (
    <div className="rag-topbar">
      <Link href="/" className="rag-nav-brand">
        <span className="rag-brand-mark">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="size-4.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12m6-6H6m13.5 7.5-15-15"
            />
          </svg>
        </span>
        <span className="rag-brand-copy">
          <span className="rag-brand-title">RAG Knowledge</span>
          <span className="rag-brand-subtitle">{t("home")}</span>
        </span>
      </Link>

      <div className="rag-nav-group">
        <Link
          href="/ai-chat"
          className={
            pathname.includes("/ai-chat")
              ? activeNavButtonStyle
              : navbarButtonStyle
          }
        >
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
              d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
          <span className="font-medium text-sm">{t("aiChat")}</span>
        </Link>

        <Link
          href="/work-flow"
          className={
            pathname.includes("/work-flow")
              ? activeNavButtonStyle
              : navbarButtonStyle
          }
        >
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
              d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <span className="font-medium text-sm">{t("workFlow")}</span>
        </Link>

        <Link
          href="/knowledge-base"
          className={
            pathname.includes("/knowledge-base")
              ? activeNavButtonStyle
              : navbarButtonStyle
          }
        >
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
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
          <span className="font-medium text-sm">{t("knowledgeBase")}</span>
        </Link>
      </div>

      <UserMenuExpand />
    </div>
  );
};

export default Navbar;
