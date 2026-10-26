import { createBrowserClient } from "@supabase/ssr";

/** All project tables live in the "app" schema (see supabase/migrations). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "app" } },
  );
}