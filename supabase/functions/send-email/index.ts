/* eslint-disable no-undef */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
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
    const { leadId, mentorId } = await req.json();

    if (!leadId || !mentorId) {
      return new Response(
        JSON.stringify({ error: "leadId and mentorId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leaduri")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found", details: leadError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch mentor data
    const { data: mentor, error: mentorError } = await supabase
      .from("mentori")
      .select("*")
      .eq("id", mentorId)
      .single();

    if (mentorError || !mentor) {
      return new Response(
        JSON.stringify({ error: "Mentor not found", details: mentorError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from("settings")
      .select("*")
      .eq("id", "emailTemplate")
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Email template not found", details: templateError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check webinar date
    if (!mentor.ultimulOneToTwenty) {
      return new Response(
        JSON.stringify({ error: "Mentor has no webinar date set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the webinar date
    const webinarDate = new Date(mentor.ultimulOneToTwenty);
    const formattedDate = webinarDate.toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Bucharest"
    });

    // Build confirmation link
    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://profx-mentori.web.app";
    const confirmationLink = `${origin.replace(/\/$/, "")}/confirm/${lead.id}`;

    // Replace placeholders in the template
const replacements: Record<string, string> = {
          "{{nume}}": lead.nume || "",
          "{{mentorName}}": mentor.nume || "",
          "{{webinarDate}}": formattedDate,
          "{{confirmationLink}}": confirmationLink,
          "{{telefon}}": lead.telefon || "",
          "{{email}}": lead.email || "",
        };

        let subject = template.subject || "Invitatie Webinar 1:20 - ProFX";
        let body = template.body || "";

        Object.keys(replacements).forEach((placeholder: string) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g");
      subject = subject.replace(regex, replacements[placeholder]);
      body = body.replace(regex, replacements[placeholder]);
    });

    // Convert plain text body to HTML (preserve line breaks)
    const htmlBody = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color: #3b82f6;">$1</a>'
      );

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ProFX Mentori <noreply@webinar.profx.ro>",
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
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">ProFX Mentori</h1>
                <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Programul tău de mentorat trading</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px 25px; line-height: 1.8; font-size: 15px; color: #333333;">
                ${htmlBody}
              </div>
              
              <!-- Footer -->
              <div style="padding: 20px 25px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;">
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #666; text-align: center;">
                  <strong>ProFX Trading</strong> | Email trimis către ${lead.email}
                </p>
                <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                  Ai primit acest email deoarece te-ai înscris pentru programul nostru de mentorat 1:20.
                  <br>
                  © ${new Date().getFullYear()} ProFX. Toate drepturile rezervate.
                </p>
                <div style="text-align: center; margin-top: 15px;">
                  <a href="https://profx.ro" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Website</a>
                  <span style="color: #ddd;">|</span>
                  <a href="mailto:support@profx.ro" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Contact</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: body,
        tags: [
          { name: "category", value: "webinar_invitation" },
          { name: "mentor", value: mentor.nume || "unknown" }
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await resendResponse.json();

    // Update lead in database
    const now = new Date().toISOString();
    const TIMEOUT_6H = 6 * 60 * 60 * 1000;
    const timeoutDate = new Date(Date.now() + TIMEOUT_6H).toISOString();

    await supabase
      .from("leaduri")
      .update({
        dataTimeout: timeoutDate,
        emailTrimis: true,
        dataTrimiereEmail: now,
        confirmationToken: lead.id,
      })
      .eq("id", lead.id);

    console.log(`✅ Email sent to ${lead.email} (Lead: ${lead.nume}, Mentor: ${mentor.nume})`, emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${lead.email}`,
        emailId: emailResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
