"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Languages,
  MessageCircle,
  MessagesSquare,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SaylLogo } from "@/components/sayl-logo";

const features = [
  { title: "featureReplyTitle", description: "featureReplyDescription", icon: Languages },
  { title: "featureAlwaysTitle", description: "featureAlwaysDescription", icon: Clock3 },
  { title: "featureFlowTitle", description: "featureFlowDescription", icon: ArrowRight },
  { title: "featureInboxTitle", description: "featureInboxDescription", icon: MessagesSquare },
] as const;

export default function Home() {
  const t = useTranslations("landing");
  const rawChannels = t.raw("channels");
  const channels = Array.isArray(rawChannels)
    ? rawChannels.filter((channel): channel is string => typeof channel === "string")
    : [];

  return (
    <div className="marketing-site min-h-screen">
      <nav className="marketing-nav sticky top-0 z-50 border-b backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Sayl">
            <SaylLogo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher compact />
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted"
            >
              {t("login")}
            </Link>
            <Link
              href="/register"
              className="sayl-button sayl-button-primary min-h-11 px-4 text-sm"
            >
              {t("start")}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero-section mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="signal-dot" /> {t("eyebrow")}
            </p>
            <h1><em>{t("headline")}</em></h1>
            <p className="hero-description">{t("description")}</p>
            <div className="hero-actions">
              <Link
                href="/register"
                className="sayl-button sayl-button-primary min-h-12 px-6"
              >
                {t("cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flow-preview">
            <div className="flow-preview-top">
              <span><span className="signal-dot" /> {t("channelsLabel")}</span>
              <MessageCircle size={17} aria-hidden="true" />
            </div>
            <div className="flex flex-wrap gap-3 p-5">
              {channels.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
                >
                  {channel}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-wrap">
            <div className="section-heading">
              <p className="eyebrow">{t("featuresEyebrow")}</p>
              <h2>{t("featuresTitle")}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">{t(title)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t(description)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap audience-section">
          <div className="section-heading">
            <p className="eyebrow">{t("audienceEyebrow")}</p>
            <h2>{t("audienceTitle")}</h2>
            <p>{t("audienceDescription")}</p>
          </div>
          <Link
            href="/register"
            className="sayl-button sayl-button-primary min-h-12 px-6"
          >
            {t("cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-7 sm:flex-row">
          <SaylLogo size={24} />
          <p>{t("footer")}</p>
        </div>
      </footer>
    </div>
  );
}
