import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import drawRoutes from "./routes/drawRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Khushi Bazar Lucky Draw API is running.",
  });
});

app.use("/api/draw", drawRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Lucky Draw API running on port ${PORT}`);
});