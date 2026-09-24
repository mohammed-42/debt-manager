
const prisma = require("../config/db");
const { getDebtOwnedByUser } = require("./debt.service");

async function createPayment(userId, debtId, data) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  const { amount, paidAt, prepaymentChoice } = data;

  
  if (
    amount === undefined ||
    amount === null ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    const err = new Error(
      "amount is required and must be greater than 0"
    );
    err.status = 400;
    throw err;
  }

  const paymentAmount = Number(amount);

  const effectivePaidAt = paidAt
    ? new Date(paidAt)
    : new Date();

  if (isNaN(effectivePaidAt.getTime())) {
    const err = new Error("paidAt must be a valid date");
    err.status = 400;
    throw err;
  }


  const previousPayments = await prisma.payment.findMany({
    where: { debtId: debt.id },
    select: { amount: true },
  });

  const totalPaidBefore = previousPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

 
  let outstandingBeforePayment;

  if (debt.debtType === "credit_card") {
    // For credit cards, currentOutstanding is the ACTUAL
    // current balance. Do not subtract previous payments again.
    outstandingBeforePayment = Math.max(
      0,
      Number(debt.currentOutstanding || 0)
    );
  } else {
    // Loans / third-party debts continue to derive their
    // outstanding balance from principal minus payments.
    outstandingBeforePayment = Math.max(
      0,
      Number(debt.principal || 0) - totalPaidBefore
    );
  }

  if (paymentAmount > outstandingBeforePayment) {
    const err = new Error(
      `Payment cannot exceed outstanding balance of ${outstandingBeforePayment}`
    );
    err.status = 400;
    throw err;
  }

 
  let isPrepayment = false;

  if (debt.debtType === "credit_card") {
    // Credit cards don't use reduce_tenure / reduce_emi.
    if (prepaymentChoice !== undefined) {
      const err = new Error(
        "prepaymentChoice is not used for credit cards"
      );
      err.status = 400;
      throw err;
    }
  }

  
  if (
    debt.debtType === "loan" ||
    debt.debtType === "third_party"
  ) {
    const monthlyRepayment =
      Number(debt.monthlyRepayment || 0);

    const isFullPayment =
      paymentAmount === outstandingBeforePayment;

    isPrepayment =
      paymentAmount > monthlyRepayment &&
      !isFullPayment;

    if (isPrepayment && !prepaymentChoice) {
      const err = new Error(
        "This is a prepayment — specify prepaymentChoice as reduce_tenure or reduce_emi"
      );
      err.status = 422;
      throw err;
    }

    if (
      prepaymentChoice &&
      !["reduce_tenure", "reduce_emi"].includes(
        prepaymentChoice
      )
    ) {
      const err = new Error(
        "prepaymentChoice must be reduce_tenure or reduce_emi"
      );
      err.status = 400;
      throw err;
    }
  }

 
  const paymentDay = new Date(
    effectivePaidAt.getFullYear(),
    effectivePaidAt.getMonth(),
    effectivePaidAt.getDate()
  );

  const dueDate = new Date(
    effectivePaidAt.getFullYear(),
    effectivePaidAt.getMonth(),
    debt.dueDay
  );

  let status;

  if (debt.debtType === "credit_card") {
    const minimumPayment =
      Number(debt.minimumPayment || 0);

    if (paymentAmount < minimumPayment) {
      status = "partial";
    } else if (paymentDay > dueDate) {
      status = "late";
    } else {
      status = "on_time";
    }
  } else {
    const monthlyRepayment =
      Number(debt.monthlyRepayment || 0);

    if (paymentAmount < monthlyRepayment) {
      status = "partial";
    } else if (paymentDay > dueDate) {
      status = "late";
    } else {
      status = "on_time";
    }
  }

  
  let penaltyApplied = 0;

  if (status === "late") {
    if (debt.penaltyType === "flat") {
      penaltyApplied =
        Number(debt.penaltyValue || 0);
    } else if (
      debt.penaltyType === "percentage"
    ) {
      const baseAmount =
        debt.debtType === "credit_card"
          ? Number(debt.minimumPayment || 0)
          : Number(debt.monthlyRepayment || 0);

      penaltyApplied =
        (baseAmount *
          Number(debt.penaltyValue || 0)) /
        100;
    }
  }


  const remainingBalance = Math.max(
    0,
    outstandingBeforePayment - paymentAmount
  );

 

  const result = await prisma.$transaction(
    async (tx) => {
  
      const payment =
        await tx.payment.create({
          data: {
            debtId: debt.id,
            amount: paymentAmount,
            paidAt: effectivePaidAt,
            status,
            penaltyApplied,
            isPrepayment,
            prepaymentChoice:
              isPrepayment
                ? prepaymentChoice
                : null,
          },
        });

      

      if (debt.debtType === "credit_card") {
        await tx.debt.update({
          where: {
            id: debt.id,
          },
          data: {
            currentOutstanding: {
              decrement: paymentAmount,
            },
          },
        });
      }

      
      if (penaltyApplied > 0) {
        await tx.debt.update({
          where: {
            id: debt.id,
          },
          data: {
            penaltyOutstanding: {
              increment: penaltyApplied,
            },
          },
        });
      }

    
      if (
        isPrepayment &&
        debt.debtType !== "credit_card" &&
        debt.tenureMonths
      ) {
        const monthlyRepayment =
          Number(debt.monthlyRepayment);

        if (
          prepaymentChoice ===
          "reduce_tenure"
        ) {
          const newTenure =
            Math.max(
              1,
              Math.ceil(
                remainingBalance /
                  monthlyRepayment
              )
            );

          await tx.debt.update({
            where: {
              id: debt.id,
            },
            data: {
              tenureMonths: newTenure,
            },
          });
        }

        if (
          prepaymentChoice ===
          "reduce_emi"
        ) {
          const newMonthly =
            remainingBalance /
            Number(debt.tenureMonths);

          await tx.debt.update({
            where: {
              id: debt.id,
            },
            data: {
              monthlyRepayment:
                newMonthly,
            },
          });
        }
      }

      if (remainingBalance === 0) {
        const currentPenaltyOutstanding =
          Number(
            debt.penaltyOutstanding || 0
          ) + penaltyApplied;

        if (
          currentPenaltyOutstanding === 0
        ) {
          await tx.debt.update({
            where: {
              id: debt.id,
            },
            data: {
              status: "completed",
            },
          });
        }
      }

      const updatedDebt =
        await tx.debt.findUnique({
          where: {
            id: debt.id,
          },
        });

      return {
        payment,
        debt: updatedDebt,
      };
    }
  );

  return result;
}

async function listPayments(
  userId,
  debtId
) {
  await getDebtOwnedByUser(
    userId,
    debtId
  );

  return prisma.payment.findMany({
    where: { debtId },
    orderBy: {
      paidAt: "desc",
    },
  });
}

module.exports = {
  createPayment,
  listPayments,
};

