import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    ticketNumber: { type: String, required: true, unique: true },
    // The Paystack reference. Unique => one payment can only ever produce one ticket.
    paystackReference: { type: String, required: true, unique: true },
    amountPaid: { type: Number, required: true }, // in kobo
    paid: { type: Boolean, default: true },
    emailSent: { type: Boolean, default: false },
    checkedIn: { type: Boolean, default: false }, // handy for the door on event day
  },
  { timestamps: true },
);

export default mongoose.model("Ticket", ticketSchema);
