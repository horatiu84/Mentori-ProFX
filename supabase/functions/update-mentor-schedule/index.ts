/* eslint-disable no-undef */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AUTH_JWT_SECRET =
  Deno.env.get("AUTH_JWT_SECRET") ||
  Deno.env.get("SUPABASE_JWT_SECRET") ||
  Deno.env.get("JWT_SECRET");

const ALLOWED_ORIGINS = [
  "https://profx-mentori.web.app",
  "https://profx-mentori.netlify.app",
  "https://profx-mentori.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:4173",
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

const jsonResponse = (req: Request, status: number, payload: Record<string, unknown>) => {
  const corsHeaders = getCorsHeaders(req);
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const parseDate = (value: unknown) => {
  if (!value) return null;
  if (typeof value !== "string") {
    throw new Error("Invalid date format");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date format");
  }

  return parsed.toISOString();
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    if (!AUTH_JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(req, 500, { error: "Auth misconfiguration" });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return jsonResponse(req, 401, { error: "Missing authorization token" });
    }

    const secret = new TextEncoder().encode(AUTH_JWT_SECRET);
    let payload: Record<string, unknown> | null = null;

    try {
      const verified = await jwtVerify(token, secret, {
        issuer: "profx-webinarii",
        audience: "authenticated",
      });
      payload = verified.payload as Record<string, unknown>;
    } catch {
      try {
        const verified = await jwtVerify(token, secret);
        payload = verified.payload as Record<string, unknown>;
      } catch {
        return jsonResponse(req, 401, { error: "Invalid or expired token" });
      }
    }

    const effectiveRole = String(
      payload?.app_role || payload?.user_role || payload?.role_name || payload?.role || ""
    ).toLowerCase();
    const tokenMentorId = String(payload?.mentor_id || "");

    const { mentorId, webinar1Date, webinar2Date, webinar3Date, resetAll = false } = await req.json();

    if (!mentorId || typeof mentorId !== "string") {
      return jsonResponse(req, 400, { error: "mentorId is required" });
    }

    if (effectiveRole !== "admin" && !(effectiveRole === "mentor" && tokenMentorId === mentorId)) {
      return jsonResponse(req, 403, { error: "Forbidden" });
    }

    if (!resetAll && !webinar1Date) {
      return jsonResponse(req, 400, { error: "Sesiunea 1 este obligatorie" });
    }

    const updates = resetAll
      ? {
          ultimulOneToTwenty: null,
          webinar2Date: null,
          webinar3Date: null,
        }
      : {
          ultimulOneToTwenty: parseDate(webinar1Date),
          webinar2Date: parseDate(webinar2Date),
          webinar3Date: parseDate(webinar3Date),
        };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: updatedMentor, error: updateError } = await supabase
      .from("mentori")
      .update(updates)
      .eq("id", mentorId)
      .select("*")
      .single();

    if (updateError || !updatedMentor) {
      return jsonResponse(req, 500, {
        error: "Failed to update mentor schedule",
        details: updateError?.message || "No mentor updated",
      });
    }

    return jsonResponse(req, 200, {
      success: true,
      mentor: updatedMentor,
      message: resetAll
        ? "Programul webinar 1:20 a fost resetat."
        : "Datele webinarului au fost actualizate.",
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonResponse(req, 500, {
      error: "Failed to update mentor schedule",
      details,
    });
  }
});