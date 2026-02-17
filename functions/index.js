const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

// Define the Resend API key as a secret (set via: firebase functions:secrets:set RESEND_API_KEY)
const resendApiKey = defineSecret("RESEND_API_KEY");

/**
 * Send a single email to a lead
 * POST /sendEmail
 * Body: { leadId: string, mentorId: string }
 */
exports.sendEmail = onRequest(
  { 
    cors: true,
    secrets: [resendApiKey],
    region: "europe-west1"
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { leadId, mentorId } = req.body;

    if (!leadId || !mentorId) {
      return res.status(400).json({ error: "leadId and mentorId are required" });
    }

    try {
      // Fetch lead data
      const leadDoc = await db.collection("leaduri").doc(leadId).get();
      if (!leadDoc.exists) {
        return res.status(404).json({ error: "Lead not found" });
      }
      const lead = { id: leadDoc.id, ...leadDoc.data() };

      // Fetch mentor data
      const mentorDoc = await db.collection("mentori").doc(mentorId).get();
      if (!mentorDoc.exists) {
        return res.status(404).json({ error: "Mentor not found" });
      }
      const mentor = { id: mentorDoc.id, ...mentorDoc.data() };

      // Fetch email template
      const templateDoc = await db.collection("settings").doc("emailTemplate").get();
      if (!templateDoc.exists) {
        return res.status(404).json({ error: "Email template not found" });
      }
      const template = templateDoc.data();

      // Check webinar date
      if (!mentor.ultimulOneToTwenty) {
        return res.status(400).json({ error: "Mentor has no webinar date set" });
      }

      // Format the webinar date
      const webinarDate = mentor.ultimulOneToTwenty.toDate();
      const formattedDate = webinarDate.toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Build confirmation link
      // Use the origin from the request or a default
      const origin = req.headers.origin || req.headers.referer || "https://profx-mentori.web.app";
      const confirmationLink = `${origin.replace(/\/$/, "")}/confirm/${lead.id}`;

      // Replace placeholders in the template
      const replacements = {
        "{{nume}}": lead.nume || "",
        "{{mentorName}}": mentor.nume || "",
        "{{webinarDate}}": formattedDate,
        "{{confirmationLink}}": confirmationLink,
        "{{telefon}}": lead.telefon || "",
        "{{email}}": lead.email || "",
      };

      let subject = template.subject || "Invitatie Webinar 1:20 - ProFX";
      let body = template.body || "";

      Object.keys(replacements).forEach((placeholder) => {
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

      // Send email via Resend
      const resend = new Resend(resendApiKey.value());

      const emailResult = await resend.emails.send({
        from: "ProFX Mentori <onboarding@resend.dev>",
        to: [lead.email],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
              <h2 style="color: #3b82f6; margin: 0;">ProFX Mentori</h2>
            </div>
            <div style="padding: 20px 0; line-height: 1.8; font-size: 14px;">
              ${htmlBody}
            </div>
            <div style="text-align: center; padding: 15px; border-top: 1px solid #333; font-size: 12px; color: #888;">
              <p>Acest email a fost trimis de ProFX Mentori</p>
            </div>
          </div>
        `,
        text: body,
      });

      console.log(`✅ Email sent to ${lead.email} (Lead: ${lead.nume}, Mentor: ${mentor.nume})`, emailResult);

      return res.status(200).json({
        success: true,
        message: `Email sent successfully to ${lead.email}`,
        emailId: emailResult.data?.id,
      });
    } catch (error) {
      console.error("❌ Error sending email:", error);
      return res.status(500).json({
        error: "Failed to send email",
        details: error.message,
      });
    }
  }
);

/**
 * Send bulk emails to all active leads of a mentor
 * POST /sendBulkEmails
 * Body: { mentorId: string }
 */
exports.sendBulkEmails = onRequest(
  {
    cors: true,
    secrets: [resendApiKey],
    region: "europe-west1",
    timeoutSeconds: 120,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { mentorId } = req.body;

    if (!mentorId) {
      return res.status(400).json({ error: "mentorId is required" });
    }

    try {
      // Fetch mentor data
      const mentorDoc = await db.collection("mentori").doc(mentorId).get();
      if (!mentorDoc.exists) {
        return res.status(404).json({ error: "Mentor not found" });
      }
      const mentor = { id: mentorDoc.id, ...mentorDoc.data() };

      if (!mentor.ultimulOneToTwenty) {
        return res.status(400).json({ error: "Mentor has no webinar date set" });
      }

      // Fetch email template
      const templateDoc = await db.collection("settings").doc("emailTemplate").get();
      if (!templateDoc.exists) {
        return res.status(404).json({ error: "Email template not found" });
      }
      const template = templateDoc.data();

      // Fetch all active leads for this mentor
      const leadsSnapshot = await db
        .collection("leaduri")
        .where("mentorAlocat", "==", mentorId)
        .get();

      const leads = leadsSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.status === "alocat" || l.status === "confirmat");

      if (leads.length === 0) {
        return res.status(400).json({ error: "No active leads found for this mentor" });
      }

      // Format the webinar date
      const webinarDate = mentor.ultimulOneToTwenty.toDate();
      const formattedDate = webinarDate.toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const origin = req.headers.origin || req.headers.referer || "https://profx-mentori.web.app";
      const resend = new Resend(resendApiKey.value());

      const results = { sent: 0, failed: 0, errors: [] };
      const TIMEOUT_6H = 6 * 60 * 60 * 1000;

      for (const lead of leads) {
        try {
          const confirmationLink = `${origin.replace(/\/$/, "")}/confirm/${lead.id}`;

          const replacements = {
            "{{nume}}": lead.nume || "",
            "{{mentorName}}": mentor.nume || "",
            "{{webinarDate}}": formattedDate,
            "{{confirmationLink}}": confirmationLink,
            "{{telefon}}": lead.telefon || "",
            "{{email}}": lead.email || "",
          };

          let subject = template.subject || "Invitatie Webinar 1:20 - ProFX";
          let body = template.body || "";

          Object.keys(replacements).forEach((placeholder) => {
            const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g");
            subject = subject.replace(regex, replacements[placeholder]);
            body = body.replace(regex, replacements[placeholder]);
          });

          const htmlBody = body
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")
            .replace(
              /(https?:\/\/[^\s<]+)/g,
              '<a href="$1" style="color: #3b82f6;">$1</a>'
            );

          await resend.emails.send({
            from: "ProFX Mentori <onboarding@resend.dev>",
            to: [lead.email],
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
                  <h2 style="color: #3b82f6; margin: 0;">ProFX Mentori</h2>
                </div>
                <div style="padding: 20px 0; line-height: 1.8; font-size: 14px;">
                  ${htmlBody}
                </div>
                <div style="text-align: center; padding: 15px; border-top: 1px solid #333; font-size: 12px; color: #888;">
                  <p>Acest email a fost trimis de ProFX Mentori</p>
                </div>
              </div>
            `,
            text: body,
          });

          // Update lead in Firestore - mark as email sent
          const now = admin.firestore.Timestamp.now();
          const timeoutDate = admin.firestore.Timestamp.fromDate(
            new Date(now.toDate().getTime() + TIMEOUT_6H)
          );

          await db.collection("leaduri").doc(lead.id).update({
            dataTimeout: timeoutDate,
            emailTrimis: true,
            dataTrimiereEmail: now,
            confirmationToken: lead.id,
          });

          results.sent++;
          console.log(`✅ Email sent to ${lead.email} (${lead.nume})`);

          // Small delay between emails to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (emailError) {
          results.failed++;
          results.errors.push({
            lead: lead.nume,
            email: lead.email,
            error: emailError.message,
          });
          console.error(`❌ Failed to send to ${lead.email}:`, emailError.message);
        }
      }

      console.log(`📧 Bulk email complete: ${results.sent} sent, ${results.failed} failed`);

      return res.status(200).json({
        success: true,
        message: `${results.sent} emails sent, ${results.failed} failed`,
        results,
      });
    } catch (error) {
      console.error("❌ Error in bulk email:", error);
      return res.status(500).json({
        error: "Failed to send bulk emails",
        details: error.message,
      });
    }
  }
);
