import Ticket from "../models/Ticket.js";
import {
  adminConfigured,
  clearLoginFailures,
  credentialsMatch,
  loginAllowed,
  recordLoginFailure,
  signToken,
} from "../utils/adminAuth.js";

const adminTicket = (t) => ({
  name: t.name,
  email: t.email,
  ticketNumber: t.ticketNumber,
  amountPaid: t.amountPaid / 100, // naira
  paidAt: t.createdAt,
  checkedIn: Boolean(t.checkedIn),
  checkedInAt: t.checkedInAt || null,
  emailSent: Boolean(t.emailSent),
});

const TICKET_NO_RE = /^[A-Za-z0-9-]{3,30}$/;

// POST /api/admin/login  { email, password }
export const login = (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!adminConfigured()) {
    return res.status(503).json({ message: "Admin access is not configured on the server." });
  }
  const ip = req.ip;
  if (!loginAllowed(ip)) {
    return res.status(429).json({ message: "Too many attempts. Please wait 15 minutes and try again." });
  }
  const { email, password } = req.body || {};
  if (!credentialsMatch(email, password)) {
    recordLoginFailure(ip);
    return res.status(401).json({ message: "Incorrect email or password." });
  }
  clearLoginFailures(ip);
  res.json({ token: signToken(String(email).trim().toLowerCase()) });
};

// GET /api/admin/tickets  -> everyone who has paid, newest first, plus totals
export const listTickets = async (_req, res) => {
  try {
    const rows = await Ticket.find({ paid: true }).sort({ createdAt: -1 }).lean();
    const tickets = rows.map(adminTicket);
    const summary = {
      totalSold: tickets.length,
      revenue: tickets.reduce((sum, t) => sum + t.amountPaid, 0),
      checkedIn: tickets.filter((t) => t.checkedIn).length,
    };
    summary.notYetIn = summary.totalSold - summary.checkedIn;
    res.json({ summary, tickets });
  } catch (err) {
    console.error("admin listTickets error:", err);
    res.status(500).json({ message: "Could not load tickets." });
  }
};

// POST /api/admin/tickets/:ticketNumber/check-in
// Atomic: two doors scanning the same ticket at once can never both be let in.
export const checkIn = async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").toUpperCase();
    if (!TICKET_NO_RE.test(ticketNumber)) {
      return res.status(400).json({ message: "Invalid ticket number." });
    }
    const updated = await Ticket.findOneAndUpdate(
      { ticketNumber, paid: true, checkedIn: { $ne: true } },
      { $set: { checkedIn: true, checkedInAt: new Date() } },
      { new: true },
    );
    if (updated) return res.json({ ticket: adminTicket(updated) });

    const existing = await Ticket.findOne({ ticketNumber, paid: true });
    if (!existing) return res.status(404).json({ message: "No paid ticket with that number." });
    res.status(409).json({
      message: "This ticket has already been used.",
      ticket: adminTicket(existing),
    });
  } catch (err) {
    console.error("admin checkIn error:", err);
    res.status(500).json({ message: "Could not check in this ticket." });
  }
};

// POST /api/admin/tickets/:ticketNumber/undo-check-in  (for mistakes)
export const undoCheckIn = async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").toUpperCase();
    if (!TICKET_NO_RE.test(ticketNumber)) {
      return res.status(400).json({ message: "Invalid ticket number." });
    }
    const updated = await Ticket.findOneAndUpdate(
      { ticketNumber, paid: true },
      { $set: { checkedIn: false }, $unset: { checkedInAt: "" } },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "No paid ticket with that number." });
    res.json({ ticket: adminTicket(updated) });
  } catch (err) {
    console.error("admin undoCheckIn error:", err);
    res.status(500).json({ message: "Could not undo check-in." });
  }
};
