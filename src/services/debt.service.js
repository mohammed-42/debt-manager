const prisma = require("../config/db");

async function createDebt(userId, data) {
  const {
    debtType,
    name,
    principal,
    currentOutstanding,
    minimumPayment,
    monthlyRepayment,
    tenureMonths,
    interestRate,
    dueDay,
    penaltyType,
    penaltyValue,
  } = data;

  
  if (!debtType || !name || dueDay === undefined) {
    const err = new Error(
      "debtType, name, and dueDay are required"
    );
    err.status = 400;
    throw err;
  }

  if (!["loan", "credit_card", "third_party"].includes(debtType)) {
    const err = new Error(
      "debtType must be 'loan', 'credit_card', or 'third_party'"
    );
    err.status = 400;
    throw err;
  }

  if (typeof name !== "string" || !name.trim()) {
    const err = new Error("name must be a non-empty string");
    err.status = 400;
    throw err;
  }

  if (
    !Number.isInteger(Number(dueDay)) ||
    Number(dueDay) < 1 ||
    Number(dueDay) > 31
  ) {
    const err = new Error(
      "dueDay must be an integer between 1 and 31"
    );
    err.status = 400;
    throw err;
  }


  if (debtType === "credit_card") {
    if (
      !Number.isFinite(Number(currentOutstanding)) ||
      Number(currentOutstanding) <= 0
    ) {
      const err = new Error(
        "currentOutstanding must be greater than 0 for a credit card"
      );
      err.status = 400;
      throw err;
    }

    if (
      !Number.isFinite(Number(minimumPayment)) ||
      Number(minimumPayment) <= 0
    ) {
      const err = new Error(
        "minimumPayment must be greater than 0 for a credit card"
      );
      err.status = 400;
      throw err;
    }

    if (Number(minimumPayment) > Number(currentOutstanding)) {
      const err = new Error(
        "minimumPayment cannot be greater than currentOutstanding"
      );
      err.status = 400;
      throw err;
    }

    if (
      principal !== undefined ||
      monthlyRepayment !== undefined ||
      tenureMonths !== undefined
    ) {
      const err = new Error(
        "Credit cards use currentOutstanding and minimumPayment, not principal, monthlyRepayment, or tenureMonths"
      );
      err.status = 400;
      throw err;
    }
  }


  if (debtType === "loan" || debtType === "third_party") {
    if (
      !Number.isFinite(Number(principal)) ||
      Number(principal) <= 0
    ) {
      const err = new Error(
        "principal must be greater than 0"
      );
      err.status = 400;
      throw err;
    }

    if (
      !Number.isFinite(Number(monthlyRepayment)) ||
      Number(monthlyRepayment) <= 0
    ) {
      const err = new Error(
        "monthlyRepayment must be greater than 0"
      );
      err.status = 400;
      throw err;
    }

    if (
      currentOutstanding !== undefined ||
      minimumPayment !== undefined
    ) {
      const err = new Error(
        "currentOutstanding and minimumPayment are only for credit cards"
      );
      err.status = 400;
      throw err;
    }
  }


  if (tenureMonths !== undefined && tenureMonths !== null) {
    if (
      !Number.isInteger(Number(tenureMonths)) ||
      Number(tenureMonths) <= 0
    ) {
      const err = new Error(
        "tenureMonths must be a positive integer"
      );
      err.status = 400;
      throw err;
    }
  }

  if (
    debtType === "credit_card" &&
    tenureMonths !== undefined &&
    tenureMonths !== null
  ) {
    const err = new Error(
      "Credit cards cannot have a tenure"
    );
    err.status = 400;
    throw err;
  }



  if (interestRate !== undefined && interestRate !== null) {
    if (
      !Number.isFinite(Number(interestRate)) ||
      Number(interestRate) < 0
    ) {
      const err = new Error(
        "interestRate must be 0 or greater"
      );
      err.status = 400;
      throw err;
    }
  }



  const finalPenaltyType = penaltyType ?? "flat";
  const finalPenaltyValue = penaltyValue ?? 0;

  if (!["flat", "percentage"].includes(finalPenaltyType)) {
    const err = new Error(
      "penaltyType must be 'flat' or 'percentage'"
    );
    err.status = 400;
    throw err;
  }

  if (
    !Number.isFinite(Number(finalPenaltyValue)) ||
    Number(finalPenaltyValue) < 0 ||
    (finalPenaltyType === "percentage" &&
      Number(finalPenaltyValue) > 100)
  ) {
    const err = new Error(
      "penaltyValue must be >= 0, and <= 100 when penaltyType is percentage"
    );
    err.status = 400;
    throw err;
  }


  const debtData = {
    userId,
    debtType,
    name: name.trim(),
    dueDay: Number(dueDay),
    interestRate:
      interestRate !== undefined && interestRate !== null
        ? Number(interestRate)
        : null,
    penaltyType: finalPenaltyType,
    penaltyValue: Number(finalPenaltyValue),
    penaltyOutstanding: 0,
  };

  // Loan / third-party
  if (debtType === "loan" || debtType === "third_party") {
    debtData.principal = Number(principal);
    debtData.monthlyRepayment = Number(monthlyRepayment);
    debtData.tenureMonths =
      tenureMonths !== undefined && tenureMonths !== null
        ? Number(tenureMonths)
        : null;
  }

  // Credit card
  if (debtType === "credit_card") {
    debtData.currentOutstanding = Number(currentOutstanding);
    debtData.minimumPayment = Number(minimumPayment);

    debtData.principal = null;
    debtData.monthlyRepayment = null;
    debtData.tenureMonths = null;
  }

  return prisma.debt.create({
    data: debtData,
  });
}



async function listDebts(userId) {
  return prisma.debt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}



async function getDebtOwnedByUser(userId, debtId) {
  const debt = await prisma.debt.findUnique({
    where: { id: debtId },
  });

  if (!debt || debt.userId !== userId) {
    const err = new Error("Debt not found");
    err.status = 404;
    throw err;
  }

  return debt;
}



async function getDebtDetail(userId, debtId) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  const payments = await prisma.payment.findMany({
    where: { debtId },
    orderBy: { paidAt: "desc" },
  });

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  let principalOutstanding = 0;
  let creditCardOutstanding = 0;

  if (
    debt.debtType === "credit_card"
  ) {
    creditCardOutstanding = Math.max(
      0,
      Number(debt.currentOutstanding || 0) - totalPaid
    );
  } else {
    principalOutstanding = Math.max(
      0,
      Number(debt.principal || 0) - totalPaid
    );
  }

  const penaltyOutstanding = Number(
    debt.penaltyOutstanding || 0
  );

  const totalOutstanding =
    debt.debtType === "credit_card"
      ? creditCardOutstanding + penaltyOutstanding
      : principalOutstanding + penaltyOutstanding;

  return {
    ...debt,
    totalPaid,
    principalOutstanding,
    creditCardOutstanding,
    penaltyOutstanding,
    totalOutstanding,
    paymentsCount: payments.length,
    payments,
  };
}



async function markPenaltyPaid(userId, debtId) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  if (Number(debt.penaltyOutstanding) <= 0) {
    const err = new Error(
      "No outstanding penalty for this debt"
    );
    err.status = 400;
    throw err;
  }

  const payments = await prisma.payment.findMany({
    where: { debtId },
    select: { amount: true },
  });

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  let remainingBalance = 0;

  if (debt.debtType === "credit_card") {
    remainingBalance = Math.max(
      0,
      Number(debt.currentOutstanding || 0) - totalPaid
    );
  } else {
    remainingBalance = Math.max(
      0,
      Number(debt.principal || 0) - totalPaid
    );
  }

  return prisma.debt.update({
    where: { id: debtId },
    data: {
      penaltyOutstanding: 0,
      status:
        remainingBalance === 0
          ? "completed"
          : debt.status,
    },
  });
}



async function updateDebt(userId, debtId, data) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  const {
    name,
    monthlyRepayment,
    tenureMonths,
    interestRate,
    dueDay,
    status,
    penaltyType,
    penaltyValue,
  } = data;

  const updateData = {};

  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      const err = new Error(
        "name must be a non-empty string"
      );
      err.status = 400;
      throw err;
    }

    updateData.name = name.trim();
  }

  

  if (monthlyRepayment !== undefined) {
    if (
      debt.debtType === "credit_card"
    ) {
      const err = new Error(
        "Credit cards use minimumPayment instead of monthlyRepayment"
      );
      err.status = 400;
      throw err;
    }

    if (
      !Number.isFinite(Number(monthlyRepayment)) ||
      Number(monthlyRepayment) <= 0
    ) {
      const err = new Error(
        "monthlyRepayment must be greater than 0"
      );
      err.status = 400;
      throw err;
    }

    updateData.monthlyRepayment =
      Number(monthlyRepayment);
  }

 
  if (tenureMonths !== undefined) {
    if (debt.debtType === "credit_card") {
      const err = new Error(
        "Credit cards cannot have a tenure"
      );
      err.status = 400;
      throw err;
    }

    if (
      tenureMonths !== null &&
      (!Number.isInteger(Number(tenureMonths)) ||
        Number(tenureMonths) <= 0)
    ) {
      const err = new Error(
        "tenureMonths must be a positive integer or null"
      );
      err.status = 400;
      throw err;
    }

    updateData.tenureMonths =
      tenureMonths === null
        ? null
        : Number(tenureMonths);
  }

  // -------------------------
  // Interest
  // -------------------------

  if (interestRate !== undefined) {
    if (
      interestRate !== null &&
      (!Number.isFinite(Number(interestRate)) ||
        Number(interestRate) < 0)
    ) {
      const err = new Error(
        "interestRate must be 0 or greater, or null"
      );
      err.status = 400;
      throw err;
    }

    updateData.interestRate =
      interestRate === null
        ? null
        : Number(interestRate);
  }

  // -------------------------
  // Due day
  // -------------------------

  if (dueDay !== undefined) {
    if (
      !Number.isInteger(Number(dueDay)) ||
      Number(dueDay) < 1 ||
      Number(dueDay) > 31
    ) {
      const err = new Error(
        "dueDay must be an integer between 1 and 31"
      );
      err.status = 400;
      throw err;
    }

    updateData.dueDay = Number(dueDay);
  }

  // -------------------------
  // Status
  // -------------------------

  if (status !== undefined) {
    if (
      !["active", "completed", "overdue"].includes(status)
    ) {
      const err = new Error(
        "status must be 'active', 'completed', or 'overdue'"
      );
      err.status = 400;
      throw err;
    }

    if (status === "completed") {
      const payments = await prisma.payment.findMany({
        where: { debtId },
        select: { amount: true },
      });

      const totalPaid = payments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

      let remainingBalance = 0;

      if (debt.debtType === "credit_card") {
        remainingBalance = Math.max(
          0,
          Number(debt.currentOutstanding || 0) -
            totalPaid
        );
      } else {
        remainingBalance = Math.max(
          0,
          Number(debt.principal || 0) -
            totalPaid
        );
      }

      const penaltyOutstanding =
        Number(debt.penaltyOutstanding || 0);

      if (
        remainingBalance > 0 ||
        penaltyOutstanding > 0
      ) {
        const err = new Error(
          "Debt cannot be completed while balance or penalty is outstanding"
        );
        err.status = 400;
        throw err;
      }
    }

    updateData.status = status;
  }

  // -------------------------
  // Penalty type
  // -------------------------

  if (penaltyType !== undefined) {
    if (
      !["flat", "percentage"].includes(
        penaltyType
      )
    ) {
      const err = new Error(
        "penaltyType must be 'flat' or 'percentage'"
      );
      err.status = 400;
      throw err;
    }

    const effectivePenaltyValue =
      penaltyValue !== undefined
        ? Number(penaltyValue)
        : Number(debt.penaltyValue);

    if (
      !Number.isFinite(effectivePenaltyValue) ||
      effectivePenaltyValue < 0 ||
      (penaltyType === "percentage" &&
        effectivePenaltyValue > 100)
    ) {
      const err = new Error(
        "penaltyValue must be between 0 and 100 for percentage penalty"
      );
      err.status = 400;
      throw err;
    }

    updateData.penaltyType = penaltyType;
  }

  // -------------------------
  // Penalty value
  // -------------------------

  if (penaltyValue !== undefined) {
    const numericPenaltyValue =
      Number(penaltyValue);

    if (
      !Number.isFinite(numericPenaltyValue) ||
      numericPenaltyValue < 0
    ) {
      const err = new Error(
        "penaltyValue must be 0 or greater"
      );
      err.status = 400;
      throw err;
    }

    const effectivePenaltyType =
      penaltyType ?? debt.penaltyType;

    if (
      effectivePenaltyType === "percentage" &&
      numericPenaltyValue > 100
    ) {
      const err = new Error(
        "penaltyValue must be between 0 and 100 for percentage penalty"
      );
      err.status = 400;
      throw err;
    }

    updateData.penaltyValue =
      numericPenaltyValue;
  }

  // -------------------------
  // Nothing to update
  // -------------------------

  if (Object.keys(updateData).length === 0) {
    const err = new Error(
      "At least one field is required to update"
    );
    err.status = 400;
    throw err;
  }

  return prisma.debt.update({
    where: {
      id: debtId,
    },
    data: updateData,
  });
}

// ============================================================
// DELETE DEBT
// ============================================================

async function deleteDebt(userId, debtId) {
  await getDebtOwnedByUser(userId, debtId);

  await prisma.debt.delete({
    where: { id: debtId },
  });

  return { message: "Debt deleted" };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createDebt,
  listDebts,
  updateDebt,
  deleteDebt,
  getDebtOwnedByUser,
  getDebtDetail,
  markPenaltyPaid,
};

