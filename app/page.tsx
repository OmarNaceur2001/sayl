"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  GitBranch,
  Heart,
  Link2,
  ListOrdered,
  MessageCircle,
  MessageSquare,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { SaylLogo } from "@/components/sayl-logo";

const platforms = [
  { name: "Instagram", platform: "instagram" },
  { name: "Facebook", platform: "facebook" },
  { name: "WhatsApp", platform: "whatsapp" },
  { name: "Telegram", platform: "telegram" },
  { name: "X / Twitter", platform: "twitter" },
  { name: "Bluesky", platform: "bluesky" },
  { name: "Reddit", platform: "reddit" },
];

const comparison = [
  { feature: "Instagram & Facebook", manychat: true },
  { feature: "WhatsApp", manychat: true },
  { feature: "Telegram", manychat: false },
  { feature: "X / Twitter", manychat: false },
  { feature: "Bluesky & Reddit", manychat: false },
  { feature: "Visual flow builder", manychat: true },
  { feature: "AI responses (BYO key)", manychat: true },
  { feature: "Choose your AI provider", manychat: false },
  { feature: "Comment-to-DM", manychat: true },
  { feature: "Live chat inbox", manychat: true },
  { feature: "Sequences / drip campaigns", manychat: true },
  { feature: "Contact CRM", manychat: true },
];

const features: {
  icon: LucideIcon;
  title: string;
  desc: string;
  preview: string;
  label: string;
}[] = [
  {
    icon: MessageCircle,
    title: "Comment-to-DM",
    desc: "Someone comments a keyword? Instantly DM them your link, offer, or lead magnet.",
    preview: "Here’s the guide you asked for — enjoy!",
    label: "COMMENT → DIRECT MESSAGE",
  },
  {
    icon: GitBranch,
    title: "Visual flow builder",
    desc: "Drag-and-drop conversation flows. Welcome messages, follow-ups, sales funnels. No code.",
    preview: "When someone says “info”, send a welcome message.",
    label: "TRIGGER → ACTION → OUTCOME",
  },
  {
    icon: Sparkles,
    title: "AI responses",
    desc: "Let AI handle conversations. Pick your provider: OpenAI, Anthropic, or Google. Your API key, your choice.",
    preview: "I can help with that. What would you like to know?",
    label: "AI RESPONSE",
  },
  {
    icon: MessageSquare,
    title: "Live chat inbox",
    desc: "All your DMs in one place. Bot handles the easy stuff, you jump in when it matters.",
    preview: "A teammate is joining the conversation now.",
    label: "TEAM INBOX",
  },
  {
    icon: Users,
    title: "Contact CRM",
    desc: "Tag your audience, build segments, track interactions. Right message to the right people.",
    preview: "Contact tagged: interested",
    label: "CONTACT UPDATED",
  },
  {
    icon: Radio,
    title: "Broadcasts",
    desc: "Send promotions and updates to your audience. Target by tags, platform, or segments.",
    preview: "Your weekend update is ready to send.",
    label: "BROADCAST",
  },
  {
    icon: ListOrdered,
    title: "Sequences",
    desc: "Drip campaigns that run on autopilot. Message, wait, message. Enroll contacts from flows.",
    preview: "Message sent  →  wait  →  follow up",
    label: "AUTOMATED SEQUENCE",
  },
  {
    icon: Link2,
    title: "Growth tools",
    desc: "Generate DM starter links for every platform. Share them anywhere to start conversations.",
    preview: "sayl.app/dm/start?ref=campaign",
    label: "DM STARTER LINK",
  },
  {
    icon: Zap,
    title: "Webhooks & API",
    desc: "Connect to any tool. Push leads to Google Sheets, trigger Zapier, call external APIs.",
    preview: "New lead  →  Google Sheets  ✓",
    label: "WEBHOOK DELIVERED",
  },
];

const steps: {
  step: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}[] = [
  {
    step: "1",
    icon: CheckCircle,
    title: "Connect your accounts",
    desc: "Link your Instagram, Facebook, WhatsApp, Telegram, or any other platform in a few clicks.",
  },
  {
    step: "2",
    icon: GitBranch,
    title: "Build a flow",
    desc: "Use the visual builder to create your automation. Pick a trigger, add messages, set conditions.",
  },
  {
    step: "3",
    icon: TrendingUp,
    title: "Watch it grow",
    desc: "Your flows run 24/7. Capture leads, answer questions, and sell while you sleep.",
  },
];

const audiences: {
  icon: LucideIcon;
  title: string;
  desc: string;
}[] = [
  {
    icon: Heart,
    title: "Creators",
    desc: "Auto-reply to comments, send lead magnets via DM, and grow your email list from social.",
  },
  {
    icon: TrendingUp,
    title: "Small businesses",
    desc: "Qualify leads through DM conversations, answer FAQs instantly, and book appointments on autopilot.",
  },
  {
    icon: Users,
    title: "Agencies",
    desc: "Manage all your clients' accounts in one workspace. Build flows once, reuse them across brands.",
  },
];

const proofPoints = [
  {
    label: "7 platforms, one tool",
    detail:
      "Instagram, Facebook, WhatsApp, Telegram, X, Bluesky, Reddit. ManyChat supports 3 of these platforms.",
  },
  {
    label: "Try before you choose",
    detail: "Explore Sayl with a free trial, then continue with a paid subscription.",
  },
  {
    label: "Built for teams",
    detail: "Bring your shared inbox, contacts, and automations into one workspace.",
  },
  {
    label: "Automation around the clock",
    detail: "Keep conversations moving while your team focuses on what matters.",
  },
];

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("has-intersection-observer");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className}${visible ? " is-visible" : ""}`}>
      {children}
    </div>
  );
}

function PlatformTicker() {
  return (
    <div className="platform-ticker" aria-label="Seven supported social platforms">
      <div className="platform-ticker-track">
        {[0, 1].map((copy) => (
          <div
            className="platform-ticker-group"
            key={copy}
            aria-hidden={copy === 1}
          >
            {platforms.map((platform) => (
              <span className="platform-ticker-item" key={platform.platform}>
                <PlatformIcon platform={platform.platform} size={17} />
                {platform.name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const ActiveFeatureIcon = features[activeFeature].icon;

  return (
    <div className="marketing-site min-h-screen">
      <nav className="marketing-nav sticky top-0 z-50 border-b backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Sayl home">
            <SaylLogo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#comparison"
              className="hidden min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted sm:inline-flex"
            >
              Compare platforms
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted">
              Log in
            </Link>
            <Link href="/register" className="sayl-button sayl-button-primary min-h-11 px-4 text-sm">
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero-section mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="hero-copy">
            <p className="eyebrow"><span className="signal-dot" /> SOCIAL AUTOMATION, BUILT FOR TEAMS</p>
            <h1>
              Social conversations,
              <br />
              <em>on your terms</em>
            </h1>
            <p className="hero-description">
              Automate DMs, comments, and flows across Instagram, Facebook, WhatsApp,
              Telegram, X, Bluesky, and Reddit. Bring your social conversations and team
              workflows together in one place.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="sayl-button sayl-button-primary min-h-12 px-6">
                Start your free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#features" className="sayl-button sayl-button-secondary min-h-12 px-6">
                Explore Sayl
              </Link>
            </div>
            <p className="hero-note">
              Explore Sayl with a free trial. Continue with a paid subscription when you&apos;re ready.
            </p>
          </div>

          <Reveal className="flow-preview reveal">
            <div className="flow-preview-top">
              <div className="window-lights" aria-hidden="true"><i /><i /><i /></div>
              <span>WELCOME FLOW</span>
              <span className="flow-status"><span className="signal-dot" /> LIVE PREVIEW</span>
            </div>
            <div className="flow-preview-canvas">
              <svg className="flow-wires" viewBox="0 0 900 180" preserveAspectRatio="none" aria-hidden="true">
                <path d="M240 90H330M570 90H660" />
                <circle className="flow-pulse" r="5">
                  <animateMotion dur="4.5s" repeatCount="indefinite" path="M240 90H660" />
                </circle>
              </svg>
              <div className="flow-node">
                <span className="flow-node-icon"><MessageCircle size={16} /></span>
                <span className="flow-node-label">TRIGGER</span>
                <strong>Comment trigger</strong>
                <small>Keyword: “info”</small>
              </div>
              <div className="flow-connector" aria-hidden="true"><span /></div>
              <div className="flow-node">
                <span className="flow-node-icon"><MessageSquare size={16} /></span>
                <span className="flow-node-label">ACTION</span>
                <strong>Send DM</strong>
                <small>“Hey! Here’s the link...”</small>
              </div>
              <div className="flow-connector" aria-hidden="true"><span /></div>
              <div className="flow-node">
                <span className="flow-node-icon"><Users size={16} /></span>
                <span className="flow-node-label">CONTACT</span>
                <strong>Tag as lead</strong>
                <small>Tag: “interested”</small>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="platform-section" aria-label="Supported platforms">
          <div className="mx-auto max-w-6xl px-6 pt-7">
            <p className="eyebrow text-center">ONE FLOW. SEVEN PLATFORMS.</p>
          </div>
          <PlatformTicker />
        </section>

        <section className="section-wrap comparison-section" id="comparison">
          <div className="section-heading">
            <p className="eyebrow">MORE REACH. ONE WORKSPACE.</p>
            <h2>Why teams switch from ManyChat</h2>
            <p>Compare platform coverage and the tools your team needs.</p>
          </div>
          <Reveal className="comparison-table reveal">
            <div className="comparison-header comparison-grid">
              <span className="comparison-label">AT A GLANCE</span>
              <span className="comparison-brand">MANYCHAT <small>3 PLATFORMS</small></span>
              <span className="comparison-brand sayl-column">SAYL <small>7 PLATFORMS</small></span>
            </div>
            {comparison.map((row, index) => (
              <div className="comparison-row comparison-grid" key={row.feature}>
                <span>{row.feature}</span>
                <span className="comparison-mark">
                  {row.manychat ? <Check aria-label="Available" /> : <X aria-label="Unavailable" />}
                </span>
                <span className="comparison-mark sayl-mark">
                  <Check aria-label="Available" style={{ animationDelay: `${index * 65}ms` }} />
                </span>
              </div>
            ))}
          </Reveal>
        </section>

        <section className="features-section" id="features">
          <div className="section-wrap">
            <div className="section-heading">
              <p className="eyebrow">THE TOOLKIT</p>
              <h2>Everything you need to grow on social</h2>
            </div>
            <div className="feature-editor">
              <div className="feature-list" aria-label="Sayl features">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  const selected = activeFeature === index;
                  return (
                    <button
                      type="button"
                      key={feature.title}
                      className={`feature-row${selected ? " is-active" : ""}`}
                      onMouseEnter={() => setActiveFeature(index)}
                      onFocus={() => setActiveFeature(index)}
                      onClick={() => setActiveFeature(index)}
                      aria-pressed={selected}
                    >
                      <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>
                      <Icon className="feature-icon" aria-hidden="true" />
                      <span className="feature-name">{feature.title}</span>
                      <ArrowRight className="feature-arrow" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <div className="feature-preview" aria-live="polite">
                <div className="preview-toolbar">
                  <span><i /> <i /> <i /></span>
                  <span>MESSAGE PREVIEW</span>
                  <span>0{activeFeature + 1} / 09</span>
                </div>
                <div className="preview-content" key={activeFeature}>
                  <div className="preview-label">
                    <ActiveFeatureIcon size={15} /> {features[activeFeature].label}
                  </div>
                  <div className="preview-message">
                    {features[activeFeature].preview}
                  </div>
                  <div className="preview-tag"><span className="signal-dot" /> AUTOMATION READY</div>
                </div>
                <p className="preview-hint">Hover, focus, or select a feature to preview it.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-wrap trial-section">
          <div className="trial-copy">
            <p className="eyebrow">A SIMPLE WAY TO GET STARTED</p>
            <h2>Try Sayl first.<br /><em>Choose your plan later.</em></h2>
            <p>
              Explore Sayl with a free trial, then continue with a paid subscription
              that fits your team.
            </p>
            <p>
              Bring your social channels, conversations, and automations together
              in one workspace.
            </p>
            <Link href="/register" className="sayl-button sayl-button-primary min-h-12 px-6 trial-link">
              Start your free trial <ArrowRight size={17} />
            </Link>
          </div>
          <div className="trial-aside">
            <div className="proof-list">
              {proofPoints.map((point) => (
                <div className="proof-row" key={point.label}>
                  <span className="proof-check"><Check size={14} /></span>
                  <span><strong>{point.label}</strong><small>{point.detail}</small></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="steps-section">
          <div className="section-wrap">
            <div className="section-heading">
              <p className="eyebrow">THREE STEPS TO GET STARTED</p>
              <h2>Bring your conversations together</h2>
            </div>
            <div className="steps-grid">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <article className="step-card" key={step.step}>
                    <div className="step-topline"><span>0{step.step}</span><Icon /></div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-wrap audience-section">
          <div className="section-heading">
            <p className="eyebrow">BUILT FOR YOUR KIND OF WORK</p>
            <h2>Creators, businesses, and agencies</h2>
          </div>
          <div className="audience-grid">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <article className="audience-card" key={audience.title}>
                  <Icon className="audience-icon" />
                  <h3>{audience.title}</h3>
                  <p>{audience.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section-wrap final-cta">
          <div className="cta-panel">
            <p className="eyebrow">YOUR FREE TRIAL STARTS HERE</p>
            <h2>Make every conversation count</h2>
            <p>
              Explore Sayl, connect your accounts, and see how social automation can
              work for your team. Continue with a paid subscription when you&apos;re ready.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="sayl-button sayl-button-dark min-h-12 px-6">
                Start your free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-7 sm:flex-row">
          <div className="flex items-center gap-4">
            <SaylLogo size={24} />
            <Link href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="footer-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/powered-by-zernio.svg" alt="Powered by Zernio" className="h-9" />
            </Link>
          </div>
          <p>Social conversations, on your terms.</p>
        </div>
      </footer>
    </div>
  );
}
