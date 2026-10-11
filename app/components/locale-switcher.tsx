"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, localeCookieName, type AppLocale } from "@/lib/i18n";

const labels: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("localeSwitcher");

  function changeLocale(nextLocale: AppLocale) {
    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className={compact ? "inline-flex items-center gap-2" : "flex items-center gap-2"}>
      {!compact && <span className="text-xs text-muted-foreground">{t("label")}</span>}
      <select
        aria-label={t("label")}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as AppLocale)}
        className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
      >
        {locales.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
