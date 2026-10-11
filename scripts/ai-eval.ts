/**
 * Stage 2 gate: run a set of customer messages through the SAME prompt the AI node uses
 * (language policy + knowledge base + handover marker) and score the answers.
 *
 *   AI_GATEWAY_API_KEY=... npx tsx scripts/ai-eval.ts [--model openai/gpt-4o-mini]
 *                          [--file tests/fixtures/ai-eval-seed.json] [--min 0.85] [--min-sim 0.25]
 *
 * Checks per case: handover expected/not, required facts (regex), forbidden facts,
 * and that the reply language matches (using the Stage 1 detector; "unverified" when it
 * cannot tell). Exit code 1 when the pass rate is below --min.
 */
import { readFileSync } from "node:fs";
import { createGateway, generateText } from "ai";
import { detectLanguage } from "../lib/language/detect";
import { wantsHandover } from "../lib/ai/handover";
import { buildSystemPrompt } from "../lib/ai/system-prompt";
import { embedTexts } from "../lib/ai/kb";
import type { SupportedLanguage } from "../lib/types/database";

interface EvalCase {
  id: string;
  lang: SupportedLanguage;
  message: string;
  expect: { handover: boolean; mustMatch?: string[]; mustNotMatch?: string[] };
}
interface EvalFile {
  synthetic?: boolean;
  systemPrompt: string;
  kb: string[];
  cases: EvalCase[];
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("Set AI_GATEWAY_API_KEY to run the evaluation.");

  const model = arg("model", "openai/gpt-4o-mini");
  const file = arg("file", "tests/fixtures/ai-eval-seed.json");
  const minPass = parseFloat(arg("min", "0.85"));
  const minSimilarity = parseFloat(arg("min-sim", "0.25"));
  const data = JSON.parse(readFileSync(file, "utf8")) as EvalFile;
  if (data.synthetic) console.warn("! Synthetic seed set: use real merchant messages before trusting these scores.\n");

  const kbVectors = (await embedTexts(apiKey, data.kb)).embeddings;
  const gateway = createGateway({ apiKey });

  const perLanguage = new Map<string, { pass: number; total: number; unverified: number }>();
  const failures: string[] = [];
  let totalCost = 0;

  for (const testCase of data.cases) {
    const queryVector = (await embedTexts(apiKey, [testCase.message])).embeddings[0];
    const passages = data.kb
      .map((content, index) => ({ content, similarity: cosine(queryVector, kbVectors[index]) }))
      .filter((passage) => passage.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 4);

    let reply: string;
    if (passages.length === 0) {
      reply = "[[HANDOVER]]"; // same shortcut as the node: no relevant passage => no model call
    } else {
      const detection = detectLanguage(testCase.message);
      const result = await generateText({
        model: gateway(model),
        system: buildSystemPrompt({
          basePrompt: data.systemPrompt,
          language: detection.lang === "unknown" ? testCase.lang : detection.lang,
          script: detection.script,
          passages,
          answerOnlyFromKb: true,
        }),
        messages: [{ role: "user", content: testCase.message }],
        temperature: 0.3,
        maxOutputTokens: 300,
      });
      reply = result.text.trim();
      totalCost += ((result.usage?.inputTokens ?? 0) * 0.15 + (result.usage?.outputTokens ?? 0) * 0.6) / 1e6;
    }

    const reasons: string[] = [];
    const handedOver = wantsHandover(reply);
    if (handedOver !== testCase.expect.handover) {
      reasons.push(testCase.expect.handover ? "should have handed over" : "handed over but should have answered");
    }
    let unverified = false;
    if (!handedOver && !testCase.expect.handover) {
      for (const pattern of testCase.expect.mustMatch ?? []) {
        if (!new RegExp(pattern, "i").test(reply)) reasons.push(`missing /${pattern}/`);
      }
      for (const pattern of testCase.expect.mustNotMatch ?? []) {
        if (new RegExp(pattern, "i").test(reply)) reasons.push(`forbidden /${pattern}/`);
      }
      const replyLanguage = detectLanguage(reply).lang;
      if (replyLanguage === "unknown") unverified = true;
      else if (replyLanguage !== testCase.lang) reasons.push(`reply language ${replyLanguage}, expected ${testCase.lang}`);
    }

    const stats = perLanguage.get(testCase.lang) ?? { pass: 0, total: 0, unverified: 0 };
    stats.total += 1;
    if (reasons.length === 0) stats.pass += 1;
    if (unverified) stats.unverified += 1;
    perLanguage.set(testCase.lang, stats);
    if (reasons.length > 0) failures.push(`- ${testCase.id}: ${reasons.join("; ")}\n    Q: ${testCase.message}\n    A: ${reply}`);
  }

  let pass = 0;
  let total = 0;
  console.log("Language   pass/total   unverified-language");
  for (const [language, stats] of perLanguage) {
    pass += stats.pass;
    total += stats.total;
    console.log(`${language.padEnd(10)} ${`${stats.pass}/${stats.total}`.padEnd(12)} ${stats.unverified}`);
  }
  console.log(`\nOverall: ${pass}/${total} (${((100 * pass) / total).toFixed(1)}%)  model=${model}  est. cost ~$${totalCost.toFixed(4)}`);
  if (failures.length > 0) console.log(`\nFailures:\n${failures.join("\n")}`);
  if (pass / total < minPass) {
    console.error(`\nBelow the ${(minPass * 100).toFixed(0)}% gate.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
