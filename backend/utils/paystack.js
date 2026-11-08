import crypto from "crypto";
import { HttpError } from "./HttpError.js";

const PAYSTACK_API = "https://api.paystack.co";

// Ask Paystack (server → server) what really happened with this payment.
export const verifyTransaction = async (reference) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new HttpError(500, "Payments are not configured on the server.");
  }

  let res;
  try {
    res = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    );
  } catch {
    throw new HttpError(502, "Could not reach Paystack. Please try again.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.status || !body.data) {
    throw new HttpError(
      res.status === 404 ? 404 : 502,
      body?.message || "Could not verify this payment with Paystack.",
    );
  }
  return body.data;
};

// Paystack signs webhook bodies with HMAC-SHA512 using your secret key.
export const isValidWebhookSignature = (rawBody, signature) => {
  if (!rawBody || !signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
