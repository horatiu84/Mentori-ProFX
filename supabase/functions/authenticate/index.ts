/* eslint-disable no-undef */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validare lungime input pentru a preveni abuse
    if (typeof username !== 'string' || typeof password !== 'string' ||
        username.length > 50 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitizare username - doar caractere alfanumerice, punct, underscore, liniuță
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9._\-]/g, '');
    if (sanitizedUsername !== username || sanitizedUsername.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", sanitizedUsername)
      .single();

    if (userError || !user) {
      console.log("User not found:", sanitizedUsername);
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password (TODO: This should be hashed comparison!)
    // For now, we do plain text comparison for backward compatibility
    if (user.password !== password) {
      console.log("Invalid password for user:", sanitizedUsername);
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authentication successful
    console.log(`✅ User authenticated: ${sanitizedUsername} (${user.role})`);

    // Return user data (without password!)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          username: user.username,
          role: user.role,
          mentorId: user.mentorId,
          id: user.id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in login:", error);
    return new Response(
      JSON.stringify({
        error: "Authentication failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
