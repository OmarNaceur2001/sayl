import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/next-path";
import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  // Recovery links must land on the password-reset page even when the email
  // template doesn't pass an explicit ?next.
  const defaultNext = rawType === "recovery" ? "/reset-password" : "/dashboard";
  const next = safeInternalPath(searchParams.get("next"), defaultNext);

  const supabase = await createClient();

  // PKCE authorization-code callbacks (OAuth, email confirmation, recovery)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // token_hash callbacks (non-PKCE email templates: signup, recovery, magic link)
  if (tokenHash && rawType && EMAIL_OTP_TYPES.includes(rawType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
