import mongoose from "mongoose";

// Atomic counter => ticket numbers are sequential and can never collide.
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

export default mongoose.model("Counter", counterSchema);
