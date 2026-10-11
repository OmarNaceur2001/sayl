import { getWorkspace } from "@/lib/workspace";
import { Sidebar } from "@/components/sidebar";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace, user, supabase } = await getWorkspace();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const workspaces = (memberships ?? [])
    .map((m) => ({
      ...(m.workspaces as { id: string; name: string; slug: string }),
      role: m.role,
    }))
    .filter((w) => w.id);

  return (
    <div className="flex h-screen">
      <Sidebar workspace={workspace} user={user} workspaces={workspaces} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-end border-b border-border bg-card px-4">
          <LocaleSwitcher />
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
