import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where the link goes once signed in. Always a path on this site, never another one.
  const requested = searchParams.get("next");
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // A dead reset link goes back to where a new one can be sent
  if (next === "/reset-password") return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
