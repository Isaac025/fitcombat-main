import Ticket from "../models/Ticket.js";
import { HttpError } from "../utils/HttpError.js";
import { isValidWebhookSignature } from "../utils/paystack.js";
import { generateTicketPdf } from "../utils/ticketPdf.js";
import { fulfillPayment, isValidReference } from "../services/ticketService.js";

const publicTicket = (t) => ({
  name: t.name,
  email: t.email,
  ticketNumber: t.ticketNumber,
  paystackReference: t.paystackReference,
  emailSent: t.emailSent,
});

// POST /api/tickets/verify  { reference }
// Called by the frontend right after Paystack's popup reports success.
export const verifyPayment = async (req, res) => {
  try {
    const ticket = await fulfillPayment(req.body?.reference);
    res.json({ message: "Payment confirmed", ticket: publicTicket(ticket) });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
    console.error("verifyPayment error:", err);
    res.status(500).json({ message: "Something went wrong confirming your payment. Please retry." });
  }
};

// POST /api/tickets/webhook
// Safety net: Paystack calls this even if the buyer closes the tab right after paying.
export const paystackWebhook = async (req, res) => {
  if (!isValidWebhookSignature(req.rawBody, req.get("x-paystack-signature"))) {
    return res.sendStatus(401);
  }
  const { event, data } = req.body || {};
  if (event !== "charge.success" || !data?.reference) return res.sendStatus(200);

  try {
    await fulfillPayment(data.reference);
    res.sendStatus(200);
  } catch (err) {
    // 4xx = a permanent problem (wrong amount, etc.) → 200 so Paystack stops retrying.
    // Anything else → 500 so Paystack retries later.
    if (err instanceof HttpError && err.status < 500) return res.sendStatus(200);
    console.error("webhook error:", err);
    res.sendStatus(500);
  }
};

// GET /api/tickets/download/:reference
export const downloadTicket = async (req, res) => {
  try {
    const { reference } = req.params;
    if (!isValidReference(reference)) return res.status(400).json({ message: "Invalid reference." });
    const ticket = await Ticket.findOne({ paystackReference: reference, paid: true });
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    const pdf = await generateTicketPdf(ticket);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ticket.ticketNumber}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    console.error("downloadTicket error:", err);
    res.status(500).json({ message: "Could not generate your ticket." });
  }
};
