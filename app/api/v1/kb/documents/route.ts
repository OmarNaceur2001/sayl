import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { getWorkspaceSecrets } from "@/lib/workspace-secrets";
import { buildChunks } from "@/lib/ai/kb-chunking";
import { validateKbDocumentInput } from "@/lib/ai/kb-input";
import { EMBEDDING_MODEL, embedTexts, toVectorLiteral } from "@/lib/ai/kb";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { recordUsage } from "@/lib/ai/usage";

// Pilot-stage guard rails (revisit with plans in Stage 4).
const MAX_CHUNKS_PER_WORKSPACE = 2_000;
const INSERT_BATCH_SIZE = 100;

async function firstWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data?.workspace_id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await firstWorkspaceId(supabase, user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data, error } = await supabase
    .from("kb_documents")
    .select("id, title, kind, language, chunk_count, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await firstWorkspaceId(supabase, user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const roleResult = await requireWorkspaceRole(user.id, workspaceId, ["owner", "admin"]);
  if (!roleResult.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = validateKbDocumentInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const { chunks, truncated } = buildChunks(input.kind, input.text);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "Nothing to index: no usable text, Q/A pair or CSV row was found" },
      { status: 400 }
    );
  }

  const { count: existing } = await supabase
    .from("kb_chunks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if ((existing ?? 0) + chunks.length > MAX_CHUNKS_PER_WORKSPACE) {
    return NextResponse.json(
      { error: `Knowledge base limit reached (${MAX_CHUNKS_PER_WORKSPACE} passages)` },
      { status: 409 }
    );
  }

  let embeddings: number[][];
  let tokens: number;
  try {
    const secrets = await getWorkspaceSecrets(workspaceId);
    const apiKey = secrets.ai_api_key || process.env.AI_GATEWAY_API_KEY || undefined;
    ({ embeddings, tokens } = await embedTexts(apiKey, chunks));
  } catch (error) {
    console.error("[kb] embedding failed:", error);
    return NextResponse.json({ error: "Could not compute embeddings" }, { status: 502 });
  }

  const { data: document, error: documentError } = await supabase
    .from("kb_documents")
    .insert({
      workspace_id: workspaceId,
      title: input.title,
      kind: input.kind,
      language: input.language,
      chunk_count: chunks.length,
      created_by: user.id,
    })
    .select("id, title, kind, language, chunk_count, created_at")
    .single();

  if (documentError || !document) {
    console.error("[kb] failed to create document:", documentError);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }

  for (let start = 0; start < chunks.length; start += INSERT_BATCH_SIZE) {
    const rows = chunks.slice(start, start + INSERT_BATCH_SIZE).map((content, offset) => ({
      workspace_id: workspaceId,
      document_id: document.id,
      position: start + offset,
      content,
      embedding: toVectorLiteral(embeddings[start + offset]),
    }));
    const { error } = await supabase.from("kb_chunks").insert(rows);
    if (error) {
      console.error("[kb] failed to save chunks:", error);
      await supabase.from("kb_documents").delete().eq("id", document.id);
      return NextResponse.json({ error: "Failed to save passages" }, { status: 500 });
    }
  }

  await recordUsage(await createServiceClient(), {
    workspaceId,
    kind: "embedding",
    model: EMBEDDING_MODEL,
    inputTokens: tokens,
    costUsd: estimateCostUsd(EMBEDDING_MODEL, tokens, 0),
    metadata: { source: "kb_import", chunks: chunks.length },
  });

  return NextResponse.json({ ...document, truncated }, { status: 201 });
}
