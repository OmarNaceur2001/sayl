import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { defaultLocale, isAppLocale, localeCookieName } from "@/lib/i18n";

const messages = { fr, en, ar };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return { locale, messages: messages[locale] };
});
