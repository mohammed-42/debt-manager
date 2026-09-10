const express = require("express");
const prisma = require("./src/config/db.js");
const authRoutes = require("./src/routes/auth.routes");
const cookieParser = require("cookie-parser");
const debtRoutes = require("./src/routes/debt.routes.js");


const app = express();
app.use(cookieParser());
app.use(express.json());
app.use("/debts", debtRoutes);


app.get("/test-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ message: "Database connected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database connection failed" });
  }
});
app.use("/auth", authRoutes);

module.exports = app;