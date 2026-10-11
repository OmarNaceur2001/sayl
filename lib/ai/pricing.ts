/**
 * Public list prices in USD per 1M tokens, used ONLY to estimate cost per
 * conversation for margin tracking. The AI Gateway invoice is the source of
 * truth: re-check this table when you change models. Unknown model => null.
 */
const PRICE_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/text-embedding-3-small": { input: 0.02, output: 0 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const price = PRICE_PER_MILLION_TOKENS[model];
  if (!price) return null;
  const cost = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
