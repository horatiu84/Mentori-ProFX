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

const normalizeUsername = (value: string) => value.replace(/\s+/g, " ").trim();
const usernameRegex = /^[\p{L}\p{N}._\-\s]+$/u;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!AUTH_JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    try {
      const secret = new TextEncoder().encode(AUTH_JWT_SECRET);
      let payload: Record<string, unknown> | null = null;

      try {
        const verified = await jwtVerify(token, secret, {
          issuer: "profx-webinarii",
          audience: "authenticated",
        });
        payload = verified.payload as Record<string, unknown>;
      } catch {
        const verified = await jwtVerify(token, secret);
        payload = verified.payload as Record<string, unknown>;
      }

      const effectiveRole = String(
        payload?.app_role || payload?.user_role || payload?.role_name || payload?.role || ""
      ).toLowerCase();

      if (effectiveRole !== "admin") {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (req.method === "GET") {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, role, mentorId")
        .order("role", { ascending: false })
        .order("username", { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to load users", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, users: users || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { targetUsername, oldPassword, newPassword, newUsername } = await req.json();

    if (!targetUsername || !oldPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: "targetUsername, oldPassword and newPassword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof targetUsername !== "string" || typeof oldPassword !== "string" || typeof newPassword !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid input types" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 4 || newPassword.length > 128) {
      return new Response(
        JSON.stringify({ error: "New password must be between 4 and 128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedTargetUsername = normalizeUsername(targetUsername);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, role, mentorId, password")
      .eq("username", normalizedTargetUsername)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storedPassword = user.password || "";
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
    const oldPasswordOk = isBcryptHash
      ? bcrypt.compareSync(oldPassword, storedPassword)
      : storedPassword === oldPassword;

    if (!oldPasswordOk) {
      return new Response(
        JSON.stringify({ error: "Old password is incorrect" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updates: Record<string, unknown> = {
      password: bcrypt.hashSync(newPassword, 12),
    };

    if (typeof newUsername === "string") {
      const normalizedNewUsername = normalizeUsername(newUsername);
      if (normalizedNewUsername.length < 3 || normalizedNewUsername.length > 80) {
        return new Response(
          JSON.stringify({ error: "New username must be between 3 and 80 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!usernameRegex.test(normalizedNewUsername)) {
        return new Response(
          JSON.stringify({ error: "New username contains invalid characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (normalizedNewUsername !== user.username) {
        updates.username = normalizedNewUsername;
      }
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("id, username, role, mentorId")
      .single();

    if (updateError) {
      const isDuplicate = updateError.message?.toLowerCase().includes("duplicate");
      return new Response(
        JSON.stringify({ error: isDuplicate ? "Username already exists" : "Failed to update user", details: updateError.message }),
        { status: isDuplicate ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: updatedUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Failed to manage users", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
