-- Add batch column to student_enrollment table
-- Batch format: A1, A2, B1, B2, etc.

ALTER TABLE student_enrollments
ADD COLUMN batch VARCHAR(10) DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN student_enrollments.batch IS 'Batch identifier like A1, A2, B1, B2 for organizing students into smaller groups within a section';

-- Create index for batch lookups
CREATE INDEX idx_student_enrollments_batch ON student_enrollments(section_id, batch);
