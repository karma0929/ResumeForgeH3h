ALTER TABLE "Resume"
  ADD COLUMN "intakeMode" TEXT NOT NULL DEFAULT 'quick',
  ADD COLUMN "profileData" JSONB,
  ADD COLUMN "profileCompleteness" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "JobDescription"
  ADD COLUMN "briefData" JSONB,
  ADD COLUMN "briefCompleteness" INTEGER NOT NULL DEFAULT 0;
