ALTER TABLE "student_progress_daily_entries"
  DROP CONSTRAINT IF EXISTS "student_progress_daily_entries_difficulty_level_check";

ALTER TABLE "student_progress_daily_entries"
  ADD CONSTRAINT "student_progress_daily_entries_difficulty_level_check"
  CHECK (
    "difficulty_level" IS NULL OR
    "difficulty_level" IN (
      'starters', 'movers', 'flyers', 'ket', 'pet',
      'easy', 'medium', 'hard'
    )
  );

-- Rolling-deployment compatibility: legacy instances may still write Cambridge
-- levels here. A later contract migration can restrict this column after soak.
