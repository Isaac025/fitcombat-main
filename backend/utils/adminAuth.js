import crypto from "crypto";

// ---------------------------------------------------------------------------
// Minimal admin auth with NO extra dependencies.
//   ADMIN_EMAIL, ADMIN_PASSWORD  -> the one admin login (set on Render)
//   ADMIN_JWT_SECRET             -> long random string used to sign login tokens
// A login returns a signed token (HS256 JWT-style) that expires after 12 hours.
// ---------------------------------------------------------------------------

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

const b64u = (input) => Buffer.from(input).toString("base64url");

const hmac = (data) =>
  crypto
    .createHmac("sha256", process.env.ADMIN_JWT_SECRET)
    .update(data)
    .digest("base64url");

// Constant-time string comparison (hashing first makes the lengths equal).
const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export const adminConfigured = () =>
  Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_JWT_SECRET &&
      process.env.ADMIN_JWT_SECRET.length >= 16,
  );

export const credentialsMatch = (email, password) => {
  const emailOk = safeEqual(
    String(email || "").trim().toLowerCase(),
    process.env.ADMIN_EMAIL.trim().toLowerCase(),
  );
  const passOk = safeEqual(password || "", process.env.ADMIN_PASSWORD);
  return emailOk && passOk; // both are always computed
};

export const signToken = (email) => {
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64u(
    JSON.stringify({
      sub: email,
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
  );
  return `${header}.${payload}.${hmac(`${header}.${payload}`)}`;
};

export const verifyToken = (token) => {
  try {
    const [header, payload, sig] = String(token).split(".");
    if (!header || !payload || !sig) return null;
    if (!safeEqual(sig, hmac(`${header}.${payload}`))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.role !== "admin" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
};

// Express middleware: only lets a valid admin token through.
export const requireAdmin = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!adminConfigured()) {
    return res.status(503).json({ message: "Admin access is not configured on the server." });
  }
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ message: "Please log in again." });
  req.admin = data;
  next();
};

// Simple in-memory brute-force guard: 8 failed logins per IP per 15 minutes.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

export const loginAllowed = (ip) => {
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < Date.now()) return true;
  return rec.count < MAX_FAILS;
};
export const recordLoginFailure = (ip) => {
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < Date.now()) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    rec.count += 1;
  }
};
export const clearLoginFailures = (ip) => attempts.delete(ip);
