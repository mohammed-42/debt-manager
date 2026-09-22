-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('flat', 'percentage');

-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "penalty_type" "PenaltyType" NOT NULL DEFAULT 'flat',
ADD COLUMN     "penalty_value" DECIMAL(10,2) NOT NULL DEFAULT 0;
