const {
  createCreditCardTransaction,
  listCreditCardTransactions,
  updateCreditCardTransaction,
  deleteCreditCardTransaction,
} = require("../services/creditCardTransaction.service");


async function create(req, res, next) {
  try {
    const { debtId } = req.params;

    const result =
      await createCreditCardTransaction(
        req.userId,
        debtId,
        req.body
      );

    res.status(201).json({
      message: "Credit card transaction added",
      transaction: result.transaction,
      debt: result.debt,
    });
  } catch (err) {
    next(err);
  }
}


async function list(req, res, next) {
  try {
    const { debtId } = req.params;

    const transactions =
      await listCreditCardTransactions(
        req.userId,
        debtId
      );

    res.status(200).json({
      transactions,
    });
  } catch (err) {
    next(err);
  }
}


async function update(req, res, next) {
  try {
    const { debtId, transactionId } = req.params;

    const result =
      await updateCreditCardTransaction(
        req.userId,
        debtId,
        transactionId,
        req.body
      );

    res.status(200).json({
      message: "Credit card transaction updated",
      transaction: result.transaction,
      debt: result.debt,
    });
  } catch (err) {
    next(err);
  }
}


async function remove(req, res, next) {
  try {
    const { debtId, transactionId } = req.params;

    const result =
      await deleteCreditCardTransaction(
        req.userId,
        debtId,
        transactionId
      );

    res.status(200).json({
      message: "Credit card transaction deleted",
      debt: result.debt,
    });
  } catch (err) {
    next(err);
  }
}


module.exports = {
  create,
  list,
  update,
  remove,
};