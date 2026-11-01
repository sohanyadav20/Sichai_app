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
const trimNum = (n) => String(Number(Number(n).toFixed(2)));

// Table me "मात्रा" column: "2 घं. 30 मि." ya "3 नाद"
export function qtyLabel(e) {
  if (isPerai(e)) return `${trimNum(e.nad)} नाद`;
  const parts = [];
  if (e.hours > 0) parts.push(`${e.hours} घं.`);
  if (e.minutes > 0) parts.push(`${e.minutes} मि.`);
  return parts.join(' ') || '0';
}

// "60/घंटा" ya "30/नाद"
export const rateLabel = (e) => `${e.rate}/${isPerai(e) ? 'नाद' : 'घंटा'}`;

// Entries ka kul — sichai ke ghante aur perai ke नाद alag-alag: "12.5 घंटे + 6.5 नाद"
export function totalsLabel(entries) {
  let hours = 0;
  let nad = 0;
  (entries || []).forEach((e) => {
    if (isPerai(e)) nad += Number(e.nad) || 0;
    else hours += (Number(e.hours) || 0) + (Number(e.minutes) || 0) / 60;
  });
  const parts = [];
  if (hours > 0) parts.push(`${hours.toFixed(1)} घंटे`);
  if (nad > 0) parts.push(`${trimNum(nad)} नाद`);
  return parts.join(' + ') || '—';
}

// Form me live "अनुमानित राशि" dikhane ke liye
export function previewCost(form) {
  const rate = Number(form.rate) || 0;
  if (form.type === 'perai') return (Number(form.nad) || 0) * rate;
  return (((Number(form.hours) || 0) * 60 + (Number(form.minutes) || 0)) / 60) * rate;
}
