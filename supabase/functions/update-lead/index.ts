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
  NEALOCAT: "nealocat",
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
} as const;

const VALID_LEAD_STATUSES = new Set(Object.values(LEAD_STATUS));
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

const sanitizeText = (input: unknown, maxLength = 255) => {
  if (typeof input !== "string") return "";

  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .slice(0, maxLength)
    .trim();
};

const sanitizeEmail = (input: unknown) => {
  if (typeof input !== "string") return "";

  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.@_+-]/g, "")
    .slice(0, 254);
};

const sanitizePhone = (input: unknown) => {
  if (typeof input !== "string") return "";

  return input
    .replace(/[^0-9+\s\-()]/g, "")
    .slice(0, 20)
    .trim();
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

const clearLeadAssignment = async (
  supabase: ReturnType<typeof createAdminClient>,
  lead: Record<string, unknown>,
  baseUpdates: Record<string, unknown>,
) => {
  if (lead.alocareId) {
    await removeLeadFromAllocation(supabase, String(lead.alocareId), String(lead.id));
  }

  const { data: updatedLead, error: updateLeadError } = await supabase
    .from("leaduri")
    .update({
      ...baseUpdates,
      status: LEAD_STATUS.NEALOCAT,
      mentorAlocat: null,
      alocareId: null,
      dataAlocare: null,
      dataTimeout: null,
      dataConfirmare: null,
      emailTrimis: false,
    })
    .eq("id", lead.id)
    .select("*")
    .single();

  if (updateLeadError) throw updateLeadError;

  if (lead.mentorAlocat) {
    await syncMentorState(supabase, String(lead.mentorAlocat));
  }

  return updatedLead;
};

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

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const auth = await verifyAdminToken(req);
    if (!auth.ok) return auth.response;

    const { leadId, nume, telefon, email, status } = await req.json();

    if (!leadId || typeof leadId !== "string") {
      return jsonResponse(req, 400, { error: "leadId este obligatoriu" });
    }

    const sanitizedName = sanitizeText(nume);
    const sanitizedPhone = sanitizePhone(telefon);
    const normalizedEmail = sanitizeEmail(email);
    const normalizedStatus = typeof status === "string" && status.trim() ? status.trim() : null;

    if (!sanitizedName || !sanitizedPhone || !normalizedEmail) {
      return jsonResponse(req, 400, { error: "Numele, telefonul si emailul sunt obligatorii" });
    }

    if (normalizedStatus && !VALID_LEAD_STATUSES.has(normalizedStatus as typeof LEAD_STATUS[keyof typeof LEAD_STATUS])) {
      return jsonResponse(req, 400, { error: "Status invalid" });
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

    const { data: duplicateLeads, error: duplicateCheckError } = await supabase
      .from("leaduri")
      .select("id, email")
      .eq("email", normalizedEmail)
      .neq("id", leadId)
      .limit(1);

    if (duplicateCheckError) throw duplicateCheckError;
    if (Array.isArray(duplicateLeads) && duplicateLeads.length > 0) {
      return jsonResponse(req, 409, { error: `Exista deja un lead cu email-ul ${normalizedEmail}.` });
    }

    const requestedStatus = normalizedStatus || String(lead.status || LEAD_STATUS.NEALOCAT);
    const updatePayload: Record<string, unknown> = {
      nume: sanitizedName,
      telefon: sanitizedPhone,
      email: normalizedEmail,
      status: requestedStatus,
    };

    if (FINALIZED_PROGRAM_STATUSES.has(requestedStatus as typeof LEAD_STATUS[keyof typeof LEAD_STATUS])) {
      const updatedLead = await finalizeLeadProgram(supabase, lead, updatePayload);
      return jsonResponse(req, 200, {
        success: true,
        message: "Lead actualizat cu succes!",
        lead: updatedLead,
      });
    }

    if (requestedStatus === LEAD_STATUS.NEALOCAT) {
      const updatedLead = await clearLeadAssignment(supabase, lead, updatePayload);
      return jsonResponse(req, 200, {
        success: true,
        message: "Lead actualizat cu succes!",
        lead: updatedLead,
      });
    }

    if (ACTIVE_PROGRAM_STATUSES.has(requestedStatus as typeof LEAD_STATUS[keyof typeof LEAD_STATUS]) && !lead.mentorAlocat) {
      return jsonResponse(req, 400, {
        error: "Leadul nu poate avea status activ fara un mentor alocat",
      });
    }

    const { data: updatedLead, error: updateLeadError } = await supabase
      .from("leaduri")
      .update(updatePayload)
      .eq("id", leadId)
      .select("*")
      .single();

    if (updateLeadError) throw updateLeadError;

    const mentorIdsToSync = new Set<string>();
    if (lead.mentorAlocat) mentorIdsToSync.add(String(lead.mentorAlocat));
    if (updatedLead?.mentorAlocat) mentorIdsToSync.add(String(updatedLead.mentorAlocat));
    const programMentorId = getLeadProgramMentorId(lead);
    if (programMentorId) mentorIdsToSync.add(programMentorId);

    for (const mentorId of mentorIdsToSync) {
      await syncMentorState(supabase, mentorId);
    }

    return jsonResponse(req, 200, {
      success: true,
      message: "Lead actualizat cu succes!",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("update-lead error", error);
    return jsonResponse(req, 500, {
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});