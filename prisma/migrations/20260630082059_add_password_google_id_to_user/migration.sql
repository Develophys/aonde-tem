-- AlterTable
ALTER TABLE "users" ADD COLUMN "password" TEXT,
ADD COLUMN "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
