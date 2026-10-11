import { getWorkspace } from "@/lib/workspace";
import { InboxView } from "./inbox-view";

export default async function InboxPage() {
  const { workspace, supabase, role } = await getWorkspace();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, contacts(*)")
    .eq("workspace_id", workspace.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <InboxView
      conversations={conversations ?? []}
      workspaceId={workspace.id}
      canManageLanguages={role === "owner" || role === "admin"}
    />
  );
}
