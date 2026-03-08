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

const ACTIVE_PROGRAM_STATUSES = new Set([
  "alocat",
  "confirmat",
  "neconfirmat",
  "in_program",
]);

const ALL_ROWS_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";

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

const isNoRowsError = (error: { code?: string } | null | undefined) => error?.code === "PGRST116";

const verifyAdminToken = async (req: Request) => {
  if (!AUTH_JWT_SECRET) {
    return { ok: false, response: jsonResponse(req, 500, { error: "Auth misconfiguration" }) };
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { ok: false, response: jsonResponse(req, 401, { error: "Missing authorization token" }) };
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
      return { ok: false, response: jsonResponse(req, 403, { error: "Forbidden" }) };
    }

    return { ok: true, response: null };
  } catch {
    return { ok: false, response: jsonResponse(req, 401, { error: "Invalid or expired token" }) };
  }
};

const createAdminClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration is missing");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

const syncAllocationAfterLeadDelete = async (
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string,
  alocareId: string | null
) => {
  if (!alocareId) return;

  const { data: allocation, error: allocationError } = await supabase
    .from("alocari")
    .select("id, leaduri")
    .eq("id", alocareId)
    .single();

  if (allocationError) {
    if (isNoRowsError(allocationError)) return;
    throw allocationError;
  }

  const remainingLeadIds = Array.isArray(allocation?.leaduri)
    ? allocation.leaduri.filter((currentLeadId: string) => currentLeadId !== leadId)
    : [];

  if (remainingLeadIds.length === 0) {
    const { error: deleteAllocationError } = await supabase.from("alocari").delete().eq("id", alocareId);
    if (deleteAllocationError) throw deleteAllocationError;
    return;
  }

  const { error: updateAllocationError } = await supabase
    .from("alocari")
    .update({
      leaduri: remainingLeadIds,
      numarLeaduri: remainingLeadIds.length,
      ultimaActualizare: new Date().toISOString(),
    })
    .eq("id", alocareId);

  if (updateAllocationError) throw updateAllocationError;
};

const syncMentorCountAfterLeadDelete = async (
  supabase: ReturnType<typeof createAdminClient>,
  mentorId: string | null,
  leadStatus: string | null
) => {
  if (!mentorId || !leadStatus || !ACTIVE_PROGRAM_STATUSES.has(leadStatus)) return;

  const { data: mentor, error: mentorError } = await supabase
    .from("mentori")
    .select("id, leaduriAlocate")
    .eq("id", mentorId)
    .single();

  if (mentorError) {
    if (isNoRowsError(mentorError)) return;
    throw mentorError;
  }

  const currentLeadCount = Number(mentor?.leaduriAlocate || 0);
  const { error: mentorUpdateError } = await supabase
    .from("mentori")
    .update({ leaduriAlocate: Math.max(0, currentLeadCount - 1) })
    .eq("id", mentorId);

  if (mentorUpdateError) throw mentorUpdateError;
};

const deleteSingleLead = async (
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string
) => {
  const { data: lead, error: leadError } = await supabase
    .from("leaduri")
    .select("id, nume, status, mentorAlocat, alocareId")
    .eq("id", leadId)
    .single();

  if (leadError) {
    if (isNoRowsError(leadError)) {
      return { ok: false, status: 404, error: "Lead not found" };
    }
    throw leadError;
  }

  const { error: deleteLeadError } = await supabase.from("leaduri").delete().eq("id", leadId);
  if (deleteLeadError) throw deleteLeadError;

  await syncMentorCountAfterLeadDelete(supabase, lead.mentorAlocat || null, lead.status || null);
  await syncAllocationAfterLeadDelete(supabase, lead.id, lead.alocareId || null);

  return {
    ok: true,
    leadName: lead.nume || "Lead",
  };
};

const resetMentorLeadState = async (supabase: ReturnType<typeof createAdminClient>) => {
  const { data: mentors, error: mentorsError } = await supabase.from("mentori").select("id");
  if (mentorsError) throw mentorsError;

  for (const mentor of mentors || []) {
    const { error: mentorUpdateError } = await supabase
      .from("mentori")
      .update({ leaduriAlocate: 0, available: true })
      .eq("id", mentor.id);

    if (mentorUpdateError) throw mentorUpdateError;
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  const authCheck = await verifyAdminToken(req);
  if (!authCheck.ok) {
    return authCheck.response;
  }

  try {
    const { action, leadId, mentorId } = await req.json();
    const supabase = createAdminClient();

    if (action === "delete_single") {
      if (!leadId || typeof leadId !== "string") {
        return jsonResponse(req, 400, { error: "leadId is required" });
      }

      const result = await deleteSingleLead(supabase, leadId);
      if (!result.ok) {
        return jsonResponse(req, result.status, { error: result.error });
      }

      return jsonResponse(req, 200, {
        success: true,
        message: `Leadul \"${result.leadName}\" a fost sters cu succes.`,
      });
    }

    if (action === "delete_all") {
      const { error: deleteLeadsError } = await supabase
        .from("leaduri")
        .delete()
        .neq("id", ALL_ROWS_SENTINEL_ID);
      if (deleteLeadsError) throw deleteLeadsError;

      const { error: deleteAllocationsError } = await supabase
        .from("alocari")
        .delete()
        .neq("id", ALL_ROWS_SENTINEL_ID);
      if (deleteAllocationsError) throw deleteAllocationsError;

      await resetMentorLeadState(supabase);

      return jsonResponse(req, 200, {
        success: true,
        message: "Toate leadurile au fost sterse si mentorii au fost resetati.",
      });
    }

    if (action === "delete_mentor") {
      if (!mentorId || typeof mentorId !== "string") {
        return jsonResponse(req, 400, { error: "mentorId is required" });
      }

      const { data: mentorLeads, error: mentorLeadsError } = await supabase
        .from("leaduri")
        .select("id")
        .eq("mentorAlocat", mentorId);
      if (mentorLeadsError) throw mentorLeadsError;

      const deletedCount = Array.isArray(mentorLeads) ? mentorLeads.length : 0;

      const { error: deleteMentorLeadsError } = await supabase
        .from("leaduri")
        .delete()
        .eq("mentorAlocat", mentorId);
      if (deleteMentorLeadsError) throw deleteMentorLeadsError;

      const { error: deleteMentorAllocationsError } = await supabase
        .from("alocari")
        .delete()
        .eq("mentorId", mentorId);
      if (deleteMentorAllocationsError) throw deleteMentorAllocationsError;

      const { error: mentorUpdateError } = await supabase
        .from("mentori")
        .update({ leaduriAlocate: 0, available: true })
        .eq("id", mentorId);
      if (mentorUpdateError) throw mentorUpdateError;

      return jsonResponse(req, 200, {
        success: true,
        deletedCount,
        message: `${deletedCount} leaduri ale mentorului au fost sterse cu succes.`,
      });
    }

    return jsonResponse(req, 400, { error: "Invalid action" });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonResponse(req, 500, {
      error: "Failed to delete leads",
      details,
    });
  }
});