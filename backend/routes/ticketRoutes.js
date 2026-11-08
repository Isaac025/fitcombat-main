import express from "express";
import {
  downloadTicket,
  paystackWebhook,
  verifyPayment,
} from "../controllers/ticketController.js";

const router = express.Router();

router.post("/verify", verifyPayment);
router.post("/webhook", paystackWebhook);
router.get("/download/:reference", downloadTicket);

export default router;
