-- Migration: Add support for multiple instructors and batches in timetables
-- Date: 2025-10-31
-- Purpose: Enable timetable cells to support multiple instructors and multiple batches

-- Add new columns for storing arrays of IDs
ALTER TABLE timetables
ADD COLUMN instructor_ids UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN batches TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index on instructor_ids for faster lookups
CREATE INDEX idx_timetables_instructor_ids ON timetables USING gin(instructor_ids);

-- Create index on batches for faster lookups
CREATE INDEX idx_timetables_batches ON timetables USING gin(batches);

-- Add comment documenting the new columns
COMMENT ON COLUMN timetables.instructor_ids IS 'Array of instructor IDs who teach this class (allows multiple instructors)';
COMMENT ON COLUMN timetables.batches IS 'Array of batch identifiers for this class (allows multi-batch scheduling)';

-- Migration note: The original instructor_id column should be retained for backward compatibility
-- If needed, populate instructor_ids from existing instructor_id values:
-- UPDATE timetables SET instructor_ids = ARRAY[instructor_id] WHERE instructor_id IS NOT NULL;
