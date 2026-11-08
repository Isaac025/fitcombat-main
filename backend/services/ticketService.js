import Ticket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import { EVENT } from "../config/event.js";
import { HttpError } from "../utils/HttpError.js";
import { verifyTransaction } from "../utils/paystack.js";
import { generateTicketPdf } from "../utils/ticketPdf.js";
import { sendTicketEmail } from "../utils/mailer.js";
import { generateTicketPng } from "../utils/ticketPng.js";

const REFERENCE_RE = /^[A-Za-z0-9._=-]{6,100}$/;
export const isValidReference = (ref) =>
  typeof ref === "string" && REFERENCE_RE.test(ref);

// References currently being emailed (stops a webhook + browser call double-sending).
const delivering = new Set();

const nextTicketNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "ticket" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `FITC-${String(counter.seq).padStart(4, "0")}`;
};

// Generate the PDF and email it. Never throws: a mail hiccup must not lose a paid ticket.
export const deliverTicket = async (ticket) => {
  if (delivering.has(ticket.paystackReference)) return ticket.emailSent;
  delivering.add(ticket.paystackReference);
  try {
    const pdf = await generateTicketPdf(ticket);
    const png = await generateTicketPng(pdf);
    await sendTicketEmail(ticket, pdf, png);
    ticket.emailSent = true;
    await ticket.save();
    return true;
  } catch (err) {
    console.error(`Email failed for ${ticket.ticketNumber}:`, err.message);
    return false;
  } finally {
    delivering.delete(ticket.paystackReference);
  }
};

/**
 * Turns a confirmed Paystack payment into a ticket.
 * Safe to call many times for the same reference (browser callback + webhook + retries):
 * a reference can only ever produce one ticket.
 */
export const fulfillPayment = async (reference) => {
  if (!isValidReference(reference))
    throw new HttpError(400, "Invalid payment reference.");

  let ticket = await Ticket.findOne({ paystackReference: reference });
  if (ticket) {
    if (!ticket.emailSent) await deliverTicket(ticket); // retry a failed email
    return ticket;
  }

  // Ask Paystack directly — never trust what the browser says.
  const tx = await verifyTransaction(reference);

  if (tx.status !== "success") {
    throw new HttpError(
      402,
      "This payment was not successful, so no ticket was issued.",
    );
  }
  if (tx.currency !== EVENT.currency || tx.amount < EVENT.priceKobo) {
    throw new HttpError(
      400,
      "The amount paid does not match the ticket price.",
    );
  }

  const email = tx.customer?.email;
  if (!email)
    throw new HttpError(400, "No email address found on this payment.");
  const rawName = tx.metadata?.name;
  const name = (
    typeof rawName === "string" && rawName.trim() ? rawName : "Guest"
  )
    .trim()
    .slice(0, 80);

  try {
    ticket = await Ticket.create({
      name,
      email,
      ticketNumber: await nextTicketNumber(),
      paystackReference: reference,
      amountPaid: tx.amount,
    });
  } catch (err) {
    // Another request (e.g. the webhook) created it a moment ago.
    if (err.code === 11000)
      return Ticket.findOne({ paystackReference: reference });
    throw err;
  }

  await deliverTicket(ticket);
  return ticket;
};
