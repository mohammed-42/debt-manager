const express = require("express");
const { register, verify, login, refresh, logout, logoutAll } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify", verify);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", logoutAll);

module.exports = router;