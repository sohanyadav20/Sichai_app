const crypto = require('crypto');

// Koi naya npm package nahi chahiye — Node ka built-in `crypto` use kiya hai.

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // login 12 ghante tak valid

function secret() {
  return process.env.JWT_SECRET || process.env.ADMIN_KEY || 'change-me';
}

// ---------- Password hashing ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64);
  const orig = Buffer.from(hash, 'hex');
  return orig.length === test.length && crypto.timingSafeEqual(orig, test);
}

// ---------- Signed token ----------
function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// ---------- Middlewares ----------
// Login hona zaroori (owner ya staff).
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (payload) {
    req.admin = payload; // { u: username, r: 'owner' | 'staff' }
    return next();
  }
  // Purana tarika (x-admin-key header) — owner maana jayega
  const key = req.headers['x-admin-key'];
  if (key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) {
    req.admin = { u: 'owner', r: 'owner' };
    return next();
  }
  return res.status(401).json({ error: 'लॉगिन ज़रूरी है।' });
}

// Sirf owner (users manage karne ke liye).
function requireOwner(req, res, next) {
  if (req.admin && req.admin.r === 'owner') return next();
  return res.status(403).json({ error: 'यह काम सिर्फ मालिक (owner) कर सकता है।' });
}

// ---------- Simple login brute-force rokne ke liye ----------
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function loginLimiter(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.resetAt > now && rec.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'बहुत ज़्यादा गलत कोशिशें। 15 मिनट बाद फिर कोशिश करें।' });
  }
  req.recordFailedLogin = () => {
    const cur = attempts.get(ip);
    if (!cur || cur.resetAt <= now) {
      attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      cur.count += 1;
    }
  };
  req.clearFailedLogins = () => attempts.delete(ip);
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAdmin,
  requireOwner,
  loginLimiter
};
