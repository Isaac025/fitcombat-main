// Single source of truth for event details used in the PDF, email and payment checks.
export const EVENT = {
  name: "FIT COMBAT",
  subtitle: "CHALLENGE ZONE",
  dateLabel: "12 December 2026",
  dateShort: "12 · 12 · 2026",
  timeLabel: "7:00 AM – 9:00 AM",
  venueName: "Fusi Event Center",
  venueAddress: "Brasas’R Place, Victoria Arobieke St, Lekki Phase 1",
  // Short forms used on the ticket artwork
  ticketDateShort: "DEC 12",
  ticketTimeShort: "07:00 AM",
  ticketVenueLines: [
    "FUSI EVENT CENTER",
    "BRASAS'R PLACE",
    "VICTORIA AROBIEKE ST",
    "LEKKI PHASE 1",
  ],
  priceNaira: 10000,
  priceKobo: 10000 * 100, // Paystack amounts are in kobo
  currency: "NGN",
  contactEmail: "support@fitcombat.online",
  contactPhone: "+2349034372316",
};
