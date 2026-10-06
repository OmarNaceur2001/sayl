import { getWorkspace } from "@/lib/workspace";
import { getWorkspaceSecrets } from "@/lib/workspace-secrets";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const { workspace, role } = await getWorkspace();
  const secrets = await getWorkspaceSecrets(workspace.id);

  return (
    <SettingsView
      workspace={{
        id: workspace.id,
        name: workspace.name,
        hasApiKey: !!secrets.late_api_key_encrypted,
        hasAiKey: !!secrets.ai_api_key,
        globalKeywords: (workspace.global_keywords as string[]) ?? [],
        canEdit: role === "owner" || role === "admin",
      }}
    />
  );
}
