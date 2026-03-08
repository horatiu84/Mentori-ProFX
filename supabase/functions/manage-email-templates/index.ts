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

const DEFAULT_TEMPLATES = {
  emailTemplate: {
    id: "emailTemplate",
    subject: "Invitatie Webinar 1:20 - ProFX",
    body: `Buna ziua {{nume}},

Sunt {{mentorName}}, mentorul tau de la ProFX!

Te invit să participi la webinarul nostru 1:20 dedicat începătorilor, unde vom construi împreună baza corectă în trading, pas cu pas.

În cadrul webinarului vei învăța:

✅ Ce înseamnă tradingul și cum funcționează piața
✅ Ce sunt Buy Stop/Limit, Sell Stop/Limit, Stop Loss (SL) și Take Profit (TP)
✅ Cum se folosește platforma MT5 și cum se plasează corect un ordin
✅ Noțiuni esențiale pentru a începe în siguranță, fără confuzie

Webinarul este gândit special pentru cei care pornesc de la zero și vor să înțeleagă lucrurile simplu și practic.

La final vei putea adresa întrebări și vei avea o imagine clară asupra pașilor următori.

Data si ora webinarului:
📅 {{webinarDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 CONFIRMA PARTICIPAREA TA:
👉 {{confirmationLink}}

Te rog să confirmi participarea ta accesând link-ul de mai sus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Te astept cu drag!

Cu respect,
{{mentorName}}
Mentor ProFX

Contact:
📞 {{telefon}}
📧 {{email}}`,
  },
  vipEmailTemplate: {
    id: "vipEmailTemplate",
    subject: "Ofertă VIP Exclusivă – ProFX Premium 💎",
    body: `Buna ziua {{nume}},

🎓 Felicitări pentru parcurgerea programului ProFX!

Acum că ai finalizat sesiunile, te invităm să faci următorul pas în cariera ta de trader cu accesul la Programul VIP ProFX — conceput special pentru traders dedicați.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 ACCES VIP — DOAR 20€/LUNĂ

Ce primești:

📈 MINIM 4 sesiuni de trading LIVE zilnic
   • Scalping / Day Trading / Swing

💡 Idei de intrări zilnice – Entry, SL, TP pe Gold și Forex

🎓 Cursuri GRATUITE – Începători & Avansați

🧠 Cursuri Psihologie & Dezvoltare Personală

🤝 Affiliate Partnerships

📊 Acces la sesiuni de Macroeconomie

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Investiția ta: doar 20€/lună

Nu rata această oportunitate de a face parte din comunitatea noastră VIP.

Contactează-ne pentru a-ți rezerva locul!

Cu respect,
Echipa ProFX`,
  },
} as const;

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

const normalizeTemplateString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
};

const verifyToken = async (req: Request) => {
  if (!AUTH_JWT_SECRET) {
    return { ok: false, response: jsonResponse(req, 500, { error: "Auth misconfiguration" }), role: null };
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { ok: false, response: jsonResponse(req, 401, { error: "Missing authorization token" }), role: null };
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

    const role = String(
      payload?.app_role || payload?.user_role || payload?.role_name || payload?.role || ""
    ).toLowerCase();

    if (!["admin", "mentor"].includes(role)) {
      return { ok: false, response: jsonResponse(req, 403, { error: "Forbidden" }), role: null };
    }

    return { ok: true, response: null, role };
  } catch {
    return { ok: false, response: jsonResponse(req, 401, { error: "Invalid or expired token" }), role: null };
  }
};

const getTemplateRecord = async (
  supabase: ReturnType<typeof createAdminClient>,
  templateId: keyof typeof DEFAULT_TEMPLATES,
) => {
  const { data: template, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;
  if (template) return template;

  const defaultTemplate = {
    ...DEFAULT_TEMPLATES[templateId],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data: createdTemplate, error: createError } = await supabase
    .from("settings")
    .upsert(defaultTemplate)
    .select("*")
    .single();

  if (createError) throw createError;
  return createdTemplate;
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await verifyToken(req);
    if (!auth.ok) return auth.response;

    const supabase = createAdminClient();

    if (req.method === "GET") {
      const url = new URL(req.url);
      const templateId = url.searchParams.get("templateId") as keyof typeof DEFAULT_TEMPLATES | null;
      if (!templateId || !(templateId in DEFAULT_TEMPLATES)) {
        return jsonResponse(req, 400, { error: "templateId invalid" });
      }

      const template = await getTemplateRecord(supabase, templateId);
      return jsonResponse(req, 200, { success: true, template });
    }

    if (req.method !== "POST") {
      return jsonResponse(req, 405, { error: "Method not allowed" });
    }

    if (auth.role !== "admin") {
      return jsonResponse(req, 403, { error: "Forbidden" });
    }

    const { templateId, subject, body } = await req.json();

    if (!templateId || !(templateId in DEFAULT_TEMPLATES)) {
      return jsonResponse(req, 400, { error: "templateId invalid" });
    }

    const normalizedSubject = normalizeTemplateString(subject, 255);
    const normalizedBody = normalizeTemplateString(body, 20000);

    if (!normalizedSubject || !normalizedBody) {
      return jsonResponse(req, 400, { error: "Subiectul si continutul sunt obligatorii" });
    }

    const payload = {
      id: templateId,
      subject: normalizedSubject,
      body: normalizedBody,
      updatedAt: new Date().toISOString(),
    };

    const { data: template, error } = await supabase
      .from("settings")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return jsonResponse(req, 200, {
      success: true,
      message: "Template actualizat cu succes",
      template,
    });
  } catch (error) {
    console.error("manage-email-templates error", error);
    return jsonResponse(req, 500, {
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});