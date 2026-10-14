"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { SaylLogo } from "@/components/sayl-logo";
import { brand } from "@/lib/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <Link href="/login" className="auth-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to sign in
      </Link>

      <section className="auth-card">
        <header className="auth-heading">
          <Link href="/" className="auth-logo-link" aria-label="Sayl home">
            <SaylLogo size={32} />
          </Link>
          <h1>
            Reset your <em>password</em>
          </h1>
          <p>{brand.tagline}</p>
        </header>

        {sent ? (
          <div className="text-center space-y-3 py-4">
            <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <p className="text-sm">
              If an account exists for <span className="font-medium">{email}</span>,
              a password-reset link is on its way.
            </p>
            <p className="text-xs text-muted-foreground">
              The link expires shortly. Check your spam folder if it doesn&apos;t arrive.
            </p>
            <Link href="/login" className="inline-block text-sm font-medium underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                placeholder="you@example.com"
              />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="auth-button auth-button-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                  Sending link...
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="auth-button-arrow" size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
