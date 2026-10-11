import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import type { SupportedLanguage } from "@/lib/types/database";

const supportedLanguages: readonly SupportedLanguage[] = ["fr", "en", "ar", "tn"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("language" in body) ||
    typeof body.language !== "string" ||
    !supportedLanguages.includes(body.language as SupportedLanguage)
  ) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const { data: contact, error: contactLookupError } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .single();

  if (contactLookupError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const roleResult = await requireWorkspaceRole(user.id, contact.workspace_id, [
    "owner",
    "admin",
  ]);
  if (!roleResult.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: updatedContact, error: updateError } = await supabase
    .from("contacts")
    .update({
      language: body.language as SupportedLanguage,
      language_confidence: 1,
      language_source: "manual",
    })
    .eq("id", contactId)
    .eq("workspace_id", contact.workspace_id)
    .select("id, language, language_confidence, language_source")
    .single();

  if (updateError || !updatedContact) {
    console.error("[contacts/language] Failed to set contact language:", updateError);
    return NextResponse.json(
      { error: "Failed to update contact language" },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedContact);
}
