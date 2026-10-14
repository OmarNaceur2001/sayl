"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { SaylLogo } from "@/components/sayl-logo";
import { brand } from "@/lib/brand";
import { createWorkspace } from "@/lib/actions/workspace";
import { createClient } from "@/lib/supabase/client";

export function OnboardingView() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await createWorkspace(name);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-heading">
          <Link href="/" className="auth-logo-link" aria-label="Sayl home">
            <SaylLogo size={32} />
          </Link>
          <h1>
            Create your <em>workspace</em>
          </h1>
          <p>{brand.tagline}</p>
        </header>

        <p className="text-sm text-muted-foreground">
          Your account isn&apos;t part of a workspace yet. Workspaces hold your
          channels, flows, and contacts — create one to continue.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="auth-input"
              placeholder="My business"
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
                Creating workspace...
              </>
            ) : (
              <>
                Create workspace
                <ArrowRight className="auth-button-arrow" size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Wrong account?{" "}
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </p>
      </section>
    </main>
  );
}
