import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceMembership } from "@/lib/workspace";
import { OnboardingView } from "./onboarding-view";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Users who already belong to a workspace never need this page
  const membership = await resolveWorkspaceMembership(supabase, user.id);
  if (membership) redirect("/dashboard");

  return <OnboardingView />;
}
