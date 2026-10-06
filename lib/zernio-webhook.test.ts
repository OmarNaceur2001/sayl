import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureWebhookRegistered,
  generateWebhookSecret,
  getWebhookSignatureFailure,
  getOrCreateWorkspaceWebhookSecret,
  resolveWebhookSecret,
  verifyWebhookSignature,
  WEBHOOK_NAME,
} from "./zernio-webhook";

interface CapturedUpdate {
  table: string;
  patch: Record<string, unknown>;
}

function makeFakeSupabase(seed: {
  webhook_secret?: string | null;
  channel_webhook_secret?: string | null;
}) {
  const updates: CapturedUpdate[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          const webhook_secret = table === "channel_secrets"
            ? seed.channel_webhook_secret ?? null
            : seed.webhook_secret ?? null;
          return Promise.resolve({ data: webhook_secret ? { webhook_secret } : null, error: null });
        },
        single() {
          return Promise.resolve({ data: { webhook_secret: seed.webhook_secret ?? null }, error: null });
        },
        upsert(patch: Record<string, unknown>) {
          updates.push({ table, patch });
          seed.webhook_secret = patch.webhook_secret as string;
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, updates };
}

/**
 * Builds a fake Zernio client exposing only the `webhooks` surface used by
 * ensureWebhookRegistered, pre-seeded with a list of existing webhooks.
 */
function fakeZernio(existing: Array<Record<string, unknown>>) {
  const create = vi.fn().mockResolvedValue({ data: { success: true } });
  const update = vi.fn().mockResolvedValue({ data: { success: true } });
  const get = vi.fn().mockResolvedValue({ data: { webhooks: existing } });
  return {
    client: { webhooks: { getWebhookSettings: get, createWebhookSettings: create, updateWebhookSettings: update } },
    get,
    create,
    update,
  };
}

const opts = {
  appUrl: "https://app.sayl.example",
  secret: "s3cr3t",
  events: ["message.received", "comment.received"] as const,
};
const EXPECTED_URL = "https://app.sayl.example/api/webhooks/late";

describe("ensureWebhookRegistered", () => {
  it("creates the webhook when none exists (AC1)", async () => {
    const z = fakeZernio([]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("created");
    expect(z.create).toHaveBeenCalledTimes(1);
    expect(z.create).toHaveBeenCalledWith({
      body: {
        name: WEBHOOK_NAME,
        url: EXPECTED_URL,
        secret: "s3cr3t",
        events: ["message.received", "comment.received"],
      },
    });
    expect(z.update).not.toHaveBeenCalled();
  });

  it("is idempotent — no-op when config already correct (AC2)", async () => {
    const z = fakeZernio([
      { _id: "wh1", name: WEBHOOK_NAME, url: EXPECTED_URL, secret: "s3cr3t", events: ["message.received", "comment.received"] },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("unchanged");
    expect(z.create).not.toHaveBeenCalled();
    expect(z.update).not.toHaveBeenCalled();
  });

  it("updates when the url is stale (AC3)", async () => {
    const z = fakeZernio([
      { _id: "wh1", name: WEBHOOK_NAME, url: "https://old.example/api/webhooks/late", events: ["message.received", "comment.received"] },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("updated");
    expect(z.update).toHaveBeenCalledTimes(1);
    expect(z.update).toHaveBeenCalledWith({
      body: {
        _id: "wh1",
        name: WEBHOOK_NAME,
        url: EXPECTED_URL,
        secret: "s3cr3t",
        events: ["message.received", "comment.received"],
      },
    });
    expect(z.create).not.toHaveBeenCalled();
  });

  it("updates when the remote secret differs (drift after local rotation)", async () => {
    const z = fakeZernio([
      { _id: "wh1", name: WEBHOOK_NAME, url: EXPECTED_URL, secret: "old-secret", events: ["message.received", "comment.received"] },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("updated");
    expect(z.update).toHaveBeenCalledWith({
      body: {
        _id: "wh1",
        name: WEBHOOK_NAME,
        url: EXPECTED_URL,
        secret: "s3cr3t",
        events: ["message.received", "comment.received"],
      },
    });
  });

  it("updates when a required event is missing (AC3)", async () => {
    const z = fakeZernio([
      { _id: "wh1", name: WEBHOOK_NAME, url: EXPECTED_URL, events: ["message.received"] },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("updated");
    expect(z.update).toHaveBeenCalledTimes(1);
  });

  it("strips whitespace from appUrl (newline in env var corrupted the registered URL, #10)", async () => {
    const z = fakeZernio([]);
    await ensureWebhookRegistered(
      z.client as any,
      { ...opts, appUrl: "https://app.sayl.example\n", events: [...opts.events] },
    );

    expect(z.create).toHaveBeenCalledWith({
      body: {
        name: WEBHOOK_NAME,
        url: EXPECTED_URL,
        secret: "s3cr3t",
        events: ["message.received", "comment.received"],
      },
    });
  });

  it("matches an existing webhook by name even if url has a trailing slash in appUrl", async () => {
    const z = fakeZernio([
      { _id: "wh1", name: WEBHOOK_NAME, url: EXPECTED_URL, secret: "s3cr3t", events: ["message.received", "comment.received"] },
    ]);
    const res = await ensureWebhookRegistered(
      z.client as any,
      { ...opts, appUrl: "https://app.sayl.example/", events: [...opts.events] },
    );

    expect(res.action).toBe("unchanged");
  });

  it("adopts a pre-existing webhook with a different name when the path matches (E2E finding)", async () => {
    const z = fakeZernio([
      {
        _id: "wh9",
        name: "ZernFlow comments+DM to Sam",
        url: `${EXPECTED_URL}?x-vercel-protection-bypass=tok`,
        events: ["message.received", "comment.received"],
      },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("updated");
    expect(z.update).toHaveBeenCalledWith({
      body: {
        _id: "wh9",
        name: WEBHOOK_NAME,
        url: EXPECTED_URL,
        secret: "s3cr3t",
        events: ["message.received", "comment.received"],
      },
    });
    expect(z.create).not.toHaveBeenCalled();
  });

  it("matches by path when the url carries a query string but events are already set", async () => {
    const z = fakeZernio([
      {
        _id: "wh1",
        name: WEBHOOK_NAME,
        url: `${EXPECTED_URL}?x-vercel-protection-bypass=tok`,
        events: ["message.received", "comment.received"],
      },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    // Same path but url differs (query token) → update to strip it and set our secret.
    expect(res.action).toBe("updated");
    expect(z.update).toHaveBeenCalledTimes(1);
  });

  it("creates a new webhook when several exist and none are ours", async () => {
    const z = fakeZernio([
      { _id: "a", name: "Other A", url: "https://x.example/hook", events: [] },
      { _id: "b", name: "Other B", url: "https://y.example/hook", events: [] },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("created");
    expect(z.create).toHaveBeenCalledTimes(1);
    expect(z.update).not.toHaveBeenCalled();
  });

  it("never hijacks a lone unrelated webhook (Zernio allows up to 10 per account)", async () => {
    const z = fakeZernio([
      {
        _id: "user1",
        name: "AgendaAI Webhook",
        url: "https://example.supabase.co/functions/v1/zernio-webhook",
        events: ["message.received"],
      },
    ]);
    const res = await ensureWebhookRegistered(z.client as any, { ...opts, events: [...opts.events] });

    expect(res.action).toBe("created");
    expect(z.create).toHaveBeenCalledTimes(1);
    expect(z.update).not.toHaveBeenCalled();
  });
});

describe("generateWebhookSecret", () => {
  it("returns a 64-char hex string", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different value each call", () => {
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret());
  });
});

describe("getOrCreateWorkspaceWebhookSecret", () => {
  it("returns the existing secret without writing (AC5)", async () => {
    const fake = makeFakeSupabase({ webhook_secret: "existing-secret" });
    const secret = await getOrCreateWorkspaceWebhookSecret(fake.client, "ws-1");

    expect(secret).toBe("existing-secret");
    expect(fake.updates).toHaveLength(0);
  });

  it("generates, persists and returns a new secret when missing (AC1, AC5)", async () => {
    const fake = makeFakeSupabase({ webhook_secret: null });
    const secret = await getOrCreateWorkspaceWebhookSecret(fake.client, "ws-1");

    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(fake.updates).toHaveLength(1);
    expect(fake.updates[0]).toMatchObject({
      table: "workspace_secrets",
      patch: { webhook_secret: secret },
    });
  });
});

describe("verifyWebhookSignature (AC4)", () => {
  const secret = "workspace-secret";
  const body = '{"event":"message.received"}';
  const validSig = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a valid HMAC-SHA256 signature", () => {
    expect(verifyWebhookSignature(secret, body, validSig)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifyWebhookSignature(secret, body, "deadbeef")).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(secret, body, null)).toBe(false);
  });

  it("rejects when the body was tampered with", () => {
    expect(verifyWebhookSignature(secret, '{"event":"other"}', validSig)).toBe(false);
  });
});

describe("getWebhookSignatureFailure", () => {
  const secret = "workspace-secret";
  const body = '{"event":"message.received"}';
  const validSig = createHmac("sha256", secret).update(body).digest("hex");

  it("rejects a missing configured secret", () => {
    expect(getWebhookSignatureFailure(null, body, validSig)).toBe("missing_secret");
  });

  it("rejects a missing signature", () => {
    expect(getWebhookSignatureFailure(secret, body, null)).toBe("invalid_signature");
  });

  it("rejects an invalid signature", () => {
    expect(getWebhookSignatureFailure(secret, body, "deadbeef")).toBe("invalid_signature");
  });

  it("accepts a valid signature", () => {
    expect(getWebhookSignatureFailure(secret, body, validSig)).toBeNull();
  });
});

describe("resolveWebhookSecret (AC4)", () => {
  it("prefers the workspace secret over the channel secret", async () => {
    const fake = makeFakeSupabase({ webhook_secret: "ws-secret" });
    const secret = await resolveWebhookSecret(fake.client, {
      id: "channel-1",
      workspace_id: "ws-1",
    });
    expect(secret).toBe("ws-secret");
  });

  it("falls back to the migrated channel secret when workspace has none", async () => {
    const fake = makeFakeSupabase({
      webhook_secret: null,
      channel_webhook_secret: "legacy-channel-secret",
    });
    const secret = await resolveWebhookSecret(fake.client, {
      id: "channel-1",
      workspace_id: "ws-1",
    });
    expect(secret).toBe("legacy-channel-secret");
  });

  it("returns null when neither secret is set", async () => {
    const fake = makeFakeSupabase({ webhook_secret: null });
    const secret = await resolveWebhookSecret(fake.client, {
      id: "channel-1",
      workspace_id: "ws-1",
    });
    expect(secret).toBeNull();
  });
});
