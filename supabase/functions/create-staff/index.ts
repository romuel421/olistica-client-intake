// Supabase Edge Function: create-staff
// Deploy as function name "create-staff". Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// as Edge Function secrets (the service-role key must NEVER be exposed in the HTML).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !serviceKey || !authHeader) return new Response(JSON.stringify({ error: "Server is not configured or caller is not authenticated." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !user) return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: profile, error: profileError } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin") return new Response(JSON.stringify({ error: "Only administrators can create staff accounts." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) {
    return new Response(JSON.stringify({ error: "Provide a valid email and a password of at least 10 characters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { created_by_admin: user.id } });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ ok: true, user: { id: data.user.id, email: data.user.email } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
