const express = require("express");
const cors = require("cors");
const prisma = require("./src/config/db.js");
const authRoutes = require("./src/routes/auth.routes");
const cookieParser = require("cookie-parser");
const debtRoutes = require("./src/routes/debt.routes.js");
const paymentRoutes = require("./src/routes/payment.routes.js");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // your Vite frontend
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/debts", debtRoutes);
app.use("/debts", paymentRoutes);

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
app.use("/auth", authRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.status
      ? err.message
      : "Internal server error",
  });
});


module.exports = app;