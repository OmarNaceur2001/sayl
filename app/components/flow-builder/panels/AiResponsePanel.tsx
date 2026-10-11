"use client";

const POPULAR_MODELS = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

interface AiResponsePanelData {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextMessages?: number;
  sendDirectly?: boolean;
  replyLanguage?: string;
  useKnowledgeBase?: boolean;
  answerOnlyFromKb?: boolean;
  kbMinSimilarity?: number;
  handoverOnFailure?: boolean;
  fallbackMessage?: { text?: string; translations?: Record<string, string> };
  [key: string]: unknown;
}

const FALLBACK_LANGUAGES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "ar", label: "العربية" },
  { id: "tn", label: "Darija" },
] as const;

interface AiResponsePanelProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function AiResponsePanel({ data: rawData, onChange }: AiResponsePanelProps) {
  const data = rawData as AiResponsePanelData;
  const currentModel = data.model || "openai/gpt-4o-mini";

  return (
    <div className="space-y-4">
      {/* System Prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          System Prompt
        </label>
        <textarea
          value={data.systemPrompt || ""}
          onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
          placeholder="You are a helpful customer support agent..."
          rows={8}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Instructions for how the AI should behave and respond.
        </p>
      </div>

      {/* Model */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Model
        </label>
        <input
          type="text"
          value={currentModel}
          onChange={(e) => onChange({ ...data, model: e.target.value })}
          placeholder="provider/model (e.g. openai/gpt-4o-mini)"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 placeholder:font-sans focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POPULAR_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...data, model: m.id })}
              className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                currentModel === m.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "border-border text-muted-foreground hover:border-input"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/60">
          Any model supported by{" "}
          <a
            href="https://vercel.com/ai-gateway"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-muted-foreground"
          >
            Vercel AI Gateway
          </a>
          . Format: provider/model-name
        </p>
      </div>

      {/* Temperature */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Temperature</label>
          <span className="text-xs text-muted-foreground">{data.temperature ?? 0.7}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={data.temperature ?? 0.7}
          onChange={(e) => onChange({ ...data, temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground/60">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Max Tokens
        </label>
        <input
          type="number"
          value={data.maxTokens ?? 500}
          onChange={(e) => onChange({ ...data, maxTokens: parseInt(e.target.value) || 500 })}
          min={1}
          max={4096}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Maximum length of the AI response.
        </p>
      </div>

      {/* Context Messages */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Context Messages
        </label>
        <input
          type="number"
          value={data.contextMessages ?? 10}
          onChange={(e) => onChange({ ...data, contextMessages: parseInt(e.target.value) || 10 })}
          min={1}
          max={50}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          How many past messages to include as context for the AI.
        </p>
      </div>

      {/* Reply language */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Reply language
        </label>
        <select
          value={data.replyLanguage ?? "auto"}
          onChange={(e) => onChange({ ...data, replyLanguage: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="auto">Auto: same language as the customer</option>
          {FALLBACK_LANGUAGES.map((language) => (
            <option key={language.id} value={language.id}>
              Always {language.label}
            </option>
          ))}
        </select>
      </div>

      {/* Knowledge base */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={data.useKnowledgeBase ?? false}
            onChange={(e) =>
              onChange({
                ...data,
                useKnowledgeBase: e.target.checked,
                // grounded answers work better with a low temperature
                ...(e.target.checked && (data.temperature ?? 0.7) === 0.7 ? { temperature: 0.3 } : {}),
              })
            }
            className="h-3.5 w-3.5 rounded border-border text-blue-500 focus:ring-blue-500"
          />
          Use knowledge base
        </label>
        <p className="text-[11px] text-muted-foreground/60">
          Answers use your documents (Knowledge page). Prices and policies are never invented.
        </p>
        {data.useKnowledgeBase ? (
          <>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={data.answerOnlyFromKb ?? true}
                onChange={(e) => onChange({ ...data, answerOnlyFromKb: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-border text-blue-500 focus:ring-blue-500"
              />
              Answer only from the knowledge base (otherwise hand over to a human)
            </label>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">
                Minimum match score (0.1 to 0.9)
              </label>
              <input
                type="number"
                min={0.1}
                max={0.9}
                step={0.05}
                value={data.kbMinSimilarity ?? 0.25}
                onChange={(e) => onChange({ ...data, kbMinSimilarity: parseFloat(e.target.value) || 0.25 })}
                className="w-28 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                Lower = answers more often, higher = hands over more often.
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Handover */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={data.handoverOnFailure ?? true}
            onChange={(e) => onChange({ ...data, handoverOnFailure: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-border text-blue-500 focus:ring-blue-500"
          />
          Hand over to a human when the AI cannot answer
        </label>
        <p className="text-[11px] text-muted-foreground/60">
          The customer gets a short message, the bot pauses on this conversation and your team sees it in the inbox.
        </p>
        <details className="rounded-lg border border-border px-3 py-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">Custom handover message (optional)</summary>
          <div className="mt-2 space-y-2">
            {FALLBACK_LANGUAGES.map((language) => (
              <input
                key={language.id}
                type="text"
                placeholder={`${language.label}: default message`}
                value={data.fallbackMessage?.translations?.[language.id] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    fallbackMessage: {
                      ...data.fallbackMessage,
                      translations: { ...data.fallbackMessage?.translations, [language.id]: e.target.value },
                    },
                  })
                }
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ))}
          </div>
        </details>
      </div>

      {/* Send Directly */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={data.sendDirectly ?? true}
            onChange={(e) => onChange({ ...data, sendDirectly: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-border text-blue-500 focus:ring-blue-500"
          />
          Send response automatically
        </label>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          The generated response is always available to later nodes as{" "}
          {"{{ai_response}}"}. Turn this off to only store it and send it
          yourself with a Send Message node.
        </p>
      </div>
    </div>
  );
}
