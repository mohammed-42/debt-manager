const express = require("express");
const requireAuth = require("../middleware/auth.middleware");
const { create, list } = require("../controllers/payment.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/:debtId/payments", create);
router.get("/:debtId/payments", list);

module.exports = router;