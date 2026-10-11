import { createGateway, embed, embedMany } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
/** Cosine similarity floor. Calibrate with the eval set (Darija/Arabizi queries score lower). */
export const DEFAULT_KB_MIN_SIMILARITY = 0.25;
export const DEFAULT_KB_TOP_K = 4;

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export interface EmbeddingResult {
  embeddings: number[][];
  tokens: number;
}

export type EmbedFunction = (apiKey: string | undefined, values: string[]) => Promise<EmbeddingResult>;

export const embedTexts: EmbedFunction = async (apiKey, values) => {
  const gateway = createGateway({ apiKey });
  const model = gateway.embeddingModel(EMBEDDING_MODEL);
  if (values.length === 1) {
    const result = await embed({ model, value: values[0] });
    return { embeddings: [result.embedding], tokens: result.usage?.tokens ?? 0 };
  }
  const result = await embedMany({ model, values, maxParallelCalls: 2 });
  return { embeddings: result.embeddings, tokens: result.usage?.tokens ?? 0 };
};

export interface KbPassage {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
}

export interface RetrieveParams {
  workspaceId: string;
  query: string;
  apiKey?: string;
  topK?: number;
  minSimilarity?: number;
}

export interface RetrieveResult {
  passages: KbPassage[];
  embeddingTokens: number;
}

export async function retrieveKbPassages(
  supabase: SupabaseClient<Database>,
  params: RetrieveParams,
  embedFunction: EmbedFunction = embedTexts
): Promise<RetrieveResult> {
  const query = params.query.trim().slice(0, 1_000);
  if (!query) return { passages: [], embeddingTokens: 0 };

  const { embeddings, tokens } = await embedFunction(params.apiKey, [query]);
  const vector = embeddings[0];
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Unexpected embedding size: ${vector?.length ?? 0}`);
  }

  const { data, error } = await supabase.rpc("match_kb_chunks", {
    p_workspace_id: params.workspaceId,
    p_query_embedding: toVectorLiteral(vector),
    p_match_count: params.topK ?? DEFAULT_KB_TOP_K,
    p_min_similarity: params.minSimilarity ?? DEFAULT_KB_MIN_SIMILARITY,
  });
  if (error) throw new Error(`Knowledge base lookup failed: ${error.message}`);

  return {
    passages: (data ?? []).map((row) => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      similarity: row.similarity,
    })),
    embeddingTokens: tokens,
  };
}
