/**
 * Chilean RUT (Rol Único Tributario) utilities.
 *
 * Format: "12.345.678-9" or "12345678-9" — last digit is the DV (verification digit).
 * DV is computed by modulo-11 algorithm.
 */

/** Strip dots and dashes; uppercase any 'k'. */
export function cleanRut(rut: string): string {
  if (!rut) return "";
  return rut.replace(/[.-]/g, "").trim().toUpperCase();
}

/** Compute the expected verification digit for the body portion (digits without DV). */
export function computeDV(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return "0";
  if (rest === 10) return "K";
  return String(rest);
}

/** Validates a Chilean RUT string. Accepts formats with or without dots/dashes. */
export function isValidRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeDV(body) === dv;
}

/** Formats a RUT into "12.345.678-9" form. Leaves invalid input untouched. */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  // Insert dots every 3 from the right
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}
