import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  quote_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Authenticate the user calling this Edge function
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized caller" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SendEmailRequest = await req.json();
    const { quote_id } = body;

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: "Missing quote_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for secure DB mutations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch quote details
    const { data: quote, error: quoteError } = await adminClient
      .from("quotes")
      .select("*, quote_recipients(*)")
      .eq("id", quote_id)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: `Quote not found: ${quoteError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent duplicate sending if already successfully sent
    if (quote.email_status === "SENT") {
      return new Response(
        JSON.stringify({
          error: "Quote email has already been dispatched. Duplicate sending prevented.",
          email_status: "SENT",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark quote as PENDING
    await adminClient
      .from("quotes")
      .update({ email_status: "QUEUED", quote_lifecycle: "DISPATCHED" })
      .eq("id", quote_id);

    // 2. Check for configured Email Provider Credentials
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "quotes@windowcompanies.com";

    // If NO provider is configured:
    if (!resendApiKey && !sendgridApiKey) {
      // Record FAILED attempt in audit log
      const recipients = quote.quote_recipients || [];
      for (const rec of recipients) {
        await adminClient.from("quote_email_attempts").insert({
          quote_id: quote.id,
          recipient_id: rec.id,
          attempt_number: 1,
          delivery_status: "FAILED",
          error_message: "No email provider configured (Missing RESEND_API_KEY or SENDGRID_API_KEY). Simulation prohibited.",
        });

        await adminClient
          .from("quote_recipients")
          .update({ delivery_status: "FAILED", error_message: "No email provider configured" })
          .eq("id", rec.id);
      }

      // Revert status to FAILED so user can retry later once configured
      await adminClient
        .from("quotes")
        .update({ email_status: "FAILED" })
        .eq("id", quote_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "No email provider configured on the server. Email not sent. Quote saved as FAILED for retry.",
          email_status: "FAILED",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Dispatch via configured provider (Resend or SendGrid)
    const recipientEmails = (quote.quote_recipients || []).map((r: { original_email: string }) => r.original_email);
    let dispatchSuccess = false;
    let providerMessageId = "";
    let providerError = "";

    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: recipientEmails,
          subject: quote.email_subject,
          html: quote.email_body_html,
          text: quote.email_body_text || undefined,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        dispatchSuccess = true;
        providerMessageId = resData.id || "resend-ok";
      } else {
        providerError = resData.message || JSON.stringify(resData);
      }
    }

    // 4. Update status according to provider response
    if (dispatchSuccess) {
      const now = new Date().toISOString();
      await adminClient
        .from("quotes")
        .update({
          email_status: "SENT",
          sent_at: now,
          quote_lifecycle: "DISPATCHED",
        })
        .eq("id", quote_id);

      for (const rec of quote.quote_recipients || []) {
        await adminClient
          .from("quote_recipients")
          .update({ delivery_status: "SENT", sent_at: now })
          .eq("id", rec.id);

        await adminClient.from("quote_email_attempts").insert({
          quote_id: quote.id,
          recipient_id: rec.id,
          attempt_number: 1,
          delivery_status: "SENT",
          provider_message_id: providerMessageId,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email dispatched successfully",
          email_status: "SENT",
          provider_message_id: providerMessageId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await adminClient
        .from("quotes")
        .update({ email_status: "FAILED" })
        .eq("id", quote_id);

      for (const rec of quote.quote_recipients || []) {
        await adminClient
          .from("quote_recipients")
          .update({ delivery_status: "FAILED", error_message: providerError })
          .eq("id", rec.id);

        await adminClient.from("quote_email_attempts").insert({
          quote_id: quote.id,
          recipient_id: rec.id,
          attempt_number: 1,
          delivery_status: "FAILED",
          error_message: providerError,
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Provider dispatch failed: ${providerError}`,
          email_status: "FAILED",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `Internal error: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

