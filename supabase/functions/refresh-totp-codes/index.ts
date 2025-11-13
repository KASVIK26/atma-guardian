import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Scheduled function to refresh TOTP codes every 5 minutes during working hours
 * Should be triggered by Supabase scheduled functions (cron)
 */

interface TOTPRefreshResult {
  updated_count: number;
  sessions: string[];
  errors: Array<{ session_id: string; error: string }>;
}

/**
 * Generate a random 6-digit code (for dynamic mode)
 */
function generateRandomTOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if current time is within working hours (8 AM - 6 PM)
 */
function isWithinWorkingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  // Working hours: 8 AM to 6 PM
  return hour >= 8 && hour < 18;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if within working hours
    if (!isWithinWorkingHours()) {
      return new Response(
        JSON.stringify({
          message: "Not within working hours - skipping TOTP refresh",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const result: TOTPRefreshResult = {
      updated_count: 0,
      sessions: [],
      errors: [],
    };

    // Fetch all active sessions with dynamic OTP mode
    const { data: activeSessions, error: fetchError } = await supabase
      .from("lecture_sessions")
      .select("id, totp_expires_at, otp_mode")
      .eq("otp_mode", "dynamic")
      .in("session_status", ["scheduled", "active"])
      .lt("totp_expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching sessions:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch sessions",
          details: fetchError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!activeSessions || activeSessions.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No sessions requiring TOTP refresh",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process each session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 1000); // 30 seconds

    for (const session of activeSessions) {
      try {
        // Generate new TOTP code
        const newCode = generateRandomTOTPCode();

        // Update session
        const { error: updateError } = await supabase
          .from("lecture_sessions")
          .update({
            current_totp: newCode,
            totp_generated_at: now.toISOString(),
            totp_expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", session.id);

        if (updateError) {
          result.errors.push({
            session_id: session.id,
            error: updateError.message,
          });
          console.error(`Error updating session ${session.id}:`, updateError);
        } else {
          result.sessions.push(session.id);
          result.updated_count++;

          // Log to history
          await supabase.from("totp_session_history").insert({
            lecture_session_id: session.id,
            totp_code: newCode,
            generated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
          });
        }
      } catch (error) {
        result.errors.push({
          session_id: session.id,
          error: String(error),
        });
      }
    }

    // Log refresh operation
    console.log(
      `TOTP Refresh completed: ${result.updated_count} sessions updated, ${result.errors.length} errors`
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in refresh-totp-codes:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
