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

const LEAD_STATUS = {
  ALOCAT: "alocat",
  CONFIRMAT: "confirmat",
  NECONFIRMAT: "neconfirmat",
  NO_SHOW: "no_show",
  COMPLET: "complet",
  IN_PROGRAM: "in_program",
  COMPLET_3_SESIUNI: "complet_3_sesiuni",
  COMPLET_2_SESIUNI: "complet_2_sesiuni",
  COMPLET_SESIUNE_FINALA: "complet_sesiune_finala",
  COMPLET_SESIUNE_1: "complet_sesiune_1",
};

const ACTIVE_PROGRAM_STATUSES = new Set([
  LEAD_STATUS.ALOCAT,
  LEAD_STATUS.CONFIRMAT,
  LEAD_STATUS.NECONFIRMAT,
  LEAD_STATUS.IN_PROGRAM,
]);

const FINALIZED_PROGRAM_STATUSES = new Set([
  LEAD_STATUS.COMPLET,
  LEAD_STATUS.COMPLET_3_SESIUNI,
  LEAD_STATUS.COMPLET_2_SESIUNI,
  LEAD_STATUS.COMPLET_SESIUNE_FINALA,
  LEAD_STATUS.COMPLET_SESIUNE_1,
  LEAD_STATUS.NO_SHOW,
]);

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

const createAdminClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration is missing");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

const computeFinalStatus = (prezenta1: boolean | null, prezenta2: boolean | null, prezenta3: boolean | null) => {
  const totalPrezente = [prezenta1, prezenta2, prezenta3].filter((value) => value === true).length;
  if (totalPrezente === 3) return LEAD_STATUS.COMPLET_3_SESIUNI;
  if (totalPrezente === 2) return LEAD_STATUS.COMPLET_2_SESIUNI;
  if (totalPrezente === 1) return LEAD_STATUS.COMPLET_SESIUNE_1;
  return LEAD_STATUS.NO_SHOW;
};

const getLeadProgramMentorId = (lead: Record<string, unknown>) => {
  const historyMentors = Array.isArray(lead?.istoricMentori)
    ? lead.istoricMentori.filter(Boolean)
    : [];

  return String(lead?.mentorAlocat || historyMentors[historyMentors.length - 1] || "") || null;
};

const syncMentorState = async (
  supabase: ReturnType<typeof createAdminClient>,
  mentorId: string,
) => {
  const { data: mentor, error: mentorError } = await supabase
    .from("mentori")
    .select("id, available, manuallyDisabled")
    .eq("id", mentorId)
    .maybeSingle();

  if (mentorError) throw mentorError;
  if (!mentor) return null;

  const { data: mentorLeads, error: mentorLeadsError } = await supabase
    .from("leaduri")
    .select("status, emailTrimis")
    .eq("mentorAlocat", mentorId);

  if (mentorLeadsError) throw mentorLeadsError;

  const activeLeadCount = (mentorLeads || []).filter((lead: { status?: string }) => ACTIVE_PROGRAM_STATUSES.has(String(lead.status || ""))).length;
  const hasProgramActiv = (mentorLeads || []).some((lead: { status?: string; emailTrimis?: boolean }) => (
    [LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM].includes(String(lead.status || "")) ||
    (String(lead.status || "") === LEAD_STATUS.ALOCAT && lead.emailTrimis === true)
  ));
  const manuallyDisabled = Boolean(mentor.manuallyDisabled);
  const shouldBeAvailable = !manuallyDisabled && !hasProgramActiv && activeLeadCount < 30;

  const { data: updatedMentor, error: updateMentorError } = await supabase
    .from("mentori")
    .update({
      leaduriAlocate: activeLeadCount,
      available: shouldBeAvailable,
    })
    .eq("id", mentorId)
    .select("id, available, manuallyDisabled, leaduriAlocate")
    .single();

  if (updateMentorError) throw updateMentorError;
  return updatedMentor;
};

const removeLeadFromAllocation = async (
  supabase: ReturnType<typeof createAdminClient>,
  allocationId: string,
  leadId: string,
) => {
  const { data: allocation, error: allocationError } = await supabase
    .from("alocari")
    .select("id, leaduri")
    .eq("id", allocationId)
    .maybeSingle();

  if (allocationError) throw allocationError;
  if (!allocation) return;

  const remainingLeadIds = Array.isArray(allocation.leaduri)
    ? allocation.leaduri.filter((currentLeadId: string) => currentLeadId !== leadId)
    : [];

  if (remainingLeadIds.length === 0) {
    const { error: deleteAllocationError } = await supabase.from("alocari").delete().eq("id", allocationId);
    if (deleteAllocationError) throw deleteAllocationError;
    return;
  }

  const { error: updateAllocationError } = await supabase
    .from("alocari")
    .update({
      numarLeaduri: remainingLeadIds.length,
      leaduri: remainingLeadIds,
      ultimaActualizare: new Date().toISOString(),
    })
    .eq("id", allocationId);

  if (updateAllocationError) throw updateAllocationError;
};

const finalizeLeadProgram = async (
  supabase: ReturnType<typeof createAdminClient>,
  lead: Record<string, unknown>,
  finalUpdates: Record<string, unknown>,
) => {
  const mentorProgramId = getLeadProgramMentorId(lead);
  const historyMentors = Array.isArray(lead?.istoricMentori) ? lead.istoricMentori.filter(Boolean) : [];
  const mergedHistory = [...historyMentors];

  if (mentorProgramId && mergedHistory[mergedHistory.length - 1] !== mentorProgramId) {
    mergedHistory.push(mentorProgramId);
  }

  if (lead.alocareId) {
    await removeLeadFromAllocation(supabase, String(lead.alocareId), String(lead.id));
  }

  const { data: updatedLead, error: updateLeadError } = await supabase
    .from("leaduri")
    .update({
      ...finalUpdates,
      mentorAlocat: null,
      alocareId: null,
      istoricMentori: mergedHistory,
    })
    .eq("id", lead.id)
    .select("*")
    .single();

  if (updateLeadError) throw updateLeadError;

  if (mentorProgramId) {
    await syncMentorState(supabase, mentorProgramId);
  }

  return updatedLead;
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    if (!AUTH_JWT_SECRET) {
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

    if (!["admin", "mentor"].includes(effectiveRole)) {
      return jsonResponse(req, 403, { error: "Forbidden" });
    }

    const { action, leadId, session, value } = await req.json();
    if (!leadId || typeof leadId !== "string") {
      return jsonResponse(req, 400, { error: "leadId este obligatoriu" });
    }

    const supabase = createAdminClient();
    const { data: lead, error: leadError } = await supabase
      .from("leaduri")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return jsonResponse(req, 404, { error: "Lead negasit", details: leadError?.message });
    }

    const programMentorId = getLeadProgramMentorId(lead);
    if (effectiveRole === "mentor" && (!programMentorId || tokenMentorId !== programMentorId)) {
      return jsonResponse(req, 403, { error: "Nu ai acces la acest lead" });
    }

    const nowIso = new Date().toISOString();

    if (action === "mark_session") {
      if (![1, 2, 3].includes(Number(session)) || typeof value !== "boolean") {
        return jsonResponse(req, 400, { error: "session si value sunt obligatorii" });
      }

      if (Number(session) === 1) {
        const { error: updateError } = await supabase
          .from("leaduri")
          .update({
            prezenta1: value,
            status: LEAD_STATUS.IN_PROGRAM,
            dataOneToTwenty: nowIso,
          })
          .eq("id", leadId);

        if (updateError) throw updateError;
        if (lead.mentorAlocat) await syncMentorState(supabase, String(lead.mentorAlocat));
        return jsonResponse(req, 200, {
          success: true,
          message: value ? 'Lead marcat ca Prezent la Sesiunea 1!' : 'Lead marcat ca No-Show la Sesiunea 1.',
        });
      }

      if (Number(session) === 2) {
        const { error: updateError } = await supabase
          .from("leaduri")
          .update({
            prezenta2: value,
            status: LEAD_STATUS.IN_PROGRAM,
            dataOneToTwenty: nowIso,
          })
          .eq("id", leadId);

        if (updateError) throw updateError;
        if (lead.mentorAlocat) await syncMentorState(supabase, String(lead.mentorAlocat));
        return jsonResponse(req, 200, {
          success: true,
          message: value
            ? 'Lead marcat ca Prezent la Sesiunea 2. Continua cu Sesiunea 3.'
            : 'Lead marcat ca No-Show la Sesiunea 2. Continua cu Sesiunea 3.',
        });
      }

      const finalStatus = computeFinalStatus(
        lead.prezenta1 ?? null,
        lead.prezenta2 ?? null,
        value,
      );

      await finalizeLeadProgram(supabase, lead, {
        prezenta3: value,
        status: finalStatus,
        dataOneToTwenty: nowIso,
      });

      return jsonResponse(req, 200, {
        success: true,
        message: value
          ? 'Lead marcat ca Prezent la Sesiunea 3. Program finalizat!'
          : (finalStatus === LEAD_STATUS.NO_SHOW
            ? 'No-Show la toate sesiunile — programul a fost finalizat.'
            : 'Lead marcat la Sesiunea 3. Program finalizat.'),
      });
    }

    if (action === "edit_attendance") {
      if (![1, 2, 3].includes(Number(session)) || typeof value !== "boolean") {
        return jsonResponse(req, 400, { error: "session si value sunt obligatorii" });
      }

      const updates: Record<string, unknown> = {};

      if (Number(session) === 1) {
        updates.prezenta1 = value;
        if (lead.prezenta3 != null) {
          updates.status = computeFinalStatus(value, lead.prezenta2 ?? null, lead.prezenta3 ?? null);
        } else if (lead.prezenta2 != null) {
          updates.status = LEAD_STATUS.IN_PROGRAM;
        }
      } else if (Number(session) === 2) {
        updates.prezenta2 = value;
        if (lead.prezenta3 != null) {
          updates.status = computeFinalStatus(lead.prezenta1 ?? null, value, lead.prezenta3 ?? null);
        } else {
          updates.status = LEAD_STATUS.IN_PROGRAM;
        }
      } else {
        updates.prezenta3 = value;
        updates.status = computeFinalStatus(lead.prezenta1 ?? null, lead.prezenta2 ?? null, value);
        updates.dataOneToTwenty = nowIso;
      }

      const nextStatus = String(updates.status || lead.status || "");
      if (FINALIZED_PROGRAM_STATUSES.has(nextStatus)) {
        await finalizeLeadProgram(supabase, lead, updates);
      } else {
        const { error: updateError } = await supabase.from("leaduri").update(updates).eq("id", leadId);
        if (updateError) throw updateError;
        if (lead.mentorAlocat) await syncMentorState(supabase, String(lead.mentorAlocat));
      }

      return jsonResponse(req, 200, {
        success: true,
        message: 'Prezenta a fost corectata cu succes!',
      });
    }

    return jsonResponse(req, 400, { error: "Invalid action" });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonResponse(req, 500, {
      error: "Failed to update lead attendance",
      details,
    });
  }
});