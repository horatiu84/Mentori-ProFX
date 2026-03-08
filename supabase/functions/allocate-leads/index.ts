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
  IN_PROGRAM: "in_program",
};

const ACTIVE_PROGRAM_STATUSES = new Set([
  LEAD_STATUS.ALOCAT,
  LEAD_STATUS.CONFIRMAT,
  LEAD_STATUS.NECONFIRMAT,
  LEAD_STATUS.IN_PROGRAM,
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

const getMentorDisplayName = (mentor: Record<string, unknown>) => String(mentor.nume || mentor.id || "mentor");

const syncMentorState = async (
  supabase: ReturnType<typeof createAdminClient>,
  mentorId: string,
  options: { manuallyDisabled?: boolean } = {}
) => {
  const { data: mentor, error: mentorError } = await supabase
    .from("mentori")
    .select("id, nume, available, manuallyDisabled, leaduriAlocate")
    .eq("id", mentorId)
    .maybeSingle();

  if (mentorError) throw mentorError;
  if (!mentor) {
    throw new Error("Mentor invalid");
  }

  const manuallyDisabled = typeof options.manuallyDisabled === "boolean"
    ? options.manuallyDisabled
    : Boolean(mentor.manuallyDisabled);

  const { data: mentorLeads, error: mentorLeadsError } = await supabase
    .from("leaduri")
    .select("id, status, emailTrimis")
    .eq("mentorAlocat", mentorId);

  if (mentorLeadsError) throw mentorLeadsError;

  const activeLeadCount = (mentorLeads || []).filter((lead: { status?: string }) => ACTIVE_PROGRAM_STATUSES.has(String(lead.status || ""))).length;
  const hasProgramActiv = (mentorLeads || []).some((lead: { status?: string; emailTrimis?: boolean }) => (
    [LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM].includes(String(lead.status || "")) ||
    (String(lead.status || "") === LEAD_STATUS.ALOCAT && lead.emailTrimis === true)
  ));
  const shouldBeAvailable = !manuallyDisabled && !hasProgramActiv && activeLeadCount < 30;

  const { data: updatedMentor, error: mentorUpdateError } = await supabase
    .from("mentori")
    .update({
      manuallyDisabled,
      leaduriAlocate: activeLeadCount,
      available: shouldBeAvailable,
    })
    .eq("id", mentorId)
    .select("id, nume, available, manuallyDisabled, leaduriAlocate")
    .single();

  if (mentorUpdateError) throw mentorUpdateError;

  return updatedMentor;
};

const removeLeadFromAllocation = async (
  supabase: ReturnType<typeof createAdminClient>,
  allocationId: string,
  leadId: string
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

const resetLeadAssignment = async (
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string
) => {
  const { error: leadUpdateError } = await supabase
    .from("leaduri")
    .update({
      status: LEAD_STATUS.NEALOCAT,
      mentorAlocat: null,
      dataAlocare: null,
      dataTimeout: null,
      dataConfirmare: null,
      emailTrimis: false,
      alocareId: null,
    })
    .eq("id", leadId);

  if (leadUpdateError) throw leadUpdateError;
};

const deallocateSingleLead = async (
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string
) => {
  const { data: lead, error: leadError } = await supabase
    .from("leaduri")
    .select("id, nume, mentorAlocat, alocareId")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) {
    throw new Error("Lead negasit");
  }

  if (lead.alocareId) {
    await removeLeadFromAllocation(supabase, String(lead.alocareId), String(lead.id));
  }

  await resetLeadAssignment(supabase, String(lead.id));

  if (lead.mentorAlocat) {
    await syncMentorState(supabase, String(lead.mentorAlocat));
  }

  return {
    leadName: String(lead.nume || "Lead"),
    mentorId: lead.mentorAlocat ? String(lead.mentorAlocat) : null,
  };
};

const deallocateMentorLeads = async (
  supabase: ReturnType<typeof createAdminClient>,
  mentorId: string
) => {
  const { data: mentorLeads, error: mentorLeadsError } = await supabase
    .from("leaduri")
    .select("id")
    .eq("mentorAlocat", mentorId);

  if (mentorLeadsError) throw mentorLeadsError;

  const leadIds = (mentorLeads || []).map((lead: { id: string }) => String(lead.id));

  if (leadIds.length > 0) {
    const { error: resetLeadsError } = await supabase
      .from("leaduri")
      .update({
        status: LEAD_STATUS.NEALOCAT,
        mentorAlocat: null,
        dataAlocare: null,
        dataTimeout: null,
        dataConfirmare: null,
        emailTrimis: false,
        alocareId: null,
      })
      .in("id", leadIds);

    if (resetLeadsError) throw resetLeadsError;
  }

  const { error: deleteAllocationsError } = await supabase.from("alocari").delete().eq("mentorId", mentorId);
  if (deleteAllocationsError) throw deleteAllocationsError;

  const mentor = await syncMentorState(supabase, mentorId);

  return {
    releasedCount: leadIds.length,
    mentorName: getMentorDisplayName(mentor),
  };
};

const toggleMentorManualAvailability = async (
  supabase: ReturnType<typeof createAdminClient>,
  mentorId: string,
  isCurrentlyDisabled: boolean
) => {
  if (isCurrentlyDisabled) {
    const mentor = await syncMentorState(supabase, mentorId, { manuallyDisabled: false });
    return {
      message: "Mentor activat!",
      releasedCount: 0,
      mentorName: getMentorDisplayName(mentor),
    };
  }

  const { data: activeLeadRows, error: activeLeadRowsError } = await supabase
    .from("leaduri")
    .select("id")
    .eq("mentorAlocat", mentorId)
    .in("status", Array.from(ACTIVE_PROGRAM_STATUSES));

  if (activeLeadRowsError) throw activeLeadRowsError;

  const leadIds = (activeLeadRows || []).map((lead: { id: string }) => String(lead.id));

  if (leadIds.length > 0) {
    const { error: resetLeadsError } = await supabase
      .from("leaduri")
      .update({
        status: LEAD_STATUS.NEALOCAT,
        mentorAlocat: null,
        dataAlocare: null,
        dataTimeout: null,
        dataConfirmare: null,
        emailTrimis: false,
        alocareId: null,
      })
      .in("id", leadIds);

    if (resetLeadsError) throw resetLeadsError;

    const { error: deleteAllocationsError } = await supabase.from("alocari").delete().eq("mentorId", mentorId);
    if (deleteAllocationsError) throw deleteAllocationsError;
  }

  const { data: updatedMentor, error: mentorUpdateError } = await supabase
    .from("mentori")
    .update({
      available: false,
      leaduriAlocate: 0,
      manuallyDisabled: true,
    })
    .eq("id", mentorId)
    .select("id, nume")
    .single();

  if (mentorUpdateError) throw mentorUpdateError;

  return {
    message: `Mentor dezactivat si ${leadIds.length} leaduri dezalocate!`,
    releasedCount: leadIds.length,
    mentorName: getMentorDisplayName(updatedMentor),
  };
};

const allocateBatchToMentor = async (
  supabase: ReturnType<typeof createAdminClient>,
  mentor: Record<string, unknown>,
  leadBatch: Array<Record<string, unknown>>
) => {
  const mentorId = String(mentor.id || "");
  const mentorName = getMentorDisplayName(mentor);

  const { data: activeAllocation, error: activeAllocationError } = await supabase
    .from("alocari")
    .select("id, leaduri")
    .eq("mentorId", mentorId)
    .eq("status", "activa")
    .maybeSingle();

  if (activeAllocationError) throw activeAllocationError;

  let allocationId = String(activeAllocation?.id || "");
  const leadIds = leadBatch.map((lead) => String(lead.id));

  if (allocationId) {
    const updatedLeadIds = [
      ...new Set([...(Array.isArray(activeAllocation?.leaduri) ? activeAllocation.leaduri : []), ...leadIds]),
    ];

    const { error: allocationUpdateError } = await supabase
      .from("alocari")
      .update({
        numarLeaduri: updatedLeadIds.length,
        leaduri: updatedLeadIds,
        ultimaActualizare: new Date().toISOString(),
      })
      .eq("id", allocationId);

    if (allocationUpdateError) throw allocationUpdateError;
  } else {
    const { data: newAllocation, error: allocationInsertError } = await supabase
      .from("alocari")
      .insert({
        mentorId,
        mentorNume: mentorName,
        numarLeaduri: leadIds.length,
        leaduri: leadIds,
        createdAt: new Date().toISOString(),
        status: "activa",
      })
      .select("id")
      .single();

    if (allocationInsertError) throw allocationInsertError;
    allocationId = String(newAllocation?.id || "");

    if (!allocationId) {
      throw new Error("Nu s-a putut crea alocarea pentru mentor.");
    }
  }

  const allocationTime = new Date().toISOString();

  for (const lead of leadBatch) {
    const history = Array.isArray(lead.istoricMentori) ? lead.istoricMentori.filter(Boolean) : [];
    const nextHistory = history[history.length - 1] === mentorId ? history : [...history, mentorId];

    const { error: leadUpdateError } = await supabase
      .from("leaduri")
      .update({
        status: LEAD_STATUS.ALOCAT,
        mentorAlocat: mentorId,
        alocareId: allocationId,
        dataAlocare: allocationTime,
        dataTimeout: null,
        emailTrimis: false,
        istoricMentori: nextHistory,
        numarReAlocari: Number(lead.numarReAlocari || 0),
      })
      .eq("id", lead.id);

    if (leadUpdateError) throw leadUpdateError;
  }

  const currentLeadCount = Number(mentor.leaduriAlocate || 0);
  const totalLeadCount = currentLeadCount + leadBatch.length;

  const { error: mentorUpdateError } = await supabase
    .from("mentori")
    .update({
      leaduriAlocate: totalLeadCount,
      available: totalLeadCount >= 30 ? false : Boolean(mentor.available),
    })
    .eq("id", mentorId);

  if (mentorUpdateError) throw mentorUpdateError;

  return {
    mentorId,
    mentorName,
    allocatedCount: leadBatch.length,
    totalLeadCount,
    allocationId,
  };
};

serve(async (req: Request) => {
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
    const { action, mentorId, requestedCount, leadId, isCurrentlyDisabled } = await req.json();
    const supabase = createAdminClient();

    if (action === "deallocate_single") {
      if (!leadId || typeof leadId !== "string") {
        return jsonResponse(req, 400, { error: "leadId este obligatoriu" });
      }

      const result = await deallocateSingleLead(supabase, leadId);
      return jsonResponse(req, 200, {
        success: true,
        ...result,
        message: `Leadul \"${result.leadName}\" a fost dezalocat cu succes!`,
      });
    }

    if (action === "deallocate_mentor") {
      if (!mentorId || typeof mentorId !== "string") {
        return jsonResponse(req, 400, { error: "mentorId este obligatoriu" });
      }

      const result = await deallocateMentorLeads(supabase, mentorId);
      return jsonResponse(req, 200, {
        success: true,
        ...result,
        message: `${result.releasedCount} leaduri dezalocate de la ${result.mentorName}! Leadurile sunt acum nealocate.`,
      });
    }

    if (action === "toggle_mentor") {
      if (!mentorId || typeof mentorId !== "string") {
        return jsonResponse(req, 400, { error: "mentorId este obligatoriu" });
      }

      const result = await toggleMentorManualAvailability(supabase, mentorId, Boolean(isCurrentlyDisabled));
      return jsonResponse(req, 200, {
        success: true,
        ...result,
        message: result.message,
      });
    }

    const { data: unallocatedLeads, error: leadsError } = await supabase
      .from("leaduri")
      .select("id, istoricMentori, numarReAlocari")
      .eq("status", LEAD_STATUS.NEALOCAT)
      .order("createdAt", { ascending: true });

    if (leadsError) throw leadsError;

    if (!Array.isArray(unallocatedLeads) || unallocatedLeads.length === 0) {
      return jsonResponse(req, 400, { error: "Nu exista leaduri nealocate" });
    }

    const { data: mentors, error: mentorsError } = await supabase
      .from("mentori")
      .select("id, nume, available, manuallyDisabled, leaduriAlocate, ordineCoada")
      .order("ordineCoada", { ascending: true });

    if (mentorsError) throw mentorsError;

    if (!Array.isArray(mentors) || mentors.length === 0) {
      return jsonResponse(req, 400, { error: "Nu exista mentori disponibili" });
    }

    if (action === "manual") {
      if (!mentorId || typeof mentorId !== "string") {
        return jsonResponse(req, 400, { error: "mentorId este obligatoriu" });
      }

      const mentor = mentors.find((item) => item.id === mentorId);
      if (!mentor) {
        return jsonResponse(req, 404, { error: "Mentor invalid" });
      }

      if (!mentor.available || mentor.manuallyDisabled) {
        return jsonResponse(req, 400, { error: "Mentorul selectat nu poate primi leaduri noi" });
      }

      const currentLeadCount = Number(mentor.leaduriAlocate || 0);
      const availableSlots = 30 - currentLeadCount;
      if (availableSlots <= 0) {
        return jsonResponse(req, 400, { error: "Mentorul selectat are deja 30 de leaduri" });
      }

      const requested = Number.isFinite(Number(requestedCount)) && Number(requestedCount) > 0
        ? Number(requestedCount)
        : availableSlots;

      const allocateCount = Math.min(requested, availableSlots, unallocatedLeads.length);
      const leadBatch = unallocatedLeads.slice(0, allocateCount);
      const result = await allocateBatchToMentor(supabase, mentor, leadBatch);

      return jsonResponse(req, 200, {
        success: true,
        ...result,
        remainingUnallocated: unallocatedLeads.length - allocateCount,
        message: `Alocate manual ${allocateCount} leaduri catre ${result.mentorName}! Total mentor: ${result.totalLeadCount}/30. Nealocate: ${unallocatedLeads.length - allocateCount}`,
      });
    }

    if (action === "auto") {
      const mentor = mentors.find((item) => item.available && !item.manuallyDisabled && Number(item.leaduriAlocate || 0) < 30);

      if (!mentor) {
        return jsonResponse(req, 400, { error: "Nu exista mentori disponibili. Activeaza un mentor pentru a putea aloca leaduri." });
      }

      const currentLeadCount = Number(mentor.leaduriAlocate || 0);
      if (currentLeadCount === 0 && unallocatedLeads.length < 20) {
        return jsonResponse(req, 400, { error: `Pentru un mentor nou, minimul este 20 leaduri. Disponibile: ${unallocatedLeads.length}` });
      }

      const availableSlots = 30 - currentLeadCount;
      const allocateCount = Math.min(availableSlots, unallocatedLeads.length);
      const leadBatch = unallocatedLeads.slice(0, allocateCount);
      const result = await allocateBatchToMentor(supabase, mentor, leadBatch);

      return jsonResponse(req, 200, {
        success: true,
        ...result,
        remainingUnallocated: unallocatedLeads.length - allocateCount,
        message: `Alocate ${allocateCount} leaduri catre ${result.mentorName}! Total mentor: ${result.totalLeadCount}/30. Nealocate: ${unallocatedLeads.length - allocateCount}`,
      });
    }

    return jsonResponse(req, 400, { error: "Invalid action" });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonResponse(req, 500, {
      error: "Failed to allocate leads",
      details,
    });
  }
});