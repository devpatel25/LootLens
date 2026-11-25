-- A code no one has checked yet has no check time. Existing rows keep theirs.
ALTER TABLE "Code" ALTER COLUMN "lastCheckedAt" DROP NOT NULL;
