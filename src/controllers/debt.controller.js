const { createDebt, listDebts, updateDebt, deleteDebt } = require("../services/debt.service");

async function create(req, res, next) {
  try {
    const debt = await createDebt(req.userId, req.body);
    res.status(201).json({ message: "Debt added", debt });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const debts = await listDebts(req.userId);
    res.status(200).json({ debts });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const debt = await updateDebt(req.userId, req.params.id, req.body);
    res.status(200).json({ message: "Debt updated", debt });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteDebt(req.userId, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, remove };