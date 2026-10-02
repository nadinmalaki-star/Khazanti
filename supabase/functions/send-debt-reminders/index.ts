// send-debt-reminders — KHZNTI Phase 1 Web Push (debt due-date reminders).
// Invoked only by the server-side scheduler with the x-cron-secret header.
// verify_jwt is disabled for this function (supabase/config.toml) because the
// cron secret replaces it; browser users can never call it successfully.
//
// Required secrets (set in Supabase, never in the repo):
//   CRON_SECRET, PUSH_ENABLED ("true" to run), VAPID_PUBLIC_KEY,
//   VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:khzntiapp@gmail.com).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import webpush from "npm:web-push@3.6.7";
import { handleRequest } from "./handler.js";
import { createDb } from "./db.js";
import { createPushSender } from "./push.js";

Deno.serve((request: Request) => {
  const env = {
    CRON_SECRET: Deno.env.get("CRON_SECRET"),
    PUSH_ENABLED: Deno.env.get("PUSH_ENABLED"),
    VAPID_PUBLIC_KEY: Deno.env.get("VAPID_PUBLIC_KEY"),
    VAPID_PRIVATE_KEY: Deno.env.get("VAPID_PRIVATE_KEY"),
    VAPID_SUBJECT: Deno.env.get("VAPID_SUBJECT"),
  };

  return handleRequest(request, {
    env,
    // Created only after authentication + PUSH_ENABLED checks pass.
    makeDb: () =>
      createDb(
        createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
      ),
    makeSender: () =>
      createPushSender({
        webpush,
        publicKey: env.VAPID_PUBLIC_KEY!,
        privateKey: env.VAPID_PRIVATE_KEY!,
        subject: env.VAPID_SUBJECT!,
      }),
    now: () => new Date(),
    newRunId: () => crypto.randomUUID(),
    log: (entry: Record<string, unknown>) => console.log(JSON.stringify(entry)),
  });
});
