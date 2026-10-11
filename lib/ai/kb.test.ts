import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { EMBEDDING_DIMENSIONS, retrieveKbPassages, toVectorLiteral } from "./kb";

const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);

function fakeSupabase(rows: unknown[], error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: rows, error }));
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("retrieveKbPassages", () => {
  it("embeds the query and maps rpc rows", async () => {
    const { client, rpc } = fakeSupabase([{ id: "c1", document_id: "d1", content: "Livraison 7 DT", similarity: 0.61 }]);
    const embed = vi.fn(async () => ({ embeddings: [vector], tokens: 12 }));
    const result = await retrieveKbPassages(client, { workspaceId: "w1", query: "  9adech el livraison ?  " }, embed);
    expect(embed).toHaveBeenCalledWith(undefined, ["9adech el livraison ?"]);
    expect(rpc).toHaveBeenCalledWith("match_kb_chunks", {
      p_workspace_id: "w1",
      p_query_embedding: toVectorLiteral(vector),
      p_match_count: 4,
      p_min_similarity: 0.25,
    });
    expect(result).toEqual({
      passages: [{ id: "c1", documentId: "d1", content: "Livraison 7 DT", similarity: 0.61 }],
      embeddingTokens: 12,
    });
  });
  it("skips the embedding call for an empty query", async () => {
    const { client } = fakeSupabase([]);
    const embed = vi.fn();
    expect(await retrieveKbPassages(client, { workspaceId: "w1", query: "   " }, embed)).toEqual({ passages: [], embeddingTokens: 0 });
    expect(embed).not.toHaveBeenCalled();
  });
  it("rejects embeddings of the wrong size", async () => {
    const { client } = fakeSupabase([]);
    await expect(
      retrieveKbPassages(client, { workspaceId: "w1", query: "x" }, async () => ({ embeddings: [[1, 2, 3]], tokens: 1 }))
    ).rejects.toThrow(/Unexpected embedding size/);
  });
  it("surfaces rpc errors", async () => {
    const { client } = fakeSupabase([], { message: "boom" });
    await expect(
      retrieveKbPassages(client, { workspaceId: "w1", query: "x" }, async () => ({ embeddings: [vector], tokens: 1 }))
    ).rejects.toThrow("Knowledge base lookup failed: boom");
  });
});
