import { getWorkspace } from "@/lib/workspace";
import { KnowledgeManager, type KbDocumentSummary } from "@/components/knowledge/knowledge-manager";

export default async function KnowledgePage() {
  const { workspace, supabase, role } = await getWorkspace();

  const { data } = await supabase
    .from("kb_documents")
    .select("id, title, kind, language, chunk_count, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Knowledge base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What your AI is allowed to say: prices, delivery, hours, policies. In an AI Response node, enable
          &quot;Use knowledge base&quot; so it answers only from these documents and hands over to a human otherwise.
        </p>
      </div>
      <KnowledgeManager
        initialDocuments={(data ?? []) as KbDocumentSummary[]}
        canEdit={role === "owner" || role === "admin"}
      />
    </div>
  );
}
