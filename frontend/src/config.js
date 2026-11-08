// Single place for event details + environment config.
export const EVENT = {
  name: "FIT COMBAT",
  subtitle: "CHALLENGE ZONE",
  weekday: "Saturday",
  dateLabel: "12 December 2026",
  dateShort: "12 · 12 · 2026",
  startsAt: "2026-12-12T07:00:00+01:00", // Lagos time (WAT)
  timeLabel: "7:00 AM – 9:00 AM",
  venueName: "Fusi Event Center",
  venueLines: ["Brasas’R Place", "Victoria Arobieke St", "Lekki Phase 1"],
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Fusi+Event+Center+Lekki+Phase+1+Lagos",
  price: 10000, // naira — the backend independently checks this amount
  phone: "+2349034372316",
  email: "fitcombat02@gmail.com",
};

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export const formatNaira = (n) => `₦${Number(n).toLocaleString("en-NG")}`;
