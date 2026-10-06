import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createZernioClient } from "@/lib/zernio-client";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { updateWorkspaceSecrets } from "@/lib/workspace-secrets";
import {
  ensureWebhookRegistered,
  getOrCreateWorkspaceWebhookSecret,
} from "@/lib/zernio-webhook";
import { backfillInboxConversations } from "@/lib/inbox-sync";
import { isSupportedPlatform } from "@/lib/platforms";

/**
 * POST /api/v1/channels/test-key
 *
 * Tests a Zernio API key, saves it to the workspace, and auto-syncs channels.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { apiKey, workspaceId } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { error: "apiKey is required" },
      { status: 400 }
    );
  }
  if (typeof workspaceId !== "string" || !workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleResult = await requireWorkspaceRole(user.id, workspaceId, ["owner", "admin"]);
  if (!roleResult.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate the key by listing accounts
  // TODO(security): Add distributed rate limiting before exposing this endpoint broadly.
  let accounts: Array<{ _id?: string; platform?: string; username?: string; displayName?: string; profilePicture?: string }>;
  try {
    const zernio = createZernioClient(apiKey.trim());
    const res = await zernio.accounts.listAccounts();
    accounts = (res.data?.accounts ?? []) as typeof accounts;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid API key or connection error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Save the key to the private server-only credential store.
  try {
    await updateWorkspaceSecrets(workspaceId, {
      late_api_key_encrypted: apiKey.trim(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown storage error";
    return NextResponse.json(
      { error: `Key valid but failed to save: ${message}` },
      { status: 500 }
    );
  }

  // Register (or refresh) this deployment's webhook in Zernio so inbound
  // messages/comments reach the Inbox. Best-effort: a failure here must not
  // block saving the key or syncing channels.
  try {
    const serviceClient = await createServiceClient();
    const secret = await getOrCreateWorkspaceWebhookSecret(serviceClient, workspaceId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const zernio = createZernioClient(apiKey.trim());
    await ensureWebhookRegistered(zernio, {
      appUrl,
      secret,
      events: ["message.received", "comment.received"],
    });
  } catch (err) {
    console.error("[test-key] webhook auto-registration failed:", err);
  }

  // Auto-sync channels
  const { data: existingChannels } = await supabase
    .from("channels")
    .select("*")
    .eq("workspace_id", workspaceId);

  const existingByLateId = new Map(
    (existingChannels ?? []).map((c) => [c.late_account_id, c])
  );

  for (const account of accounts) {
    if (!account._id) continue;
    if (existingByLateId.has(account._id)) continue;
    if (!isSupportedPlatform(account.platform)) continue;

    const { error: insertErr } = await supabase.from("channels").insert({
      workspace_id: workspaceId,
      platform: account.platform,
      late_account_id: account._id,
      username: account.username || null,
      display_name: account.displayName || account.username || null,
      profile_picture: account.profilePicture || null,
      is_active: true,
    });
    if (insertErr) {
      console.error("[test-key] channel insert failed:", insertErr);
    }
  }

  // Backfill conversations that predate webhook registration so a
  // first-time API-key setup fills the Inbox immediately (best-effort).
  try {
    const { data: activeChannels } = await supabase
      .from("channels")
      .select("id, late_account_id, platform")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    await backfillInboxConversations({
      supabase,
      zernio: createZernioClient(apiKey.trim()),
      workspaceId,
      channels: activeChannels ?? [],
    });
  } catch (err) {
    console.error("[test-key] inbox backfill failed:", err);
  }

  return NextResponse.json({ accounts });
}
