ALTER TABLE "student_progress_daily_entries"
  ADD COLUMN "difficulty_level" TEXT,
  ADD COLUMN "entry_label" TEXT,
  ADD COLUMN "graded_by_teacher_id" TEXT;

ALTER TABLE "student_progress_daily_entries"
  ADD CONSTRAINT "student_progress_daily_entries_difficulty_level_check"
  CHECK (
    "difficulty_level" IS NULL OR
    "difficulty_level" IN ('starters', 'movers', 'flyers', 'ket', 'pet')
  );

ALTER TABLE "student_progress_daily_entries"
  ADD CONSTRAINT "student_progress_daily_entries_entry_label_length_check"
  CHECK ("entry_label" IS NULL OR char_length("entry_label") <= 200);

CREATE INDEX "student_progress_daily_entries_graded_by_teacher_id_idx"
  ON "student_progress_daily_entries"("graded_by_teacher_id");

ALTER TABLE "student_progress_daily_entries"
  ADD CONSTRAINT "student_progress_daily_entries_graded_by_teacher_id_fkey"
  FOREIGN KEY ("graded_by_teacher_id") REFERENCES "teachers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
