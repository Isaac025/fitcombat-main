import PDFDocument from "pdfkit";
import fs from "fs";
import { fileURLToPath } from "url";
import { EVENT } from "../config/event.js";

const asset = (p) => fileURLToPath(new URL(`../assets/${p}`, import.meta.url));
const PHOTO = fs.readFileSync(asset("ticket-photo.jpg"));

// Design palette (from the ticket artwork)
const BG = "#010101";
const TAN = "#DDB18C";
const GRAY = "#8c8c8c";
const INK = "#141414";

// The artwork is laid out on a 1000 x 323 grid and the page uses the same units.
// (Prints/zooms to any size — it's a vector PDF.)
const DW = 1000;
const DH = 323;

const BARCODE_BOX = { x: 868, y: 22, w: 64, h: 280 };

// Real, scannable Code 128 barcode (vertical). If the library is unavailable for any
// reason we fall back to a decorative one — a paid ticket must never fail to generate.
const makeBarcode = async (text) => {
  try {
    const { default: bwipjs } = await import("bwip-js");
    return await bwipjs.toBuffer({
      bcid: "code128",
      text,
      scale: 4,
      height: 12,
      includetext: false,
      rotate: "R",
      barcolor: "141414",
      backgroundcolor: TAN.slice(1),
    });
  } catch (err) {
    console.warn(
      "Barcode library unavailable, using decorative barcode:",
      err.message,
    );
    return null;
  }
};

const drawDecorativeBarcode = (doc, text) => {
  let seed = [...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  let y = BARCODE_BOX.y;
  while (y < BARCODE_BOX.y + BARCODE_BOX.h) {
    const bar = 1.5 + Math.floor(rnd() * 4) * 1.2;
    const gap = 1.5 + Math.floor(rnd() * 3) * 1.2;
    doc
      .rect(
        BARCODE_BOX.x,
        y,
        BARCODE_BOX.w,
        Math.min(bar, BARCODE_BOX.y + BARCODE_BOX.h - y),
      )
      .fill(INK);
    y += bar + gap;
  }
};

// SVG arc path helper (angles in degrees, 0 = east, 90 = south, as drawn on screen)
const arcPath = (cx, cy, r, a0, a1) => {
  const rad = (a) => (a * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0));
  const y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};

/**
 * Builds the ticket PDF fully in memory and resolves with a Buffer
 * (so we never email a half-written file).
 */
export const generateTicketPdf = async ({ name, ticketNumber }) => {
  const barcode = await makeBarcode(ticketNumber);

  const doc = new PDFDocument({
    size: [DW, DH],
    margin: 0,
    info: { Title: `FIT COMBAT Ticket ${ticketNumber}`, Author: "FIT COMBAT" },
  });
  doc.registerFont("Bold", asset("fonts/Poppins-Bold.ttf"));
  doc.registerFont("Medium", asset("fonts/Poppins-Medium.ttf"));
  doc.registerFont("Naira", asset("fonts/LiberationSans-Bold.ttf")); // Poppins has no ₦

  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const finished = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Distance from the top of a text box to its baseline
  const ascent = (size) => (doc._font.ascender / 1000) * size;
  // Text positioned by BASELINE (easier to line up with the artwork)
  const textAt = (str, x, baseline, size, opts = {}) =>
    doc
      .fontSize(size)
      .text(str, x, baseline - ascent(size), { lineBreak: false, ...opts });

  /* ---------- Background ---------- */
  doc.rect(0, 0, DW, DH).fill(BG);

  /* ---------- Vinyl record (behind the photo) ---------- */
  const vx = 567,
    vy = 222;
  doc
    .lineWidth(1.6)
    .strokeColor(TAN)
    .strokeOpacity(0.85)
    .circle(vx, vy, 122)
    .stroke();
  const grooves = [
    [108, 105, 255, [14, 5]],
    [99, 100, 250, [4, 3, 18, 6]],
    [90, 108, 258, [22, 4]],
    [81, 100, 246, [6, 4, 12, 5]],
    [72, 110, 252, [3, 3, 20, 5]],
    [63, 104, 248, [16, 5, 4, 4]],
    [54, 112, 244, [10, 4]],
    [45, 108, 240, [5, 4, 14, 4]],
  ];
  grooves.forEach(([r, a0, a1, pat], i) => {
    doc.lineWidth(i % 2 ? 1.4 : 1.9).strokeOpacity(0.7);
    doc.dash(pat[0], { space: pat[1] ?? 4 });
    doc.path(arcPath(vx, vy, r, a0, a1)).stroke();
    doc.undash();
  });
  doc.strokeOpacity(1);

  /* ---------- Photo with diagonal edge ---------- */
  doc.save();
  doc.polygon([590, 0], [848, 0], [848, DH], [493, DH]).clip();
  doc.image(PHOTO, 487, 0, { width: 361, height: DH });
  doc.restore();
  doc.lineWidth(2.4).strokeColor(TAN).moveTo(587, 0).lineTo(490, DH).stroke();

  /* ---------- Top-left: label + attendee ---------- */
  doc.font("Bold").fillColor(TAN);
  textAt("FITNESS EVENT", 22, 40, 14.5, { characterSpacing: 0.4 });

  doc.font("Medium").fillColor(GRAY);
  textAt("ATTENDEE", 22, 57, 8, { characterSpacing: 2 });
  doc.font("Bold").fillColor(TAN);
  doc
    .fontSize(13)
    .text(name.toUpperCase(), 22, 61, {
      width: 330,
      height: 16,
      ellipsis: true,
    });

  /* ---------- Price pill ---------- */
  doc.lineWidth(2).strokeColor(TAN).roundedRect(385, 33, 114, 45, 14).stroke();
  doc.lineWidth(1.8).roundedRect(393, 44, 25, 25, 7).stroke();
  doc.font("Naira").fillColor(TAN);
  textAt("₦", 393, 63, 17, { width: 25, align: "center" });
  doc.font("Bold");
  textAt("PRICE:", 422, 53, 11, { width: 74, align: "center" });
  textAt(EVENT.priceNaira.toLocaleString("en-NG"), 422, 72, 20, {
    width: 74,
    align: "center",
  });

  /* ---------- Logo: dumbbell + FIT + curved COMBAT ---------- */
  const LX = 193; // logo centre line
  const plate = (cx, cy, w, h, angle, lw = 2.2) => {
    doc.save();
    doc.translate(cx, cy).rotate(angle);
    doc
      .lineWidth(lw)
      .strokeColor(GRAY)
      .fillColor(BG)
      .roundedRect(-w / 2, -h / 2, w, h, 3)
      .fillAndStroke();
    doc.restore();
  };
  // outer small plates first so the big plate overlaps them
  plate(LX - 107, 150, 12, 40, -7, 1.8);
  plate(LX + 107, 150, 12, 40, 7, 1.8);
  plate(LX - 96, 150, 20, 62, -7, 2);
  plate(LX + 96, 150, 20, 62, 7, 2);
  plate(LX - 76, 149, 36, 100, -7);
  plate(LX + 76, 149, 36, 100, 7);
  // inner grip band on the big plates
  doc.lineWidth(2).strokeColor(GRAY);
  [
    [-1, -7],
    [1, 7],
  ].forEach(([side, ang]) => {
    doc
      .save()
      .translate(LX + side * 76, 149)
      .rotate(ang);
    doc.moveTo(-14, 30).lineTo(14, 30).stroke();
    doc.restore();
  });
  // arched bar
  doc.lineWidth(2.4).strokeColor(GRAY);
  doc
    .moveTo(LX - 58, 139)
    .quadraticCurveTo(LX, 112, LX + 58, 139)
    .stroke();
  doc
    .moveTo(LX - 55, 156)
    .quadraticCurveTo(LX, 129, LX + 55, 156)
    .stroke();

  // FIT — outlined block letters
  doc.font("Bold");
  const fitSize = (88 * 100) / doc.fontSize(100).widthOfString("FIT");
  doc.fontSize(fitSize);
  const fitW = doc.widthOfString("FIT");
  doc.lineWidth(2.2).strokeColor(TAN).fillColor(BG);
  textAt("FIT", LX - fitW / 2, 126, fitSize, { fill: true, stroke: true });

  // COMBAT — letters placed along an arc
  const arcSize = 20;
  const R = 96;
  const arcCy = 184 + R;
  doc.font("Bold").fontSize(arcSize).fillColor(TAN);
  const letters = [..."COMBAT"];
  const widths = letters.map((c) => doc.widthOfString(c));
  const spacing = 0.6;
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * (letters.length - 1);
  let pos = -total / 2;
  letters.forEach((ch, i) => {
    const theta = (pos + widths[i] / 2) / R;
    const x = LX + R * Math.sin(theta);
    const y = arcCy - R * Math.cos(theta);
    doc
      .save()
      .translate(x, y)
      .rotate((theta * 180) / Math.PI);
    doc
      .fontSize(arcSize)
      .text(ch, -widths[i] / 2, -ascent(arcSize), { lineBreak: false });
    doc.restore();
    pos += widths[i] + spacing;
  });

  /* ---------- Venue box + date/time pills ---------- */
  doc
    .lineWidth(1.6)
    .strokeColor(TAN)
    .roundedRect(32, 222, 184, 88, 16)
    .stroke();
  doc.font("Bold").fillColor(TAN);
  EVENT.ticketVenueLines.forEach((line, i) =>
    textAt(line, 46, 241 + i * 18.4, 12.2),
  );

  const pill = (label, x, w) => {
    doc
      .lineWidth(1.6)
      .strokeColor(TAN)
      .roundedRect(x, 265, w, 27, 13.5)
      .stroke();
    doc.font("Bold").fillColor(TAN);
    textAt(label, x, 283.5, 12.5, { width: w, align: "center" });
  };
  pill(EVENT.ticketDateShort, 250, 70);
  pill(EVENT.ticketTimeShort, 331, 80);

  /* ---------- Tan stub: barcode + ticket number ---------- */
  doc.rect(848, 0, DW - 848, DH).fill(TAN);

  if (barcode) {
    doc.image(barcode, BARCODE_BOX.x, BARCODE_BOX.y, {
      width: BARCODE_BOX.w,
      height: BARCODE_BOX.h,
    });
  } else {
    drawDecorativeBarcode(doc, ticketNumber);
  }

  // "TICKET NUMBER: ..." reading bottom → top, shrunk to fit the stub height
  const label = `TICKET NUMBER: ${ticketNumber}`;
  const spacingPx = 2.2;
  doc.font("Medium");
  let size = 15;
  while (
    size > 8 &&
    doc.fontSize(size).widthOfString(label, { characterSpacing: spacingPx }) >
      276
  )
    size -= 0.5;
  doc.save().translate(952, 300).rotate(-90);
  doc
    .fillColor(INK)
    .fontSize(size)
    .text(label, 0, 0, { characterSpacing: spacingPx, lineBreak: false });
  doc.restore();

  doc.end();
  return finished;
};
