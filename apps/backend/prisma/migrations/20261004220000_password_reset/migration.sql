ALTER TABLE "user" ADD COLUMN "passwordVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "passwordResetHash" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "user_passwordResetHash_key" ON "user"("passwordResetHash");
