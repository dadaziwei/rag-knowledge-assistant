"use client";
import { useAuthStore } from "@/stores/authStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSelect } from "@/components/LocaleSwitcher";

const Homepage = () => {
  const t = useTranslations("HomePage");
  const { user } = useAuthStore();
  const router = useRouter();
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    setUserLoaded(true);
  }, [user]);

  if (!userLoaded) {
    return null;
  }

  return (
    <main className="rag-home">
      <div className="rag-home-locale">
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
            d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.25 2.25 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 0 1-5.276 3.67m0 0a9 9 0 0 1-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25"
          />
        </svg>
        <LocaleSelect />
      </div>

      <section className="rag-home-shell">
        <div className="rag-home-copy">
          <div className="rag-home-kicker">
            <span>Enterprise RAG</span>
            <span>FastAPI + LangChain</span>
          </div>

          <div>
            <h1 className="rag-home-title">{t("title")}</h1>
            <p className="rag-home-subtitle">
              {t.rich("subtitle1", {
                brand: (chunks) => (
                  <span className="font-semibold text-[var(--rag-brand)]">
                    {chunks}
                  </span>
                ),
              })}
              <br />
              {t("subtitle2")}
            </p>
          </div>

          <div className="rag-home-actions">
            {user === null ? (
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="rag-button-primary cursor-pointer"
              >
                <span>{t("joinButton")}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/ai-chat")}
                className="rag-button-primary cursor-pointer"
              >
                <span>{t("startButton")}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}

            <Link href="/knowledge-base" className="rag-button-secondary">
              {t("knowledgeButton")}
            </Link>
          </div>

          <div className="rag-home-meta">
            <div>{t("forgetTokenization")}</div>
            <div>
              {t("contactPrefix")}
              <span className="mx-1 text-[var(--rag-brand)]">
                daziwei@example.com
              </span>
              <span>|</span>
              <Link
                href="https://github.com/daziwei"
                className="ml-1 text-[var(--rag-brand)] hover:text-[var(--rag-brand-strong)]"
              >
                {t("githubLink")}
              </Link>
            </div>
          </div>
        </div>

        <div className="rag-home-visual">
          <Image
            src="/pictures/rag-knowledge-hero.svg"
            alt="RAG knowledge base document retrieval and streaming answer workflow"
            width={960}
            height={720}
            priority
          />
        </div>
      </section>
    </main>
  );
};

export default Homepage;
