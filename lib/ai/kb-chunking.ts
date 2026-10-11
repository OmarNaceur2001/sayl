import type { KbDocumentKind } from "@/lib/types/database";

export const MAX_KB_TEXT_CHARS = 200_000;
export const MAX_CHUNKS_PER_DOCUMENT = 300;
const MAX_CHUNK_CHARS = 1_200;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

/** Paragraph-based chunking; oversized paragraphs are split on sentence ends, then hard-split. */
export function chunkPlainText(text: string, maxChars = 800): string[] {
  const paragraphs = normalizeNewlines(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      pieces.push(paragraph);
      continue;
    }
    const sentences = paragraph.split(/(?<=[.!?؟۔])\s+/);
    let buffer = "";
    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        if (buffer) pieces.push(buffer);
        buffer = "";
        for (let index = 0; index < sentence.length; index += maxChars) {
          pieces.push(sentence.slice(index, index + maxChars));
        }
        continue;
      }
      if (buffer && buffer.length + sentence.length + 1 > maxChars) {
        pieces.push(buffer);
        buffer = sentence;
      } else {
        buffer = buffer ? `${buffer} ${sentence}` : sentence;
      }
    }
    if (buffer) pieces.push(buffer);
  }

  // Merge small neighbours so we do not embed one-liners separately.
  const chunks: string[] = [];
  for (const piece of pieces) {
    const last = chunks[chunks.length - 1];
    if (last !== undefined && last.length + piece.length + 2 <= maxChars) {
      chunks[chunks.length - 1] = `${last}\n\n${piece}`;
    } else {
      chunks.push(piece);
    }
  }
  return chunks;
}

const QUESTION_LINE = /^\s*(?:q|question|سؤال|السؤال|س)\s*[:：.)\-–]\s*(.*)$/i;
const ANSWER_LINE = /^\s*(?:a|r|réponse|reponse|answer|جواب|الجواب|ج)\s*[:：.)\-–]\s*(.*)$/i;

/** "Q: ... / A: ..." (also Question/Réponse/السؤال/الجواب) => one chunk per pair. */
export function parseFaq(text: string): string[] {
  const pairs: Array<{ question: string; answer: string }> = [];
  let current: { question: string; answer: string; part: "q" | "a" } | null = null;

  for (const line of normalizeNewlines(text).split("\n")) {
    const question = QUESTION_LINE.exec(line);
    if (question) {
      if (current) pairs.push({ question: current.question, answer: current.answer });
      current = { question: question[1].trim(), answer: "", part: "q" };
      continue;
    }
    const answer = ANSWER_LINE.exec(line);
    if (answer && current) {
      current.answer = answer[1].trim();
      current.part = "a";
      continue;
    }
    if (current && line.trim()) {
      if (current.part === "q") current.question += ` ${line.trim()}`;
      else current.answer += ` ${line.trim()}`;
    }
  }
  if (current) pairs.push({ question: current.question, answer: current.answer });

  return pairs
    .filter((pair) => pair.question && pair.answer)
    .map((pair) => `Q: ${pair.question}\nA: ${pair.answer}`);
}

/** Minimal RFC-4180 style parser: quotes, escaped quotes, ',' ';' or tab delimiter. */
export function parseCsv(text: string): string[][] {
  const source = normalizeNewlines(text).replace(/^\uFEFF/, "");
  const firstLine = source.split("\n", 1)[0] ?? "";
  const delimiter = [";", "\t", ","]
    .map((candidate) => ({ candidate, count: firstLine.split(candidate).length - 1 }))
    .sort((a, b) => b.count - a.count)[0];
  const separator = delimiter && delimiter.count > 0 ? delimiter.candidate : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);

  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

const QUESTION_HEADERS = new Set(["question", "q", "faq", "سؤال", "السؤال"]);
const ANSWER_HEADERS = new Set(["answer", "réponse", "reponse", "a", "r", "جواب", "الجواب"]);

export function csvToChunks(text: string): string[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const names = header.map((name) => name.trim());
  const lowered = names.map((name) => name.toLowerCase());
  const questionIndex = lowered.findIndex((name) => QUESTION_HEADERS.has(name));
  const answerIndex = lowered.findIndex((name) => ANSWER_HEADERS.has(name));

  const chunks: string[] = [];
  for (const cells of rows) {
    if (questionIndex >= 0 && answerIndex >= 0) {
      const question = (cells[questionIndex] ?? "").trim();
      const answer = (cells[answerIndex] ?? "").trim();
      if (question && answer) chunks.push(`Q: ${question}\nA: ${answer}`);
      continue;
    }
    const parts = names
      .map((name, index) => ({ name, value: (cells[index] ?? "").trim() }))
      .filter((part) => part.name && part.value)
      .map((part) => `${part.name}: ${part.value}`);
    if (parts.length > 0) chunks.push(parts.join("; "));
  }
  return chunks;
}

export interface BuiltChunks {
  chunks: string[];
  truncated: boolean;
}

export function buildChunks(kind: KbDocumentKind, text: string): BuiltChunks {
  let chunks: string[];
  if (kind === "csv") chunks = csvToChunks(text);
  else if (kind === "faq") {
    const pairs = parseFaq(text);
    chunks = pairs.length > 0 ? pairs : chunkPlainText(text);
  } else chunks = chunkPlainText(text);

  chunks = chunks
    .map((chunk) => chunk.slice(0, MAX_CHUNK_CHARS).trim())
    .filter((chunk) => chunk.length > 0);

  const truncated = chunks.length > MAX_CHUNKS_PER_DOCUMENT;
  return { chunks: truncated ? chunks.slice(0, MAX_CHUNKS_PER_DOCUMENT) : chunks, truncated };
}
