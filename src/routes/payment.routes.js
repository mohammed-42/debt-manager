
const express = require("express");
const requireAuth = require("../middleware/auth.middleware");

const {
  create,
  list,
} = require("../controllers/payment.controller");

const {
  create: createTransaction,
  list: listTransactions,
  update: updateTransaction,
  remove: deleteTransaction,
} = require("../controllers/creditCardTransaction.controller");

const router = express.Router();

router.use(requireAuth);


router.post(
  "/:debtId/payments",
  create
);

router.get(
  "/:debtId/payments",
  list
);


router.post(
  "/:debtId/transactions",
  createTransaction
);

router.get(
  "/:debtId/transactions",
  listTransactions
);
router.patch(
  "/:debtId/transactions/:transactionId",
  updateTransaction
);

router.delete(
  "/:debtId/transactions/:transactionId",
  deleteTransaction
);
module.exports = router;

