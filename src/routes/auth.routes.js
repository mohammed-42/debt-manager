const express = require("express");
const { register, verify, login, refresh, logout } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify", verify);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;