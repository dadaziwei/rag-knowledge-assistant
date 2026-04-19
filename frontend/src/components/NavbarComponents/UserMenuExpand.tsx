"use client";
import { useRef, useState } from "react";
import { logoutUser } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { LocaleSelect } from "../LocaleSwitcher";
import { useTranslations } from "next-intl";
import useClickAway from "@/utils/hook";
import Support from "./Support";
import About from "./About";

const UserMenuExpand = () => {
  const t = useTranslations("UserMenu");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openPage, setOpenPage] = useState<string | null>(null);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const { user } = useAuthStore();

  const popupUserInfoRef = useRef<HTMLDivElement>(null);
  const buttonUserInfoRef = useRef<HTMLButtonElement>(null);
  const popupMenuRef = useRef<HTMLDivElement>(null);
  const buttonMenuRef = useRef<HTMLButtonElement>(null);

  useClickAway(
    popupUserInfoRef,
    () => setIsUserInfoOpen(false),
    buttonUserInfoRef // 排除按钮元素
  );

  useClickAway(
    popupMenuRef,
    () => setIsMenuOpen(false),
    buttonMenuRef // 排除按钮元素
  );

  return (
    <div className="rag-user-menu text-[15px]">
      <button
        ref={buttonUserInfoRef}
        type="button"
        className={`rag-icon-button ${isUserInfoOpen ? "rag-icon-button-active" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          setIsMenuOpen(false);
          setIsUserInfoOpen((prev) => !prev);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.0"
          stroke="currentColor"
          className="size-5 cursor-pointer"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </button>

      <button
        type="button"
        className={`rag-icon-button group flex flex-col gap-[4px] cursor-pointer ${
          isMenuOpen ? "rag-icon-button-active" : ""
        }`}
        onClick={() => {
          setIsUserInfoOpen(false);
          setIsMenuOpen((prev) => !prev);
        }}
        ref={buttonMenuRef}
      >
        <div
          className={`rag-hamburger-line ${
            isMenuOpen ? "rotate-45" : ""
          } origin-left ease-in-out duration-500`}
        />
        <div
          className={`rag-hamburger-line ${
            isMenuOpen ? "opacity-0" : ""
          } ease-in-out duration-500`}
        />
        <div
          className={`rag-hamburger-line ${
            isMenuOpen ? "-rotate-45" : ""
          } origin-left ease-in-out duration-500`}
        />
      </button>
      {isMenuOpen && (
        <div
          ref={popupMenuRef}
          className="rag-dropdown"
        >
          <div className="rag-menu-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.25 2.25 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 0 1-5.276 3.67m0 0a9 9 0 0 1-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25"
              />
            </svg>
            <LocaleSelect />
          </div>

          <a
            href="https://daziwei.github.io/daziknow/" // 配置页面的路由路径
            className="rag-menu-item"
            target="_blank" // 新窗口打开
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="text-nowrap">{t("tutorial")}</span>
          </a>

          <button
            className="rag-menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              setOpenPage("support");
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-4.5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
              />
            </svg>
            <span className="text-nowrap">{t("support")}</span>
          </button>

          <button
            className="rag-menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              setOpenPage("about");
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
            <span className="text-nowrap">{t("about")}</span>
          </button>

          <div
            className="rag-menu-item rag-menu-item-danger"
            onClick={logoutUser}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            <span className="text-nowrap">{t("logOut")}</span>
          </div>
        </div>
      )}
      {isUserInfoOpen && (
        <div
          ref={popupUserInfoRef}
          className="rag-dropdown"
        >
          <div className="rag-menu-item rag-menu-static">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>

            {user?.name}
          </div>
          <div className="rag-menu-item rag-menu-static">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-5 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            {user?.email}
          </div>
        </div>
      )}
      {openPage === "support" && <Support onCancel={() => setOpenPage(null)} />}
      {openPage === "about" && <About onCancel={() => setOpenPage(null)} />}
    </div>
  );
};

export default UserMenuExpand;
