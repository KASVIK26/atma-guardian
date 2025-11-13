import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AttendanceRequest {
  lecture_session_id: string;
  totp_code: string;
  student_id: string;
  ip_address?: string;
  device_info?: string;
}

interface AttendanceResponse {
  success: boolean;
  message: string;
  attendance_id?: string;
  code_used?: boolean;
  remaining_attempts?: number;
}

/**
 * Record Attendance with TOTP Validation
 * 
 * This function validates a TOTP code and records attendance for a student
 * in a lecture session. The code must:
 * 1. Match the current valid TOTP code for the session
 * 2. Not be expired
 * 3. Not have been used already (optional check)
 */
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
      return new Response(
        JSON.stringify({
          success: false,
          message: "Method not allowed",
        }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      lecture_session_id,
      totp_code,
      student_id,
      ip_address,
      device_info,
    } = (await req.json()) as AttendanceRequest;

    // Validate inputs
    if (!lecture_session_id || !totp_code || !student_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields: lecture_session_id, totp_code, student_id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("📋 Processing attendance request:", {
      session_id: lecture_session_id,
      student_id,
      code_length: totp_code.length,
    });

    // 1. Fetch the lecture session
    const { data: session, error: sessionError } = await supabase
      .from("lecture_sessions")
      .select("id, current_totp, totp_expires_at, session_status")
      .eq("id", lecture_session_id)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Lecture session not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Session found:", {
      id: session.id,
      status: session.session_status,
    });

    // 2. Check if session is active or scheduled (not completed/cancelled)
    if (!["active", "scheduled"].includes(session.session_status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Cannot record attendance. Session is ${session.session_status}.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Validate TOTP code
    if (!session.current_totp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No TOTP code available for this session",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Check if code has expired
    const now = new Date();
    const expiresAt = new Date(session.totp_expires_at);

    if (now > expiresAt) {
      console.error("❌ TOTP code has expired");
      return new Response(
        JSON.stringify({
          success: false,
          message: "TOTP code has expired. Please use the current code.",
          code_expired: true,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Validate code (case-insensitive, trim whitespace)
    const submittedCode = (totp_code || "").trim();
    const expectedCode = (session.current_totp || "").trim();

    if (submittedCode !== expectedCode) {
      console.error("❌ Invalid TOTP code:", {
        submitted: submittedCode,
        expected: expectedCode,
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid TOTP code",
          code_correct: false,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ TOTP code validated successfully");

    // 6. Check if student already has attendance record for this session
    const { data: existingAttendance } = await supabase
      .from("totp_attendance_log")
      .select("id")
      .eq("session_id", lecture_session_id)
      .eq("student_id", student_id)
      .single();

    if (existingAttendance) {
      console.warn("⚠️  Student already marked attendance");
      return new Response(
        JSON.stringify({
          success: false,
          message: "You have already marked your attendance for this session",
          already_recorded: true,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Record attendance
    const { data: attendanceRecord, error: recordError } = await supabase
      .from("totp_attendance_log")
      .insert({
        session_id: lecture_session_id,
        student_id,
        ip_address: ip_address || null,
        device_info: device_info || null,
        marked_at: now.toISOString(),
      })
      .select()
      .single();

    if (recordError) {
      console.error("❌ Failed to record attendance:", recordError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to record attendance",
          error_details: recordError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Attendance recorded successfully:", attendanceRecord.id);

    // 8. Update TOTP code as "used" in totp_session_history if available
    try {
      const { error: updateError } = await supabase
        .from("totp_session_history")
        .update({
          is_used: true,
          used_by: student_id,
          used_at: now.toISOString(),
          usage_count: 1,
        })
        .eq("session_id", lecture_session_id)
        .eq("totp_code", expectedCode)
        .eq("is_active", true);

      if (updateError) {
        console.warn("⚠️  Could not update TOTP history:", updateError);
        // Don't fail if history update fails
      }
    } catch (err) {
      console.warn("⚠️  Error updating TOTP history:", err);
      // Continue - this is non-critical
    }

    // 9. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "✅ Attendance recorded successfully!",
        attendance_id: attendanceRecord.id,
        code_used: true,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error processing attendance:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while processing attendance",
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
