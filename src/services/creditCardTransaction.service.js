const prisma = require("../config/db");
const { getDebtOwnedByUser } = require("./debt.service");

async function createCreditCardTransaction(userId, debtId, data) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  if (debt.debtType !== "credit_card") {
    const err = new Error(
      "Transactions can only be added to credit cards"
    );
    err.status = 400;
    throw err;
  }

  const { amount, description, transactionDate } = data;

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

  const transactionAmount = Number(amount);

  const effectiveTransactionDate = transactionDate
    ? new Date(transactionDate)
    : new Date();

  if (isNaN(effectiveTransactionDate.getTime())) {
    const err = new Error(
      "transactionDate must be a valid date"
    );
    err.status = 400;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.creditCardTransaction.create({
      data: {
        debtId: debt.id,
        amount: transactionAmount,
        description: description || null,
        transactionDate: effectiveTransactionDate,
      },
    });

    const updatedDebt = await tx.debt.update({
      where: { id: debt.id },
      data: {
        currentOutstanding: {
          increment: transactionAmount,
        },
        status: "active",
      },
    });

    return { transaction, debt: updatedDebt };
  });

  return result;
}


async function listCreditCardTransactions(userId, debtId) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  if (debt.debtType !== "credit_card") {
    const err = new Error(
      "Transactions can only be listed for credit cards"
    );
    err.status = 400;
    throw err;
  }

  return prisma.creditCardTransaction.findMany({
    where: { debtId: debt.id },
    orderBy: { transactionDate: "desc" },
  });
}


async function updateCreditCardTransaction(
  userId,
  debtId,
  transactionId,
  data
) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  if (debt.debtType !== "credit_card") {
    const err = new Error(
      "Transactions can only be updated for credit cards"
    );
    err.status = 400;
    throw err;
  }

  const transaction = await prisma.creditCardTransaction.findFirst({
    where: {
      id: transactionId,
      debtId: debt.id,
    },
  });

  if (!transaction) {
    const err = new Error("Credit card transaction not found");
    err.status = 404;
    throw err;
  }

  const { amount, description, transactionDate } = data;

  if (
    amount === undefined &&
    description === undefined &&
    transactionDate === undefined
  ) {
    const err = new Error("At least one field is required");
    err.status = 400;
    throw err;
  }

  let newAmount = Number(transaction.amount);

  if (amount !== undefined) {
    if (
      amount === null ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      const err = new Error(
        "amount must be greater than 0"
      );
      err.status = 400;
      throw err;
    }

    newAmount = Number(amount);
  }

  let newTransactionDate = transaction.transactionDate;

  if (transactionDate !== undefined) {
    newTransactionDate = new Date(transactionDate);

    if (isNaN(newTransactionDate.getTime())) {
      const err = new Error(
        "transactionDate must be a valid date"
      );
      err.status = 400;
      throw err;
    }
  }

  const oldAmount = Number(transaction.amount);
  const difference = newAmount - oldAmount;

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransaction =
      await tx.creditCardTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          amount: newAmount,
          description:
            description !== undefined
              ? description || null
              : transaction.description,
          transactionDate: newTransactionDate,
        },
      });

    let updatedDebt = debt;

    if (difference !== 0) {
      updatedDebt = await tx.debt.update({
        where: {
          id: debt.id,
        },
        data: {
          currentOutstanding: {
            increment: difference,
          },
          status: "active",
        },
      });
    }

    return {
      transaction: updatedTransaction,
      debt: updatedDebt,
    };
  });

  return result;
}


async function deleteCreditCardTransaction(
  userId,
  debtId,
  transactionId
) {
  const debt = await getDebtOwnedByUser(userId, debtId);

  if (debt.debtType !== "credit_card") {
    const err = new Error(
      "Transactions can only be deleted for credit cards"
    );
    err.status = 400;
    throw err;
  }

  const transaction = await prisma.creditCardTransaction.findFirst({
    where: {
      id: transactionId,
      debtId: debt.id,
    },
  });

  if (!transaction) {
    const err = new Error("Credit card transaction not found");
    err.status = 404;
    throw err;
  }

  const transactionAmount = Number(transaction.amount);

  const result = await prisma.$transaction(async (tx) => {
    await tx.creditCardTransaction.delete({
      where: {
        id: transaction.id,
      },
    });

    const updatedDebt = await tx.debt.update({
      where: {
        id: debt.id,
      },
      data: {
        currentOutstanding: {
          decrement: transactionAmount,
        },
        status: "active",
      },
    });

    return {
      debt: updatedDebt,
    };
  });

  return result;
}


module.exports = {
  createCreditCardTransaction,
  listCreditCardTransactions,
  updateCreditCardTransaction,
  deleteCreditCardTransaction,
};