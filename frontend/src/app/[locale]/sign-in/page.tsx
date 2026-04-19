"use client";
import Alert from "@/components/Alert";
import { loginUser, registerUser } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { transferableAbortSignal } from "util";

const SignInPage = () => {
  const t = useTranslations("SignInPage");
  const [isLogin, setIsLogin] = useState(true);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAlert, setShowAlert] = useState({
    show: false,
    message: "",
    type: "",
  });

  const router = useRouter(); // 获取 router 实例
  const searchParams = useSearchParams();

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      if (name.includes("-") || name.includes("_") || name.includes(" ")) {
        setShowAlert({
          show: true,
          message: t("illegalCharError"),
          type: "error",
        });
        return;
      }
      if (isLogin) {
        await loginUser(name, password);
        setShowAlert({
          show: true,
          message: t("loginSuccess"),
          type: "success",
        });
        // 获取 returnUrl 参数
        const returnUrl = searchParams.get("returnUrl");
        router.push(returnUrl || "/"); // 登录成功后跳转到 returnUrl 或者首页
      } else {
        await registerUser(name, email, password);
        setShowAlert({
          show: true,
          message: t("registerSuccess"),
          type: "success",
        });
        setIsLogin(true);
        // 获取 returnUrl 参数
        const returnUrl = searchParams.get("returnUrl");
        router.push(returnUrl || "/"); // 登录成功后跳转到 returnUrl 或者首页
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setShowAlert({
        show: true,
        message: isLogin
          ? t("loginFailed") + errorMessage
          : t("registerFailed") + errorMessage,
        type: "error",
      });
    } finally {
      setPassword("");
      setPending(false);
    }
  };

  // Automatically hide the alert after 2 seconds
  useEffect(() => {
    if (showAlert.show) {
      const timer = setTimeout(() => {
        setShowAlert({ ...showAlert, show: false });
      }, 5000); // 自动关闭弹窗

      return () => clearTimeout(timer); // 清除计时器，防止内存泄漏
    }
  }, [showAlert]);

  return (
    <div className="absolute w-full h-full top-0 left-0 min-h-screen flex items-center justify-center opacity-100 scrollbar-hide">
      {showAlert.show && <Alert showAlert={showAlert} />}
      <div
        className={`w-full max-w-[30%] space-y-6 p-10 bg-white rounded-3xl shadow-lg z-10  opacity-80`}
      >
        <h1
          className={`text-center text-3xl font-extrabold text-transparent bg-clip-text
            bg-gradient-to-r from-indigo-500 to-indigo-700`}
        >
          {t("brand")}
        </h1>

        <h2 className="text-2xl font-bold text-center text-gray-700">
          {isLogin ? t("loginTitle") : t("registerTitle")}
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              {t("nameLabel")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl shadow-xs focus:outline-hidden focus:border-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            />
          </div>

          {!isLogin && (
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("emailLabel")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl shadow-xs focus:outline-hidden focus:border-2 focus:ring-indigo-500 focus:border-indigo-500
                     sm:text-sm`}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              {t("passwordLabel")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl shadow-xs focus:outline-hidden focus:border-2 focus:ring-indigo-500 focus:border-indigo-500
                  sm:text-sm`}
            />
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-xs text-sm font-medium text-white
                bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed`}
              disabled={pending}
            >
              {pending
                ? t("sendingButton")
                : isLogin
                ? t("signInButton")
                : t("signUpButton")}
            </button>
          </div>
        </form>

        <div className="text-sm text-center">
          {isLogin ? (
            <p>
              {t("noAccount")}
              <button
                onClick={toggleAuthMode}
                className={`font-medium text-indigo-600 hover:text-indigo-500
                     cursor-pointer disabled:cursor-not-allowed`}
                disabled={pending}
              >
                {pending ? t("sendingButton") : t("signUpButton")}
              </button>
            </p>
          ) : (
            <p>
              {t("haveAccount")}
              <button
                onClick={toggleAuthMode}
                className={`font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer disabled:cursor-not-allowed`}
                disabled={pending}
              >
                {pending ? t("sendingButton") : t("signInButton")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// 使用 Suspense 包裹整个页面组件
const Page = () => {
  const t = useTranslations("SignInPage");
  return (
    <Suspense fallback={<div>{t("loadingFallback")}</div>}>
      <SignInPage />
    </Suspense>
  );
};

export default Page;
