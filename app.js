
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const prisma = require("./src/config/db.js");
const authRoutes = require("./src/routes/auth.routes");
const debtRoutes = require("./src/routes/debt.routes.js");
const paymentRoutes = require("./src/routes/payment.routes.js");

const app = express();

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://debt-manager-n5nifl23k-mohammed-42.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Middleware
app.use(cookieParser());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Debt Manager API is running",
  });
});

// Database health check
app.get("/test-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      message: "Database connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// API routes
app.use("/auth", authRoutes);
app.use("/debts", debtRoutes);
app.use("/debts", paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message: err.status
      ? err.message
      : "Internal server error",
  });
});

module.exports = app;
