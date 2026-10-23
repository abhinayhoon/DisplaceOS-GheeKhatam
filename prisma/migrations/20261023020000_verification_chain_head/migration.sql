ALTER TABLE "TriageWeights"
ADD COLUMN "verificationHead" TEXT NOT NULL DEFAULT 'GENESIS';

UPDATE "TriageWeights"
SET "verificationHead" = COALESCE(
  (SELECT "hash" FROM "VerificationLog" ORDER BY "createdAt" DESC LIMIT 1),
  'GENESIS'
);
