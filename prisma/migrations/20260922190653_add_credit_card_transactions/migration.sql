-- CreateTable
CREATE TABLE "credit_card_transactions" (
    "id" UUID NOT NULL,
    "debt_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_card_transactions_debt_id_idx" ON "credit_card_transactions"("debt_id");

-- CreateIndex
CREATE INDEX "credit_card_transactions_transaction_date_idx" ON "credit_card_transactions"("transaction_date");

-- AddForeignKey
ALTER TABLE "credit_card_transactions" ADD CONSTRAINT "credit_card_transactions_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
