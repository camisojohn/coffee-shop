export const CUR = "₱";

export const fmt = (n) =>
  CUR + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const pad = (no) => "#" + String(no).padStart(3, "0");

// Rule 12: no mixed emoji. Placeholder tiles show a plain initial instead.
export const placeholderIcon = (cat) => (cat ? String(cat).trim().charAt(0).toUpperCase() : "·");

// Payment method is stored as a short suffix on the customer name so no
// database change is needed:  "Ana · QR"  ->  { name: "Ana", payment: "qr" }
// Anything without the suffix is "pay at the counter".
const TAG = " · QR";
export const tagName = (name, payment) => (payment === "qr" ? name.slice(0, 24) + TAG : name);
export const parseName = (raw) => {
  const s = String(raw || "");
  return s.endsWith(TAG) ? { name: s.slice(0, -TAG.length), payment: "qr" } : { name: s, payment: "counter" };
};
