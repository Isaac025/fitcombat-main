import express from "express";
import { requireAdmin } from "../utils/adminAuth.js";
import {
  checkIn,
  listTickets,
  login,
  undoCheckIn,
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/login", login); // public — everything below needs a valid admin token
router.get("/tickets", requireAdmin, listTickets);
router.post("/tickets/:ticketNumber/check-in", requireAdmin, checkIn);
router.post("/tickets/:ticketNumber/undo-check-in", requireAdmin, undoCheckIn);

export default router;
