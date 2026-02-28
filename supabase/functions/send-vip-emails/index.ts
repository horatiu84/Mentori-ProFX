/* eslint-disable no-undef */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.9.6";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AUTH_JWT_SECRET = Deno.env.get("AUTH_JWT_SECRET") || Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");

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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch the VIP email template
    const { data: template, error: templateError } = await supabase
      .from("settings")
      .select("*")
      .eq("id", "vipEmailTemplate")
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "VIP email template not found", details: templateError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all absolvenți (complet_3_sesiuni) with an email address
    const { data: leads, error: leadsError } = await supabase
      .from("leaduri")
      .select("*")
      .eq("status", "complet_3_sesiuni");

    if (leadsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch absolvenți", details: leadsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validLeads = (leads || []).filter((l: any) => l.email && l.email.includes("@"));

    if (validLeads.length === 0) {
      return new Response(
        JSON.stringify({ error: "No absolvenți with email addresses found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { sent: 0, failed: 0, errors: [] as Array<{ lead: string; email: string; error: string }> };
    const RATE_LIMIT_DELAY = 600;
    const MAX_RETRIES = 3;

    const sendEmailWithRetry = async (emailPayload: any, retries = MAX_RETRIES): Promise<Response> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailPayload),
          });

          if (response.status === 429 && attempt < retries) {
            const retryAfter = response.headers.get("retry-after");
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          return response;
        } catch (err) {
          if (attempt === retries) throw err;
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      throw new Error("Max retries exceeded");
    };

    for (const lead of validLeads) {
      try {
        const replacements: Record<string, string> = {
          "{{nume}}": lead.nume || "",
        };

        let subject = template.subject || "Ofertă VIP Exclusivă – ProFX Premium";
        let body = template.body || "";

        Object.keys(replacements).forEach((placeholder: string) => {
          const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g");
          subject = subject.replace(regex, replacements[placeholder]);
          body = body.replace(regex, replacements[placeholder]);
        });

        const htmlBody = body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")
          .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #3b82f6;">$1</a>');

        const emailPayload = {
          from: "ProFX Academy <noreply@webinar.profx.ro>",
          to: [lead.email],
          reply_to: "support@profx.ro",
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html lang="ro">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%); border-radius: 12px 12px 0 0;">
                  <p style="color: #fef3c7; font-size: 28px; margin: 0 0 6px 0;">💎</p>
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">ProFX Academy</h1>
                  <p style="color: #fde68a; margin: 6px 0 0 0; font-size: 14px; font-weight: 600;">Program VIP Exclusiv</p>
                </div>
                <!-- Content -->
                <div style="padding: 32px 28px; line-height: 1.9; font-size: 15px; color: #1f2937;">
                  ${htmlBody}
                </div>
                <!-- Footer -->
                <div style="padding: 20px 25px; background-color: #fffbeb; border-top: 2px solid #fde68a; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0 0 8px 0; font-size: 13px; color: #92400e; text-align: center; font-weight: 600;">
                    ProFX Academy – Programul VIP
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #b45309; text-align: center;">
                    Email trimis către ${lead.email} | © ${new Date().getFullYear()} ProFX. Toate drepturile rezervate.
                  </p>
                  <div style="text-align: center; margin-top: 12px;">
                    <a href="https://profx.ro" style="color: #d97706; text-decoration: none; font-size: 12px; margin: 0 10px;">Website</a>
                    <span style="color: #fde68a;">|</span>
                    <a href="mailto:support@profx.ro" style="color: #d97706; text-decoration: none; font-size: 12px; margin: 0 10px;">Contact</a>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
          text: body,
          tags: [
            { name: "category", value: "vip_offer" },
          ],
        };

        const resendResponse = await sendEmailWithRetry(emailPayload);

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        results.sent++;
        console.log(`✅ VIP email sent to ${lead.email} (${lead.nume})`);

        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (emailError) {
        results.failed++;
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        results.errors.push({ lead: lead.nume, email: lead.email, error: errorMessage });
        console.error(`❌ Failed VIP email to ${lead.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.sent} emailuri VIP trimise, ${results.failed} eșuate`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Failed to send VIP emails", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
