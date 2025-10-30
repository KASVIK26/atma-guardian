-- Migration: Add PostGIS and Geofence Support for Buildings and Rooms
-- Created: 2025-10-30
-- Purpose: Enable PostGIS geometry column and JSONB geofence storage for spatial queries

-- Step 1: Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Add geofence columns to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS geofence_geojson jsonb;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS geofence_geom geometry(Polygon, 4326);

-- Step 3: Add geofence columns to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS geofence_geojson jsonb;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS geofence_geom geometry(Polygon, 4326);

-- Step 4: Create trigger function to automatically convert GeoJSON to geometry for buildings
CREATE OR REPLACE FUNCTION buildings_geojson_to_geom()
RETURNS trigger AS $$
BEGIN
  IF NEW.geofence_geojson IS NOT NULL THEN
    BEGIN
      NEW.geofence_geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geofence_geojson::text), 4326);
    EXCEPTION WHEN OTHERS THEN
      -- If conversion fails, set geometry to NULL
      NEW.geofence_geom := NULL;
    END;
  ELSE
    NEW.geofence_geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger function to automatically convert GeoJSON to geometry for rooms
CREATE OR REPLACE FUNCTION rooms_geojson_to_geom()
RETURNS trigger AS $$
BEGIN
  IF NEW.geofence_geojson IS NOT NULL THEN
    BEGIN
      NEW.geofence_geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.geofence_geojson::text), 4326);
    EXCEPTION WHEN OTHERS THEN
      -- If conversion fails, set geometry to NULL
      NEW.geofence_geom := NULL;
    END;
  ELSE
    NEW.geofence_geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create triggers to call the functions on INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_buildings_geojson_geom ON buildings;
CREATE TRIGGER trg_buildings_geojson_geom
BEFORE INSERT OR UPDATE ON buildings
FOR EACH ROW EXECUTE FUNCTION buildings_geojson_to_geom();

DROP TRIGGER IF EXISTS trg_rooms_geojson_geom ON rooms;
CREATE TRIGGER trg_rooms_geojson_geom
BEFORE INSERT OR UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION rooms_geojson_to_geom();

-- Step 7: Create spatial indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_buildings_geofence_geom ON buildings USING GIST(geofence_geom);
CREATE INDEX IF NOT EXISTS idx_rooms_geofence_geom ON rooms USING GIST(geofence_geom);

-- Step 8: Add helper function to check if a point is within a building's geofence
CREATE OR REPLACE FUNCTION is_point_in_building_geofence(point_lat FLOAT, point_lng FLOAT, building_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM buildings 
    WHERE id = building_id 
    AND geofence_geom IS NOT NULL
    AND ST_Contains(geofence_geom, ST_SetSRID(ST_Point(point_lng, point_lat), 4326))
  );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add helper function to check if a point is within a room's geofence
CREATE OR REPLACE FUNCTION is_point_in_room_geofence(point_lat FLOAT, point_lng FLOAT, room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rooms 
    WHERE id = room_id 
    AND geofence_geom IS NOT NULL
    AND ST_Contains(geofence_geom, ST_SetSRID(ST_Point(point_lng, point_lat), 4326))
  );
END;
$$ LANGUAGE plpgsql;

-- Step 10: Update RLS policies to allow geofence columns to be read/written
-- (Assuming default RLS policies are in place; adjust based on your security model)

COMMENT ON COLUMN buildings.geofence_geojson IS 'GeoJSON polygon for geofencing - stored as JSONB for client-side use';
COMMENT ON COLUMN buildings.geofence_geom IS 'PostGIS geometry (Polygon) for spatial queries - auto-synced from geofence_geojson';
COMMENT ON COLUMN rooms.geofence_geojson IS 'GeoJSON polygon for geofencing - stored as JSONB for client-side use';
COMMENT ON COLUMN rooms.geofence_geom IS 'PostGIS geometry (Polygon) for spatial queries - auto-synced from geofence_geojson';
