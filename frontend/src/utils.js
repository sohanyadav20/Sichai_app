export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const DEFAULT_RATE = 60;

// Rates list me se us tareekh par lagu rate nikalo (effectiveFrom <= date wale me sabse naya).
// Koi rate set nahi ho to DEFAULT_RATE.
export function rateForDate(rates, date) {
  let best = null;
  for (const r of rates || []) {
    if (r.effectiveFrom <= date && (!best || r.effectiveFrom > best.effectiveFrom)) {
      best = r;
    }
  }
  return best ? best.rate : DEFAULT_RATE;
}

export const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

// ================= ईख की पेराई (गन्ना पेराई) =================
// Isme paisa ghante se nahi, "नाद" (ras ki matra) x rate se banta hai (jaise ₹30 / नाद).
export const DEFAULT_PERAI_RATE = 30;
export const PERAI_CROP = 'ईख पेराई';

export const isPerai = (e) => !!e && e.type === 'perai';

// Chhota sa number: 2.50 -> "2.5", 3 -> "3"
export const fmtNum = (n) => String(Number(Number(n || 0).toFixed(2)));

// Entries ko do hisson me baanto: सिंचाई aur ईख पेराई
export function splitEntries(entries) {
  const sichai = [];
  const perai = [];
  (entries || []).forEach((e) => (isPerai(e) ? perai : sichai).push(e));
  return { sichai, perai };
}

export const sumCost = (rows) => (rows || []).reduce((s, e) => s + e.cost, 0);

// Form me live "अनुमानित राशि" dikhane ke liye
export function previewCost(form) {
  const rate = Number(form.rate) || 0;
  if (form.type === 'perai') return (Number(form.nad) || 0) * rate;
  return (((Number(form.hours) || 0) * 60 + (Number(form.minutes) || 0)) / 60) * rate;
}
