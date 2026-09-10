const prisma = require("../config/db");

async function createDebt(userId, data) {
  const { debtType, name, principal, monthlyRepayment, tenureMonths, interestRate, dueDay } = data;

  if (!debtType || !name || !principal || !monthlyRepayment || !dueDay) {
    const err = new Error("debtType, name, principal, monthlyRepayment, and dueDay are required");
    err.status = 400;
    throw err;
  }

  if (dueDay < 1 || dueDay > 31) {
    const err = new Error("dueDay must be between 1 and 31");
    err.status = 400;
    throw err;
  }

  const debt = await prisma.debt.create({
    data: {
      userId,
      debtType,
      name,
      principal,
      monthlyRepayment,
      tenureMonths: tenureMonths ?? null,
      interestRate: interestRate ?? null,
      dueDay,
    },
  });

  return debt;
}

async function listDebts(userId) {
  return prisma.debt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

async function getDebtOwnedByUser(userId, debtId) {
  const debt = await prisma.debt.findUnique({ where: { id: debtId } });

  if (!debt || debt.userId !== userId) {
    const err = new Error("Debt not found");
    err.status = 404;
    throw err;
  }

  return debt;
}

async function updateDebt(userId, debtId, data) {
  await getDebtOwnedByUser(userId, debtId);

  const { name, monthlyRepayment, tenureMonths, interestRate, dueDay, status } = data;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (monthlyRepayment !== undefined) updateData.monthlyRepayment = monthlyRepayment;
  if (tenureMonths !== undefined) updateData.tenureMonths = tenureMonths;
  if (interestRate !== undefined) updateData.interestRate = interestRate;
  if (dueDay !== undefined) updateData.dueDay = dueDay;
  if (status !== undefined) updateData.status = status;

  return prisma.debt.update({
    where: { id: debtId },
    data: updateData,
  });
}

async function deleteDebt(userId, debtId) {
  await getDebtOwnedByUser(userId, debtId);

  await prisma.debt.delete({ where: { id: debtId } });

  return { message: "Debt deleted" };
}

module.exports = { createDebt, listDebts, updateDebt, deleteDebt };