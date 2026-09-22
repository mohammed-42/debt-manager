-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "current_outstanding" DECIMAL(12,2),
ADD COLUMN     "minimum_payment" DECIMAL(12,2),
ALTER COLUMN "principal" DROP NOT NULL,
ALTER COLUMN "monthly_repayment" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "penalty_applied" SET DATA TYPE DECIMAL(65,30);
