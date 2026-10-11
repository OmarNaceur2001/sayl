"use client";

import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import type { KbDocumentKind, SupportedLanguage } from "@/lib/types/database";

export interface KbDocumentSummary {
  id: string;
  title: string;
  kind: KbDocumentKind;
  language: SupportedLanguage | null;
  chunk_count: number;
  created_at: string;
}

interface KnowledgeManagerProps {
  initialDocuments: KbDocumentSummary[];
  canEdit: boolean;
}

const KIND_HELP: Record<KbDocumentKind, string> = {
  faq: "One pair per block: 'Q: ...' then 'A: ...' (Question/Réponse and السؤال/الجواب also work).",
  csv: "First row = column names. Columns 'question' + 'answer' become FAQ entries; any other columns (product, price, stock...) become one passage per row.",
  text: "Free text (delivery policy, opening hours, returns...). Separate topics with a blank line.",
};

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function KnowledgeManager({ initialDocuments, canEdit }: KnowledgeManagerProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<KbDocumentKind>("faq");
  const [language, setLanguage] = useState<SupportedLanguage | "">("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    if (file.name.toLowerCase().endsWith(".csv")) setKind("csv");
  }

  async function addDocument() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/kb/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text, kind, language: language || null }),
      });
      const body = (await response.json().catch(() => ({}))) as
        | (KbDocumentSummary & { truncated?: boolean })
        | { error?: string };
      if (!response.ok || !("id" in body)) {
        setError(("error" in body && body.error) || "Could not add the document");
        return;
      }
      setDocuments((current) => [body, ...current]);
      setTitle("");
      setText("");
      setNotice(
        body.truncated
          ? `Added ${body.chunk_count} passages (the document was truncated to the first ${body.chunk_count}).`
          : `Added ${body.chunk_count} passages.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument(id: string) {
    if (!window.confirm("Delete this document and its passages?")) return;
    setError(null);
    const response = await fetch(`/api/v1/kb/documents/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete the document");
      return;
    }
    setDocuments((current) => current.filter((document) => document.id !== id));
  }

  return (
    <div className="space-y-8">
      {canEdit ? (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Add knowledge</h2>
          <input
            className={inputClass}
            placeholder="Title (e.g. Delivery & returns)"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <select className={`${inputClass} w-auto`} value={kind} onChange={(event) => setKind(event.target.value as KbDocumentKind)}>
              <option value="faq">FAQ (Q/A)</option>
              <option value="text">Free text</option>
              <option value="csv">CSV (catalog / FAQ)</option>
            </select>
            <select className={`${inputClass} w-auto`} value={language} onChange={(event) => setLanguage(event.target.value as SupportedLanguage | "")}>
              <option value="">Language: mixed / unknown</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="tn">Darija</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:border-input">
              <Upload className="h-3.5 w-3.5" /> Import file
              <input type="file" accept=".csv,.txt,.md" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground/70">{KIND_HELP[kind]}</p>
          <textarea
            className={`${inputClass} font-mono`}
            rows={10}
            placeholder={"Q: Livraison à Sfax ?\nA: Oui, 7 DT, 48h.\n\nQ: بقداش التوصيل؟\nA: 7 دينار لكل الولايات."}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {notice ? <p className="text-xs text-emerald-600">{notice}</p> : null}
          <button
            type="button"
            disabled={busy || !title.trim() || !text.trim()}
            onClick={() => void addDocument()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Indexing..." : "Add to knowledge base"}
          </button>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Only owners and admins can edit the knowledge base.</p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet. Add your FAQ, delivery policy and product list, then turn on &quot;Use knowledge base&quot; in an AI Response node.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{document.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {document.kind.toUpperCase()} · {document.chunk_count} passages
                    {document.language ? ` · ${document.language}` : ""} ·{" "}
                    {new Date(document.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={`Delete ${document.title}`}
                    onClick={() => void removeDocument(document.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
