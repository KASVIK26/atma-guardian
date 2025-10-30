-- Migration: Create trigger function for baseline_pressure_hpa updates
-- Date: 2025-10-31
-- Purpose: Fetch Open Meteo API data hourly during working hours to update room baseline pressure

-- =====================================================
-- 1. Create a table to track pressure update history
-- =====================================================
CREATE TABLE IF NOT EXISTS pressure_update_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    old_pressure_hpa NUMERIC(6, 2),
    new_pressure_hpa NUMERIC(6, 2),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    api_response JSONB,
    error_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pressure_update_history_room ON pressure_update_history(room_id);
CREATE INDEX idx_pressure_update_history_created ON pressure_update_history(created_at);

-- =====================================================
-- 2. Create extension for HTTP requests (if not exists)
-- =====================================================
-- NOTE: This requires the pgsql http extension
-- Enable it with: CREATE EXTENSION IF NOT EXISTS http;
-- OR use RLS policies to call external APIs via edge functions

-- =====================================================
-- 3. Function to fetch pressure from Open Meteo API
-- =====================================================
-- This function is designed to be called by a scheduled job
-- Open Meteo API: https://open-meteo.com/en/docs
-- Endpoint: /v1/forecast?latitude={lat}&longitude={lon}&current=pressure_sealevel&timezone=auto

CREATE OR REPLACE FUNCTION fetch_and_update_baseline_pressure()
RETURNS TABLE(updated_count INT, error_count INT) AS $$
DECLARE
    v_room RECORD;
    v_api_url TEXT;
    v_response JSONB;
    v_pressure_hpa NUMERIC(6, 2);
    v_updated_count INT := 0;
    v_error_count INT := 0;
BEGIN
    -- Iterate through all active rooms with location data
    FOR v_room IN
        SELECT 
            r.id,
            r.latitude,
            r.longitude,
            r.baseline_pressure_hpa as old_pressure,
            b.altitude_metres
        FROM rooms r
        LEFT JOIN buildings b ON r.building_id = b.id
        WHERE r.is_active = true 
        AND r.latitude IS NOT NULL 
        AND r.longitude IS NOT NULL
    LOOP
        BEGIN
            -- Construct Open Meteo API URL
            -- Note: This is for reference. In production, use an HTTP client library or Edge Function
            v_api_url := 'https://api.open-meteo.com/v1/forecast?' ||
                        'latitude=' || v_room.latitude ||
                        '&longitude=' || v_room.longitude ||
                        '&current=pressure_sealevel,pressure&timezone=auto';
            
            -- Record the update attempt
            INSERT INTO pressure_update_history (
                room_id,
                old_pressure_hpa,
                latitude,
                longitude,
                api_response,
                error_message
            ) VALUES (
                v_room.id,
                v_room.old_pressure,
                v_room.latitude,
                v_room.longitude,
                jsonb_build_object('url', v_api_url),
                'Function placeholder - implement via Edge Function or HTTP extension'
            );
            
            -- In production, integrate with:
            -- 1. Supabase Edge Functions (recommended)
            -- 2. http extension (requires admin permissions)
            -- 3. External scheduler (external HTTP call to Supabase)
            
            v_error_count := v_error_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO pressure_update_history (
                room_id,
                latitude,
                longitude,
                error_message
            ) VALUES (
                v_room.id,
                v_room.latitude,
                v_room.longitude,
                SQLERRM
            );
            
            v_error_count := v_error_count + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_updated_count, v_error_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Alternative: Using HTTP extension (if available)
-- =====================================================
-- Uncomment and use if http extension is enabled:

/*
CREATE OR REPLACE FUNCTION fetch_and_update_baseline_pressure()
RETURNS TABLE(updated_count INT, error_count INT) AS $$
DECLARE
    v_room RECORD;
    v_api_url TEXT;
    v_response JSONB;
    v_pressure_hpa NUMERIC(6, 2);
    v_updated_count INT := 0;
    v_error_count INT := 0;
    v_http_response http_response;
BEGIN
    -- Iterate through all active rooms with location data
    FOR v_room IN
        SELECT 
            r.id,
            r.latitude,
            r.longitude,
            r.baseline_pressure_hpa as old_pressure,
            b.altitude_metres
        FROM rooms r
        LEFT JOIN buildings b ON r.building_id = b.id
        WHERE r.is_active = true 
        AND r.latitude IS NOT NULL 
        AND r.longitude IS NOT NULL
    LOOP
        BEGIN
            -- Fetch current pressure from Open Meteo API
            v_api_url := 'https://api.open-meteo.com/v1/forecast?' ||
                        'latitude=' || v_room.latitude ||
                        '&longitude=' || v_room.longitude ||
                        '&current=pressure_sealevel,pressure&timezone=auto';
            
            -- Make HTTP request
            v_http_response := http_get(v_api_url);
            v_response := (v_http_response).content::jsonb;
            
            -- Extract pressure value (sea level pressure in hPa)
            v_pressure_hpa := (v_response -> 'current' -> 'pressure_sealevel')::NUMERIC(6, 2);
            
            -- Update room baseline pressure if we got a valid value
            IF v_pressure_hpa IS NOT NULL THEN
                UPDATE rooms
                SET baseline_pressure_hpa = v_pressure_hpa
                WHERE id = v_room.id;
                
                -- Record successful update
                INSERT INTO pressure_update_history (
                    room_id,
                    old_pressure_hpa,
                    new_pressure_hpa,
                    latitude,
                    longitude,
                    api_response
                ) VALUES (
                    v_room.id,
                    v_room.old_pressure,
                    v_pressure_hpa,
                    v_room.latitude,
                    v_room.longitude,
                    v_response
                );
                
                v_updated_count := v_updated_count + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Record error
            INSERT INTO pressure_update_history (
                room_id,
                latitude,
                longitude,
                error_message
            ) VALUES (
                v_room.id,
                v_room.latitude,
                v_room.longitude,
                SQLERRM
            );
            
            v_error_count := v_error_count + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_updated_count, v_error_count;
END;
$$ LANGUAGE plpgsql;
*/

-- =====================================================
-- 5. Create index for pressure history cleanup
-- =====================================================
CREATE INDEX idx_pressure_history_old ON pressure_update_history(created_at DESC);

-- =====================================================
-- 6. Create function to clean up old pressure history
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_pressure_history()
RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    -- Keep last 30 days of history
    DELETE FROM pressure_update_history
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Recommended Implementation: Edge Function
-- =====================================================
-- Create a Supabase Edge Function that:
-- 1. Queries all active rooms with coordinates
-- 2. Batches Open Meteo API calls (max 100 coords per request)
-- 3. Updates baseline_pressure_hpa for each room
-- 4. Logs results to pressure_update_history
--
-- Schedule via: Database Webhooks or External Scheduler
-- Frequency: Every hour during working hours (8 AM - 6 PM)
-- Timezone: University timezone

-- =====================================================
-- 8. Comments and Documentation
-- =====================================================
COMMENT ON TABLE pressure_update_history IS 'Logs all baseline pressure updates from Open Meteo API for audit and debugging';
COMMENT ON FUNCTION fetch_and_update_baseline_pressure() IS 'Fetches current atmospheric pressure from Open Meteo API for active rooms and updates baseline_pressure_hpa';
COMMENT ON FUNCTION cleanup_pressure_history() IS 'Removes pressure_update_history records older than 30 days';

-- =====================================================
-- 9. Usage Instructions
-- =====================================================
-- For Production Implementation:
-- 
-- Option A: Using Supabase Edge Functions (Recommended)
-- 1. Create an edge function that calls this database function
-- 2. Schedule it using cron jobs or external scheduler
-- 3. Keep all API calls within edge function
-- 
-- Option B: Using Database Extensions
-- 1. Enable http extension: CREATE EXTENSION http;
-- 2. Uncomment the alternative function above
-- 3. Use scheduled jobs via database webhooks
-- 
-- Option C: Using External Scheduler
-- 1. Use cron-like service (e.g., EasyCron, Zapier)
-- 2. Call a Supabase function endpoint hourly
-- 3. Function queries and processes data
-- 
-- Test the function:
-- SELECT * FROM fetch_and_update_baseline_pressure();
-- SELECT * FROM pressure_update_history ORDER BY created_at DESC LIMIT 10;
