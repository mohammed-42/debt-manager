const express = require("express");
const prisma = require("./src/config/db.js");

const app = express();

app.use(express.json());

app.get("/test-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ message: "Database connected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

module.exports = app;