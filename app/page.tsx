"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageSquareText,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Users,
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

const industries: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Store, title: "E-commerce", description: "Proposez des offres, gérez les relances et récupérez les paniers abandonnés automatiquement." },
  { icon: Users, title: "Agences & consultants", description: "Centralisez les demandes, les nouveaux prospects et les suivis client dans un seul espace." },
  { icon: Sparkles, title: "Créateurs & marques", description: "Répondez aux commentaires, envoyez des liens de DM et renforcez votre audience qualifiée." },
  { icon: TrendingUp, title: "SaaS & startups", description: "Qualifiez les leads, automatisez l’onboarding et mettez en place des séquences de vente." },
  { icon: Target, title: "Éducation & coaching", description: "Répondez sans délai aux demandes, envoyez les ressources et planifiez les rendez-vous." },
  { icon: Zap, title: "Services locaux", description: "Gérez les demandes de devis, les confirmations et les relances depuis vos canaux sociaux." },
];

const plans = [
  {
    name: "Starter",
    price: "0€",
    description: "Pour tester Sayl sans friction.",
    featured: false,
    features: ["1 canal actif", "Automatisations essentielles", "Support email"],
  },
  {
    name: "Pro",
    price: "39€",
    description: "Le plus adapté pour une équipe qui scale.",
    featured: true,
    badge: "Le plus choisi",
    features: ["Tous les canaux", "Fils de discussion unifiés", "AI assistant", "Statistiques avancées"],
  },
  {
    name: "Scale",
    price: "99€",
    description: "Pour les marques avec des volumes plus élevés.",
    featured: false,
    features: ["Rôles & permissions", "Workflows avancés", "Benchmarks & reporting", "Support prioritaire"],
  },
];

const faqs = [
  {
    question: "Est-ce que Sayl fonctionne avec WhatsApp, Instagram et Facebook ?",
    answer: "Oui. Sayl permet de piloter plusieurs canaux depuis un même tableau de bord et d’orchestrer des automatisations cohérentes sur votre trafic social.",
  },
  {
    question: "Puis-je essayer gratuitement avant de payer ?",
    answer: "Absolument. Vous pouvez démarrer un essai gratuit pour tester les flux, les messages automatiques et la gestion des conversations avant de choisir un plan.",
  },
  {
    question: "Quel est le niveau de configuration nécessaire ?",
    answer: "Aucune compétence technique poussée n’est requise. La plateforme a été pensée pour être rapide à mettre en place, même pour des équipes marketing ou commerciales.",
  },
  {
    question: "Est-ce que je peux connecter mon propre modèle IA ?",
    answer: "Oui. Sayl permet d’utiliser votre propre clé API et de choisir le fournisseur qui correspond à votre usage et à votre budget.",
  },
];

const demoContent: Record<"fr" | "ar" | "tn", { label: string; title: string; subtitle: string; message: string; dir: "ltr" | "rtl" }> = {
  fr: {
    label: "Français",
    title: "Réponses instantanées, sans friction",
    subtitle: "Le bon message, au bon moment, sur le bon canal.",
    message: "Bonjour ! Voici le guide demandé. J’ai aussi préparé un devis pour votre projet.",
    dir: "ltr",
  },
  ar: {
    label: "العربية",
    title: "ردود فورية بدون تعقيد",
    subtitle: "الرسالة المناسبة، في الوقت المناسب، على القناة المناسبة.",
    message: "مرحبًا! هذا هو الدليل المطلوب، كما أعددت لك عرض سعر لمشروعك.",
    dir: "rtl",
  },
  tn: {
    label: "Darija",
    title: "جواب فوري بلا تعقيد",
    subtitle: "الرسالة اللي مناسبة، في الوقت المناسب، على القناة المناسبة.",
    message: "سلامة! هاد هو الدليل اللي طلبته، وعايزك تعرف أني جهّزت لك عرض سعر للمشروع.",
    dir: "rtl",
  },
};

function PlatformTicker() {
  return (
    <div className="platform-ticker" aria-label="Plateformes supportées">
      <div className="platform-ticker-track">
        {[0, 1].map((copy) => (
          <div className="platform-ticker-group" key={copy} aria-hidden={copy === 1}>
            {platforms.map((platform) => (
              <span
                className="platform-ticker-item"
                data-platform={platform.platform}
                key={`${copy}-${platform.platform}`}
              >
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
  const [activeDemo, setActiveDemo] = useState<keyof typeof demoContent>("fr");
  const [openFaq, setOpenFaq] = useState(0);
  const demo = demoContent[activeDemo];

  return (
    <div className="marketing-site min-h-screen">
      <nav className="marketing-nav sticky top-0 z-50 border-b backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Accueil Sayl">
            <SaylLogo variant="dark" />
          </Link>

          <div className="nav-links">
            <Link href="#metiers">Métiers</Link>
            <Link href="#tarifs">Tarifs</Link>
            <Link href="#faq">FAQ</Link>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="nav-login">Connexion</Link>
            <Link href="/register" className="sayl-button sayl-button-primary min-h-11 px-4 text-sm">
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero-section mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <div className="hero-copy">
            <p className="eyebrow"><span className="signal-dot" /> AUTOMATISATION DES CONVERSATIONS</p>
            <h1>
              La croissance sociale,
              <br />
              <em>sans friction.</em>
            </h1>
            <p className="hero-description">
              Sayl centralise vos messages, vos comptes et vos automations pour convertir plus de prospects,
              répondre plus vite et garder votre équipe alignée.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="sayl-button sayl-button-primary min-h-12 px-6">
                Démarrer mon essai <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#tarifs" className="sayl-button sayl-button-secondary min-h-12 px-6">
                Voir les tarifs
              </Link>
            </div>
            <p className="hero-note">Aucun engagement. Vous pouvez arrêter quand vous voulez.</p>
          </div>

          <div className="hero-demo">
            <div className="demo-card" dir={demo.dir}>
              <div className="demo-toolbar">
                <div className="window-lights" aria-hidden="true"><i /><i /><i /></div>
                <div className="demo-switches" aria-label="Choisir la langue de démonstration">
                  {Object.entries(demoContent).map(([key, option]) => (
                    <button
                      key={key}
                      type="button"
                      className={activeDemo === key ? "is-active" : ""}
                      onClick={() => setActiveDemo(key as keyof typeof demoContent)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-panel">
                <div className="demo-caption">Live demo</div>
                <h3>{demo.title}</h3>
                <p>{demo.subtitle}</p>

                <div className="demo-message">
                  <span className="message-badge">AI</span>
                  <div>{demo.message}</div>
                </div>

                <div className="demo-metrics">
                  <div>
                    <strong>2.4x</strong>
                    <span>plus de leads</span>
                  </div>
                  <div>
                    <strong>24/7</strong>
                    <span>réponses</span>
                  </div>
                  <div>
                    <strong>7</strong>
                    <span>canaux</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="platform-section" aria-label="Canaux pris en charge">
          <div className="mx-auto max-w-6xl px-4 pt-7 sm:px-6">
            <p className="eyebrow text-center">UN SEUL TABLEAU DE BORD POUR TOUS VOS CANAUX</p>
          </div>
          <PlatformTicker />
        </section>

        <section className="section-wrap" id="metiers">
          <div className="section-heading">
            <p className="eyebrow">POUR TOUT LE MONDE</p>
            <h2>Des workflows qui s’adaptent à votre métier</h2>
          </div>

          <div className="industry-grid">
            {industries.map(({ icon: Icon, title, description }) => (
              <article key={title} className="industry-card">
                <div className="industry-icon">
                  <Icon size={18} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-wrap pricing-section" id="tarifs">
          <div className="section-heading">
            <p className="eyebrow">TARIFS TRANSPARENTS</p>
            <h2>Des plans pensés pour grandir sereinement</h2>
          </div>

          <div className="pricing-grid">
            {plans.map((plan) => (
              <article key={plan.name} className={`price-card ${plan.featured ? "featured" : ""}`}>
                {plan.featured && <span className="price-badge">{plan.badge}</span>}
                <div className="price-topline">
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>
                <div className="price-value">
                  {plan.price}
                  <span>/mois</span>
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`sayl-button ${plan.featured ? "sayl-button-primary" : "sayl-button-secondary"} w-full`}>
                  {plan.featured ? "Choisir ce plan" : "Essayer"}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section-wrap faq-section" id="faq">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Tout ce qu’il faut savoir</h2>
          </div>

          <div className="faq-list" aria-label="Questions fréquentes">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="faq-trigger"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={18} className="faq-icon" aria-hidden="true" />
                  </button>
                  {isOpen && <p className="faq-answer">{faq.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="section-wrap final-cta">
          <div className="cta-panel">
            <p className="eyebrow">PRÊT À PASSER À L’ÈRE DES CONVERSATIONS AUTOMATISÉES ?</p>
            <h2>Transformez chaque message en opportunité.</h2>
            <p>
              Lancez votre essai gratuit, connectez vos comptes et donnez à votre équipe un vrai moteur de croissance sociale.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="sayl-button sayl-button-primary min-h-12 px-6">
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#tarifs" className="sayl-button sayl-button-secondary min-h-12 px-6">
                Comparer les plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-7 sm:flex-row">
          <div className="flex items-center gap-4">
            <SaylLogo size={24} />
            <span className="footer-tag">Made in Tunisia</span>
          </div>
          <p>Social conversations, on your terms.</p>
        </div>
      </footer>
    </div>
  );
}
