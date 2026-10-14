"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { SaylLogo } from "@/components/sayl-logo";
import { brand } from "@/lib/brand";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // null = still checking whether a valid recovery session exists
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // The auth callback establishes a session before redirecting here; for
    // hash-fragment recovery links the browser client picks the session up
    // from the URL automatically.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(true);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
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
            Choose a new <em>password</em>
          </h1>
          <p>{brand.tagline}</p>
        </header>

        {hasSession === null && (
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        )}

        {hasSession === false && !done && (
          <div className="text-center space-y-3 py-4">
            <p className="text-sm">
              This reset link is invalid or has expired.
            </p>
            <Link href="/forgot-password" className="inline-block text-sm font-medium underline">
              Request a new link
            </Link>
          </div>
        )}

        {done && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <p className="text-sm">Password updated. You can continue to your dashboard.</p>
            <button
              type="button"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
              className="auth-button auth-button-primary w-full"
            >
              Continue
              <ArrowRight className="auth-button-arrow" size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        {hasSession && !done && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input"
                placeholder="Min. 6 characters"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="auth-input"
                placeholder="Repeat your password"
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
                  Updating...
                </>
              ) : (
                <>
                  Update password
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
