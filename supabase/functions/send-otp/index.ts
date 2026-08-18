import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMail } from "../_shared/mailer.ts";

const ORG_DOMAIN = "procredit.ph";
const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_MS = 30_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !email.toLowerCase().trim().endsWith(`@${ORG_DOMAIN}`)) {
      return json({ error: `Email must be a ${ORG_DOMAIN} address` }, 400);
    }
    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recent, error: recentError } = await supabase
      .from("login_otps")
      .select("created_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recentError) throw recentError;
    if (recent?.length && Date.now() - new Date(recent[0].created_at).getTime() < RESEND_COOLDOWN_MS) {
      return json({ error: "Please wait before requesting another code" }, 429);
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

    const { error: insertError } = await supabase
      .from("login_otps")
      .insert({ email: normalizedEmail, code, expires_at: expiresAt });
    if (insertError) throw insertError;

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>ProCredit Portfolio — Login Code</h2>
        <p>Your one-time verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
      </div>`;

    await sendMail(normalizedEmail, "Your ProCredit Portfolio login code", html);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Failed to send code" }, 500);
  }
}

const port = Deno.env.get("PORT");
Deno.serve(port ? { port: Number(port) } : {}, handler);
