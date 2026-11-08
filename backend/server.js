import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import ticketRoutes from "./routes/ticketRoutes.js";

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));

// Keep the raw bytes: Paystack's webhook signature is computed over them.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get("/", (_req, res) => res.json({ status: "ok", service: "fitcombat-api" }));
app.use("/api/tickets", ticketRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
