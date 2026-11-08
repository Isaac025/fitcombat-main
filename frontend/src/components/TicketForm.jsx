import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { usePaystackPayment } from "react-paystack";
import { API_URL, EVENT, PAYSTACK_PUBLIC_KEY, formatNaira } from "../config";
import { CheckIcon, DownloadIcon, LockIcon } from "./Icons";

// A fresh, unique reference for every payment attempt.
const newReference = () =>
  `FC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Remember an in-flight payment so we can still confirm it if the page reloads
// (common when the buyer jumps to the OPay / bank app and comes back).
const PENDING_KEY = "fc_pending_payment";
const PENDING_MAX_AGE = 3 * 60 * 60 * 1000; // 3 hours
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const savePending = (reference) => {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ reference, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
};
const clearPending = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
};
const readPending = () => {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    return p && Date.now() - p.at < PENDING_MAX_AGE ? p.reference : null;
  } catch {
    return null;
  }
};

const TicketForm = () => {
  const [form, setForm] = useState({ name: "", email: "" });
  const [reference, setReference] = useState(newReference);
  // idle | paying | verifying | success | error
  const [status, setStatus] = useState("idle");
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState("");
  const [paidReference, setPaidReference] = useState(null);

  const name = form.name.trim();
  const email = form.email.trim();

  const initializePayment = usePaystackPayment({
    reference,
    email,
    amount: EVENT.price * 100, // Paystack works in kobo
    currency: "NGN",
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      name,
      custom_fields: [
        { display_name: "Full name", variable_name: "full_name", value: name },
        {
          display_name: "Event",
          variable_name: "event",
          value: "FIT COMBAT Challenge Zone",
        },
      ],
    },
  });

  const confirmingRef = useRef(false);

  // Ask our server to confirm the payment with Paystack. The server — not the
  // browser — decides whether a ticket is issued.
  //
  // Wallet / transfer payments (OPay, bank transfer, USSD) can take a little while to
  // settle, and a sleeping free-tier server can take ~1 minute to wake. So instead of
  // one attempt, we keep asking until the payment is confirmed or we run out of time.
  //   quiet = true: used when the popup was closed without a success callback. If Paystack
  //   says the payment was never made, we silently go back to the form (they just cancelled).
  const confirmPayment = useCallback(async (ref, { quiet = false } = {}) => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setStatus("verifying");
    setMessage("");
    setPaidReference(ref);

    const deadline = Date.now() + 3 * 60 * 1000;
    let lastMessage = "";
    try {
      while (Date.now() < deadline) {
        try {
          const res = await axios.post(
            `${API_URL}/api/tickets/verify`,
            { reference: ref },
            { timeout: 30000, validateStatus: (s) => s === 200 || s === 202 },
          );
          if (res.status === 200) {
            clearPending();
            setTicket(res.data.ticket);
            setStatus("success");
            return;
          }
          lastMessage = res.data?.message || "";
        } catch (err) {
          const code = err.response?.status;
          // 4xx = a definite answer from the server (not paid / wrong amount / bad reference)
          if (code && code >= 400 && code < 500) {
            if (quiet && (code === 402 || code === 404)) {
              clearPending();
              setPaidReference(null);
              setStatus("idle");
              return;
            }
            setMessage(
              err.response?.data?.message ||
                "We couldn’t confirm your payment.",
            );
            setStatus("error");
            return;
          }
          // Network error / timeout / 5xx (server waking up) → try again
          lastMessage = "We couldn’t reach the server to confirm your payment.";
        }
        await sleep(4000);
      }
      // Ran out of time. Keep the reference so they can retry — and the webhook may still finish it.
      setMessage(lastMessage || "Your payment is still being confirmed.");
      setStatus("error");
    } finally {
      confirmingRef.current = false;
    }
  }, []);

  // Pick up a payment that was started before a page reload / app switch.
  useEffect(() => {
    const pending = readPending();
    if (pending) confirmPayment(pending, { quiet: true });
  }, [confirmPayment]);

  // Wake the (free-tier) backend while the buyer fills in the form.
  useEffect(() => {
    axios.get(`${API_URL}/`, { timeout: 60000 }).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!PAYSTACK_PUBLIC_KEY) {
      setMessage(
        "Payments are not configured yet (missing Paystack public key).",
      );
      setStatus("error");
      setPaidReference(null);
      return;
    }
    setMessage("");
    setStatus("paying");
    savePending(reference);
    initializePayment({
      onSuccess: (response) => confirmPayment(response.reference || reference),
      // The popup closed. For OPay / transfer / USSD the success callback often never
      // fires, so ask the server whether the payment actually went through.
      onClose: () => confirmPayment(reference, { quiet: true }),
    });
  };

  const reset = () => {
    setForm({ name: "", email: "" });
    setTicket(null);
    setPaidReference(null);
    setMessage("");
    clearPending();
    setReference(newReference());
    setStatus("idle");
  };

  /* ---------- Success ---------- */
  if (status === "success" && ticket) {
    return (
      <div className="form-card form-card--success" role="status">
        <span className="success-badge">
          <CheckIcon width={30} height={30} />
        </span>
        <h3>You’re in, {ticket.name.split(" ")[0]}!</h3>
        <p className="muted">Payment confirmed. Your ticket number is</p>
        <p className="success-number">{ticket.ticketNumber}</p>
        <p className="muted">
          {ticket.emailSent ? (
            <>
              We’ve emailed your ticket (PDF) to <strong>{ticket.email}</strong>
              . Check your spam folder if you don’t see it in a few minutes.
            </>
          ) : (
            <>
              Your email is taking longer than usual — you can download your
              ticket right now below.
            </>
          )}
        </p>
        <a
          className="btn btn--gold btn--block"
          href={`${API_URL}/api/tickets/download/${encodeURIComponent(ticket.paystackReference)}`}
        >
          <DownloadIcon width={20} height={20} /> Download ticket
        </a>
        <button type="button" className="link-btn" onClick={reset}>
          Buy another ticket
        </button>
      </div>
    );
  }

  /* ---------- Paid, but confirmation failed ---------- */
  if (status === "error" && paidReference) {
    return (
      <div className="form-card" role="alert">
        <h3>Almost there</h3>
        <p className="notice notice--warn">{message}</p>
        <p className="muted">
          If you were charged, don’t pay again. Your payment reference is{" "}
          <strong className="ref">{paidReference}</strong>. Tap retry — or email{" "}
          <a href={`mailto:${EVENT.email}`}>{EVENT.email}</a> with that
          reference.
        </p>
        <button
          type="button"
          className="btn btn--gold btn--block"
          onClick={() => confirmPayment(paidReference)}
        >
          Retry confirmation
        </button>
      </div>
    );
  }

  /* ---------- Form ---------- */
  const busy = status === "paying" || status === "verifying";

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate={false}>
      <h3>Get your ticket</h3>
      <p className="muted">
        Your ticket is emailed to you as a PDF as soon as payment is confirmed.
      </p>

      <label className="field">
        <span>Full name</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          placeholder="e.g. Ada Okafor"
          required
          minLength={2}
          value={form.name}
          disabled={busy}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Email address</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          value={form.email}
          disabled={busy}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <small>Your ticket will be sent here — double-check it.</small>
      </label>

      {status === "verifying" && (
        <p className="notice" role="status">
          Confirming your payment — this can take up to a minute for OPay /
          transfers. Please keep this page open.
        </p>
      )}

      {status === "error" && !paidReference && (
        <p className="notice notice--warn" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        className="btn btn--gold btn--block"
        disabled={busy}
      >
        {status === "verifying"
          ? "Confirming your payment…"
          : status === "paying"
            ? "Complete payment in the popup…"
            : `Buy ticket — ${formatNaira(EVENT.price)}`}
      </button>

      <p className="secure">
        <LockIcon width={16} height={16} /> Secure payment by Paystack · Card,
        bank transfer & USSD
      </p>
    </form>
  );
};

export default TicketForm;
