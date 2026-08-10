ALTER TABLE "student_progress_daily_entries"
  ADD COLUMN "exam_set_level" TEXT;

UPDATE "student_progress_daily_entries"
SET "exam_set_level" = "difficulty_level"
WHERE "exam_set_level" IS NULL
  AND "difficulty_level" IN ('starters', 'movers', 'flyers', 'ket', 'pet');

-- Expand-only release: old Vercel instances may still write Cambridge values to
-- difficulty_level during a rolling deployment. Cleanup and CHECK constraints
-- belong in a later contract migration after the new code has fully soaked.
