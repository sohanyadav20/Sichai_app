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
