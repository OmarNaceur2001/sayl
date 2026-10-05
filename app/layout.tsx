import type { Metadata } from "next";
import {
  DM_Mono,
  Geist,
  IBM_Plex_Sans_Arabic,
  Instrument_Serif,
  Inter,
} from "next/font/google";
import "./globals.css";
import "./sayl-theme.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
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
    default: "Sayl — Social messaging automation for teams",
    template: "%s | Sayl",
  },
  description:
    "Automatisez vos conversations sociales, vos messages privés et vos workflows avec Sayl.",
  openGraph: {
    title: "Sayl — Social messaging automation for teams",
    description: "Automatisez vos conversations sociales et vos workflows avec Sayl.",
    siteName: "Sayl",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sayl — Social messaging automation for teams",
    description:
      "Automatisez les conversations sur plusieurs plateformes sociales avec Sayl.",
  },
  icons: {
    icon: "/sayl-mark.svg",
    apple: "/sayl-mark.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geist.variable} ${instrumentSerif.variable} ${dmMono.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${inter.className}`}
      >
        {children}
      </body>
    </html>
  );
}
