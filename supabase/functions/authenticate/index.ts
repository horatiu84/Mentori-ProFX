/* eslint-disable no-undef */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AUTH_JWT_SECRET = Deno.env.get("AUTH_JWT_SECRET") || Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseRestHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY || "",
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ""}`,
};

const base64UrlEncode = (input: string | Uint8Array) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const signHs256Jwt = async (payload: Record<string, unknown>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signingInput));
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Auth misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fast path: DB-side password verification via pgcrypto RPC
    let user = null;
    let rpcError = null;
    try {
      const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/auth_login`, {
        method: "POST",
        headers: supabaseRestHeaders,
        body: JSON.stringify({
          p_username: sanitizedUsername,
          p_password: password,
        }),
      });

      if (rpcResponse.ok) {
        const userRows = await rpcResponse.json();
        user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;
      } else {
        const errText = await rpcResponse.text();
        rpcError = errText;
      }
    } catch (err) {
      rpcError = err instanceof Error ? err.message : String(err);
    }

    if (rpcError) {
      console.warn("auth_login RPC unavailable, using fallback auth path:", rpcError);
    }

    if (!user) {
      const usersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(sanitizedUsername)}&select=id,username,role,mentorId,password&limit=1`,
        {
          method: "GET",
          headers: supabaseRestHeaders,
        }
      );

      if (!usersResponse.ok) {
        const errText = await usersResponse.text();
        console.error("Fallback user lookup failed:", errText);
        console.log("User not found:", sanitizedUsername);
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const users = await usersResponse.json();
      const fallbackUser = Array.isArray(users) && users.length > 0 ? users[0] : null;

      if (!fallbackUser) {
        console.log("User not found:", sanitizedUsername);
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const storedPassword = fallbackUser.password || "";
      const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
      const passwordOk = isBcryptHash
        ? bcrypt.compareSync(password, storedPassword)
        : storedPassword === password;

      if (!passwordOk) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user = {
        id: fallbackUser.id,
        username: fallbackUser.username,
        role: fallbackUser.role,
        mentorId: fallbackUser.mentorId,
      };
    }

    // Authentication successful
    console.log(`✅ User authenticated: ${sanitizedUsername} (${user.role})`);

    if (!AUTH_JWT_SECRET) {
      console.error("❌ Missing AUTH_JWT_SECRET/SUPABASE_JWT_SECRET/JWT_SECRET env var");
      return new Response(
        JSON.stringify({ error: "Auth misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await signHs256Jwt({
      role: "authenticated",
      app_role: user.role,
      username: user.username,
      mentor_id: user.mentorId || null,
      user_id: user.id,
      iat: nowSec,
      nbf: nowSec,
      iss: "profx-webinarii",
      aud: "authenticated",
      sub: user.id,
      exp: nowSec + TOKEN_TTL_SECONDS,
    }, AUTH_JWT_SECRET);

    // Return user data (without password!)
    return new Response(
      JSON.stringify({
        success: true,
        accessToken,
        tokenType: "Bearer",
        expiresIn: TOKEN_TTL_SECONDS,
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
