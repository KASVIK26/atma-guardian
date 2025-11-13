import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * TOTP (Time-based One-Time Password) Generation Function
 * Implements RFC 6238 standard with HMAC-SHA1
 */

// Import HMAC-SHA1 from std library
import { hmac } from "https://deno.land/std@0.141.0/hash/mod.ts";

/**
 * Generate a 6-digit TOTP code using HMAC-SHA1
 */
function generateTOTPCode(secret: string, time: number = Math.floor(Date.now() / 1000)): string {
  // Calculate time step (30-second intervals)
  const timeStep = Math.floor(time / 30);
  
  // Convert time step to 8-byte big-endian integer
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt(timeStep), false);
  const timeBytes = new Uint8Array(buffer);

  // Decode base32 secret to bytes
  const secretBytes = decodeBase32(secret);

  // Generate HMAC-SHA1
  const hash = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      ),
      timeBytes
    )
  );

  // Extract dynamic binary code (DBC) from hash
  const offset = hash[hash.length - 1] & 0x0f;
  const dbc = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  );

  // Generate 6-digit code
  const code = (dbc % 1000000).toString().padStart(6, "0");
  return code;
}

/**
 * Decode base32 string to bytes
 */
function decodeBase32(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits: number[] = [];

  for (const char of input.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 character");
    bits.push(...index.toString(2).padStart(5, "0").split("").map(Number));
  }

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8).join("").padEnd(8, "0");
    bytes.push(parseInt(byte, 2));
  }

  return new Uint8Array(bytes);
}

/**
 * Generate a random base32 secret
 */
function generateRandomSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));

  for (const byte of randomBytes) {
    secret += alphabet[byte % 32];
  }

  return secret;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { lecture_session_id, totp_secret, mode } = await req.json();

    if (!lecture_session_id) {
      return new Response(
        JSON.stringify({ error: "lecture_session_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch lecture session
    const { data: sessionData, error: fetchError } = await supabase
      .from("lecture_sessions")
      .select("*")
      .eq("id", lecture_session_id)
      .single();

    if (fetchError || !sessionData) {
      return new Response(
        JSON.stringify({ error: "Lecture session not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate or use provided TOTP secret
    let secret = totp_secret || sessionData.totp_secret;
    if (!secret) {
      secret = generateRandomSecret();
    }

    // Generate TOTP code
    const totpCode = await generateTOTPCode(secret);
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 30 * 1000); // Expires in 30 seconds

    // Update lecture session with new TOTP code
    const { error: updateError } = await supabase
      .from("lecture_sessions")
      .update({
        totp_secret: secret,
        current_totp: totpCode,
        totp_generated_at: generatedAt.toISOString(),
        totp_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lecture_session_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update TOTP code" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log to TOTP history
    await supabase.from("totp_session_history").insert({
      lecture_session_id,
      totp_code: totpCode,
      generated_at: generatedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        totp_code: totpCode,
        generated_at: generatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        refresh_interval: 30,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
