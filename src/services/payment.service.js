const prisma = require("../config/db");
const { getDebtOwnedByUser } = require("./debt.service");

async function createPayment(userId, debtId, data) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  const { amount, paidAt, prepaymentChoice } = data;

  if (!amount || amount <= 0) {
    const err = new Error("amount is required and must be greater than 0");
    err.status = 400;
    throw err;
  }

  const effectivePaidAt = paidAt ? new Date(paidAt) : new Date();
  if (isNaN(effectivePaidAt.getTime())) {
    const err = new Error("paidAt must be a valid date");
    err.status = 400;
    throw err;
  }

  const monthlyRepayment = Number(debt.monthlyRepayment);
  const isPrepayment = amount > monthlyRepayment;

  if (isPrepayment && !prepaymentChoice) {
    const err = new Error("This is a prepayment — specify prepaymentChoice as reduce_tenure or reduce_emi");
    err.status = 422;
    throw err;
  }

  if (prepaymentChoice && !["reduce_tenure", "reduce_emi"].includes(prepaymentChoice)) {
    const err = new Error("prepaymentChoice must be reduce_tenure or reduce_emi");
    err.status = 400;
    throw err;
  }

  const dueDateThisCycle = new Date(
    effectivePaidAt.getFullYear(),
    effectivePaidAt.getMonth(),
    debt.dueDay
  );

  let status;
  if (amount < monthlyRepayment) {
    status = "partial";
  } else if (effectivePaidAt > dueDateThisCycle) {
    status = "late";
  } else {
    status = "on_time";
  }

  let penaltyApplied = 0;
  if (status === "late") {
    penaltyApplied =
      debt.penaltyType === "flat"
        ? Number(debt.penaltyValue)
        : (monthlyRepayment * Number(debt.penaltyValue)) / 100;
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        debtId: debt.id,
        amount,
        paidAt: effectivePaidAt,
        status,
        penaltyApplied,
        isPrepayment,
        prepaymentChoice: isPrepayment ? prepaymentChoice : null,
      },
    });

    let updatedDebt = debt;

    if (isPrepayment) {
      const remainingPrincipal = Number(debt.principal) - amount;

      if (prepaymentChoice === "reduce_tenure" && debt.tenureMonths) {
        const newTenure = Math.max(1, Math.ceil(remainingPrincipal / monthlyRepayment));
        updatedDebt = await tx.debt.update({
          where: { id: debt.id },
          data: { tenureMonths: newTenure },
        });
      } else if (prepaymentChoice === "reduce_emi" && debt.tenureMonths) {
        const newMonthly = remainingPrincipal / debt.tenureMonths;
        updatedDebt = await tx.debt.update({
          where: { id: debt.id },
          data: { monthlyRepayment: newMonthly },
        });
      }
    }

    return { payment, debt: updatedDebt };
  });

  return result;
}

async function listPayments(userId, debtId) {
  await getDebtOwnedByUser(userId, debtId);

  return prisma.payment.findMany({
    where: { debtId },
    orderBy: { paidAt: "desc" },
  });
}

module.exports = { createPayment, listPayments };