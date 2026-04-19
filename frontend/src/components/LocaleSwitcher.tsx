// src/components/LocaleSwitcher.tsx
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSelect() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      className="cursor-pointer appearance-none focus:outline-hidden w-fit"
    >
      <option value="en">English</option>
      <option value="zh-CN">简体中文</option>
    </select>
  );
}