// Client-side card checks for the (not yet active) credit-card form. Nothing here talks to a server.
export const digits = (s: string) => s.replace(/\D/g, "");

export function luhn(num: string) {
  const d = digits(num);
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): "visa" | "mastercard" | "amex" | "diners" | "isracard" | undefined {
  const d = digits(num);
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^3(0[0-5]|[68])/.test(d)) return "diners";
  if (d.length >= 8 && d.length <= 9 && !/^[2-6]/.test(d)) return "isracard"; // local 8–9 digit cards (no Luhn)
  return undefined;
}

/** Group digits for display: 4-4-4-4, Amex 4-6-5. */
export function formatCard(num: string) {
  const d = digits(num).slice(0, 19);
  const parts = /^3[47]/.test(d) ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const out: string[] = [];
  let i = 0;
  for (const n of parts) { if (i >= d.length) break; out.push(d.slice(i, i + n)); i += n; }
  return out.join(" ");
}

export const formatExpiry = (s: string) => { const d = digits(s).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

export function expiryOk(s: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(s);
  if (!m) return false;
  const mm = Number(m[1]), yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

/** Israeli ID (ת.ז) check digit. */
export function israeliIdOk(id: string) {
  const d = digits(id);
  if (!d.length || d.length > 9) return false;
  const p = d.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) { let n = Number(p[i]) * ((i % 2) + 1); if (n > 9) n -= 9; sum += n; }
  return sum % 10 === 0 && Number(p) > 0;
}

/** Installments offered by order total (₪ incl. VAT). */
export const maxInstallments = (total: number) => (total >= 3000 ? 6 : total >= 1000 ? 3 : total >= 300 ? 2 : 1);
