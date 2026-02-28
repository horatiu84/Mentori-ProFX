/* eslint-disable no-undef */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.9.6";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AUTH_JWT_SECRET =
  Deno.env.get("AUTH_JWT_SECRET") ||
  Deno.env.get("SUPABASE_JWT_SECRET") ||
  Deno.env.get("JWT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!AUTH_JWT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Auth misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let claims: Record<string, unknown> = {};
    try {
      const secret = new TextEncoder().encode(AUTH_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        issuer: "profx-webinarii",
        audience: "authenticated",
      });
      claims = payload;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (claims.app_role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return new Response(
        JSON.stringify({ error: "username and newPassword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof username !== "string" || typeof newPassword !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid input types" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedUsername = username.replace(/[^a-zA-Z0-9._\-]/g, "");
    if (sanitizedUsername !== username || sanitizedUsername.length === 0 || sanitizedUsername.length > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be between 8 and 128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username")
      .eq("username", sanitizedUsername)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 12);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password: newPasswordHash })
      .eq("id", user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update password", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password updated for user ${user.username}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Failed to reset password", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
