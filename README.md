# FIT COMBAT — landing page + paid tickets

```
frontend/   React (Vite) landing page + Paystack popup
backend/    Express + MongoDB: verifies payment, makes the PDF ticket, emails it
```

## How a purchase works
1. Buyer enters name + email → clicks **Buy ticket** → Paystack popup (card / transfer / USSD).
2. When the popup reports success, the frontend sends only the **payment reference** to `POST /api/tickets/verify`.
3. The backend asks Paystack (using the **secret key**) whether that payment really succeeded and was ≥ ₦10,000.
4. If yes: it assigns the next ticket number (`FITC-0001`, `FITC-0002`, …), builds the PDF, saves the ticket, and emails it.
5. A Paystack **webhook** does the same thing as a backup, in case the buyer closes the tab right after paying.
   A reference can only ever produce one ticket, so double calls are harmless.

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env        # then fill in the values
npm run dev
```
`.env` needs: `MONGO_URI`, `PAYSTACK_SECRET_KEY` (sk_test_… / sk_live_…), `EMAIL_USER`, `EMAIL_PASS` (Gmail **App password**), `CLIENT_URL`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # then fill in the values
npm run dev
```
`.env` needs: `VITE_PAYSTACK_PUBLIC_KEY` (pk_test_… / pk_live_…) and `VITE_API_URL` (your backend URL).

### Paystack webhook (recommended)
Paystack Dashboard → Settings → API Keys & Webhooks → set the **Webhook URL** to
`https://YOUR-BACKEND/api/tickets/webhook`
(Paystack can't reach `localhost`; use a deployed URL or a tunnel such as ngrok while testing.)

## Testing payments
Use your **test** keys and Paystack's test card: `4084 084 084 084 084`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.
Switch to `pk_live_` / `sk_live_` only when you're ready to take real money.

## Things to change in one place
- Event details / price: `frontend/src/config.js` **and** `backend/config/event.js` (the backend price is what's enforced).
- Hero photo: `frontend/src/assets/fitcombat-hero.jpg` (a crop of your flyer). A higher-resolution original will look sharper.
- Ticket photo: `backend/assets/ticket-banner.jpg`.
