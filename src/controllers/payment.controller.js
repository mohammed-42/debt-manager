const { createPayment, listPayments } = require("../services/payment.service");

async function create(req, res, next) {
  try {
    const result = await createPayment(req.userId, req.params.debtId, req.body);
    res.status(201).json({ message: "Payment recorded", ...result });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const payments = await listPayments(req.userId, req.params.debtId);
    res.status(200).json({ payments });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };