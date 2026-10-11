import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document } = await supabase
    .from("kb_documents")
    .select("workspace_id")
    .eq("id", documentId)
    .single();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const roleResult = await requireWorkspaceRole(user.id, document.workspace_id, ["owner", "admin"]);
  if (!roleResult.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // kb_chunks are removed by ON DELETE CASCADE
  const { error } = await supabase
    .from("kb_documents")
    .delete()
    .eq("id", documentId)
    .eq("workspace_id", document.workspace_id);
  if (error) {
    console.error("[kb] failed to delete document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
