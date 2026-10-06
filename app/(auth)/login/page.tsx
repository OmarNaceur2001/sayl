"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { SaylLogo } from "@/components/sayl-logo";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGitHubLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to home
      </Link>

      <section className="auth-card">
        <header className="auth-heading">
          <Link href="/" className="auth-logo-link" aria-label="Sayl home">
            <SaylLogo size={32} />
          </Link>
          <h1>
            Welcome <em>back</em>
          </h1>
          <p>{brand.tagline}</p>
        </header>

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

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              placeholder="Your password"
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
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="auth-button-arrow" size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">Or continue with</div>

        <button
          type="button"
          onClick={handleGitHubLogin}
          className="auth-button auth-button-secondary"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/register">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
