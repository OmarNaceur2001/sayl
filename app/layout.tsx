import type { Metadata } from "next";
import {
  DM_Mono,
  Geist,
  IBM_Plex_Sans_Arabic,
  Instrument_Serif,
} from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import "./sayl-theme.css";
import { brand } from "@/lib/brand";
import { defaultLocale, isAppLocale, localeCookieName } from "@/lib/i18n";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.tagline,
    siteName: brand.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.tagline,
  },
  icons: {
    icon: "/sayl-mark.svg",
    apple: "/sayl-mark.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const localeCookie = (await cookies()).get(localeCookieName)?.value;
  const locale = isAppLocale(localeCookie) ? localeCookie : defaultLocale;
  const messages = { fr, en, ar }[locale];

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${geist.variable} ${instrumentSerif.variable} ${dmMono.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geist.className}${locale === "ar" ? " locale-ar" : ""}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
