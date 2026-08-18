import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { email, code } = await req.json();
    if (typeof email !== "string" || typeof code !== "string") {
      return json({ error: "Missing email or code" }, 400);
    }
    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows, error } = await supabase
      .from("login_otps")
      .select("id, code, expires_at, used")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;

    const latest = rows?.[0];
    const valid = latest && !latest.used && new Date(latest.expires_at).getTime() >= Date.now() && latest.code === code;
    if (!valid) {
      return json({ error: "Invalid or expired code" }, 401);
    }

    await supabase.from("login_otps").update({ used: true }).eq("id", latest.id);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Verification failed" }, 500);
  }
}

const port = Deno.env.get("PORT");
Deno.serve(port ? { port: Number(port) } : {}, handler);
