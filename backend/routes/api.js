const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Entry = require('../models/Entry');
const Payment = require('../models/Payment');
const Rate = require('../models/Rate');
const Admin = require('../models/Admin');
const {
  hashPassword,
  verifyPassword,
  signToken,
  requireAdmin,
  requireOwner,
  loginLimiter
} = require('../auth');

const round2 = (n) => Math.round(n * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ================= Admin login & users =================
// Username khaali (ya "owner") + ADMIN_KEY = owner. Baaki users database me hote hain (staff).
router.post('/admin/login', loginLimiter, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!password) {
      return res.status(401).json({ error: 'पासवर्ड डालें।' });
    }

    if (!username || username === 'owner') {
      if (process.env.ADMIN_KEY && password === process.env.ADMIN_KEY) {
        req.clearFailedLogins();
        return res.json({
          token: signToken({ u: 'owner', r: 'owner' }),
          username: 'owner',
          role: 'owner'
        });
      }
      req.recordFailedLogin();
      return res.status(401).json({ error: 'गलत पासवर्ड।' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      req.recordFailedLogin();
      return res.status(401).json({ error: 'गलत यूज़रनेम या पासवर्ड।' });
    }
    req.clearFailedLogins();
    res.json({
      token: signToken({ u: admin.username, r: 'staff' }),
      username: admin.username,
      role: 'staff'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users', requireAdmin, requireOwner, async (req, res) => {
  try {
    const users = await Admin.find().select('username createdAt').sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/users', requireAdmin, requireOwner, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res
        .status(400)
        .json({ error: 'यूज़रनेम 3-20 अक्षर का हो (a-z, 0-9, _), बिना स्पेस के।' });
    }
    if (username === 'owner') {
      return res.status(400).json({ error: '"owner" नाम इस्तेमाल नहीं कर सकते।' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'पासवर्ड कम से कम 4 अक्षर का हो।' });
    }
    if (await Admin.findOne({ username })) {
      return res.status(400).json({ error: 'यह यूज़रनेम पहले से मौजूद है।' });
    }
    const admin = await Admin.create({ username, passwordHash: hashPassword(password) });
    res.status(201).json({ _id: admin._id, username: admin.username, createdAt: admin.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/users/:id/reset-password', requireAdmin, requireOwner, async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < 4) {
      return res.status(400).json({ error: 'पासवर्ड कम से कम 4 अक्षर का हो।' });
    }
    const admin = await Admin.findByIdAndUpdate(req.params.id, {
      passwordHash: hashPassword(password)
    });
    if (!admin) return res.status(404).json({ error: 'यूज़र नहीं मिला।' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', requireAdmin, requireOwner, async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff apna password khud badal sakta hai (owner ka password ADMIN_KEY se badalta hai)
router.post('/admin/change-password', requireAdmin, async (req, res) => {
  try {
    if (req.admin.r === 'owner') {
      return res.status(400).json({
        error: 'मालिक का पासवर्ड Render में ADMIN_KEY बदलकर ही बदला जा सकता है।'
      });
    }
    const oldPassword = String(req.body.oldPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'नया पासवर्ड कम से कम 4 अक्षर का हो।' });
    }
    const admin = await Admin.findOne({ username: req.admin.u });
    if (!admin || !verifyPassword(oldPassword, admin.passwordHash)) {
      return res.status(400).json({ error: 'पुराना पासवर्ड गलत है।' });
    }
    admin.passwordHash = hashPassword(newPassword);
    await admin.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Farmers =================
// Poori list (phone numbers ke saath) sirf admin ko dikhti hai.
router.get('/farmers', requireAdmin, async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/farmers', requireAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'किसान का नाम लिखें।' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'मोबाइल नंबर लिखें।' });
    }
    const farmer = await Farmer.create({ name: name.trim(), phone: phone.trim() });
    res.status(201).json(farmer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Phone number se farmer dhoondo (kisan wale self-service page ke liye, public) ----
router.get('/farmers/by-phone/:phone', async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ phone: req.params.phone.trim() });
    if (!farmer) {
      return res.status(404).json({ error: 'इस मोबाइल नंबर से कोई किसान नहीं मिला।' });
    }
    res.json(farmer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/farmers/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Farmer.findByIdAndDelete(id);
    await Entry.deleteMany({ farmerId: id });
    await Payment.deleteMany({ farmerId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Farmer ka naam/mobile number sudharo ----
router.put('/farmers/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'किसान का नाम लिखें।' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'मोबाइल नंबर लिखें।' });
    }
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), phone: phone.trim() },
      { new: true }
    );
    if (!farmer) {
      return res.status(404).json({ error: 'किसान नहीं मिला।' });
    }
    res.json(farmer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Entries =================
router.get('/farmers/:id/entries', async (req, res) => {
  try {
    const entries = await Entry.find({ farmerId: req.params.id }).sort({
      date: -1,
      createdAt: -1
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseEntryBody(body) {
  const { date, crop, hours, minutes, rate, place } = body;
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  const r = Number(rate);

  if (!date || !crop || isNaN(r)) return { error: 'सभी फील्ड सही भरें।' };
  if (h === 0 && m === 0) return { error: 'कृपया घंटा या मिनट भरें।' };
  if (m >= 60) return { error: 'मिनट 60 से कम होना चाहिए।' };

  const cost = round2(((h * 60 + m) / 60) * r);
  return { data: { date, crop, place: String(place || '').trim(), hours: h, minutes: m, rate: r, cost } };
}

router.post('/farmers/:id/entries', requireAdmin, async (req, res) => {
  try {
    const parsed = parseEntryBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const entry = await Entry.create({ farmerId: req.params.id, ...parsed.data });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/entries/:id', requireAdmin, async (req, res) => {
  try {
    const parsed = parseEntryBody(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const entry = await Entry.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!entry) return res.status(404).json({ error: 'एंट्री नहीं मिली।' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/entries/:id', requireAdmin, async (req, res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Payments =================
router.get('/farmers/:id/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ farmerId: req.params.id }).sort({
      date: -1,
      createdAt: -1
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/farmers/:id/payments', requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    const a = Number(amount);
    if (isNaN(a) || a <= 0) {
      return res.status(400).json({ error: 'सही राशि भरें।' });
    }
    const date = new Date().toISOString().slice(0, 10);
    const payment = await Payment.create({ farmerId: req.params.id, date, amount: a });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/payments/:id', requireAdmin, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Summary (ek farmer ka) =================
router.get('/farmers/:id/summary', async (req, res) => {
  try {
    const entries = await Entry.find({ farmerId: req.params.id });
    const payments = await Payment.find({ farmerId: req.params.id });
    const totalCost = entries.reduce((s, e) => s + e.cost, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    res.json({
      totalCost: round2(totalCost),
      totalPaid: round2(totalPaid),
      due: round2(totalCost - totalPaid)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Rate history =================
router.get('/rates', requireAdmin, async (req, res) => {
  try {
    const rates = await Rate.find().sort({ effectiveFrom: -1, createdAt: -1 });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rates', requireAdmin, async (req, res) => {
  try {
    const rate = Number(req.body.rate);
    const effectiveFrom = String(req.body.effectiveFrom || '');
    const note = String(req.body.note || '').trim();
    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ error: 'सही रेट भरें।' });
    }
    if (!DATE_RE.test(effectiveFrom)) {
      return res.status(400).json({ error: 'लागू होने की तारीख चुनें।' });
    }
    const created = await Rate.create({ rate, effectiveFrom, note });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/rates/:id', requireAdmin, async (req, res) => {
  try {
    await Rate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Dashboard =================
// Sabhi farmers ka due status ek saath — sabse zyada due wale sabse upar.
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    const allEntries = await Entry.find();
    const allPayments = await Payment.find();

    const rows = farmers.map((f) => {
      const entries = allEntries.filter((e) => String(e.farmerId) === String(f._id));
      const payments = allPayments.filter((p) => String(p.farmerId) === String(f._id));
      const totalCost = entries.reduce((s, e) => s + e.cost, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      return {
        _id: f._id,
        name: f.name,
        phone: f.phone,
        entryCount: entries.length,
        totalCost: round2(totalCost),
        totalPaid: round2(totalPaid),
        due: round2(totalCost - totalPaid)
      };
    });

    rows.sort((a, b) => b.due - a.due);

    res.json({
      farmers: rows,
      grandTotalDue: round2(rows.reduce((s, r) => s + r.due, 0)),
      grandTotalCost: round2(rows.reduce((s, r) => s + r.totalCost, 0)),
      grandTotalPaid: round2(rows.reduce((s, r) => s + r.totalPaid, 0))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Reports (monthly / yearly chart ke liye) =================
router.get('/reports/summary', requireAdmin, async (req, res) => {
  try {
    const [entries, payments] = await Promise.all([Entry.find(), Payment.find()]);

    const yearSet = new Set();
    entries.forEach((e) => yearSet.add(Number(String(e.date).slice(0, 4))));
    payments.forEach((p) => yearSet.add(Number(String(p.date).slice(0, 4))));
    yearSet.delete(NaN);
    const currentYear = new Date().getFullYear();
    if (yearSet.size === 0) yearSet.add(currentYear);
    const years = Array.from(yearSet).sort((a, b) => b - a);

    const requested = Number(req.query.year);
    const year = years.includes(requested) ? requested : years.includes(currentYear) ? currentYear : years[0];

    const hoursOf = (e) => (e.hours * 60 + e.minutes) / 60;

    // Selected year ke 12 mahine
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalCost: 0,
      totalPaid: 0,
      hours: 0,
      entries: 0
    }));
    const cropMap = {};

    entries.forEach((e) => {
      if (Number(String(e.date).slice(0, 4)) !== year) return;
      const idx = Number(String(e.date).slice(5, 7)) - 1;
      if (idx < 0 || idx > 11) return;
      months[idx].totalCost += e.cost;
      months[idx].hours += hoursOf(e);
      months[idx].entries += 1;
      if (!cropMap[e.crop]) cropMap[e.crop] = { crop: e.crop, totalCost: 0, hours: 0, entries: 0 };
      cropMap[e.crop].totalCost += e.cost;
      cropMap[e.crop].hours += hoursOf(e);
      cropMap[e.crop].entries += 1;
    });
    payments.forEach((p) => {
      if (Number(String(p.date).slice(0, 4)) !== year) return;
      const idx = Number(String(p.date).slice(5, 7)) - 1;
      if (idx < 0 || idx > 11) return;
      months[idx].totalPaid += p.amount;
    });

    months.forEach((m) => {
      m.totalCost = round2(m.totalCost);
      m.totalPaid = round2(m.totalPaid);
      m.hours = round2(m.hours);
    });

    const crops = Object.values(cropMap)
      .map((c) => ({ ...c, totalCost: round2(c.totalCost), hours: round2(c.hours) }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Saal-dar-saal summary
    const yearly = years.map((y) => {
      let totalCost = 0;
      let totalPaid = 0;
      let hours = 0;
      let count = 0;
      entries.forEach((e) => {
        if (Number(String(e.date).slice(0, 4)) === y) {
          totalCost += e.cost;
          hours += hoursOf(e);
          count += 1;
        }
      });
      payments.forEach((p) => {
        if (Number(String(p.date).slice(0, 4)) === y) totalPaid += p.amount;
      });
      return {
        year: y,
        totalCost: round2(totalCost),
        totalPaid: round2(totalPaid),
        hours: round2(hours),
        entries: count
      };
    });

    res.json({ year, years, months, crops, yearly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Export / Backup =================
const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (arr) => arr.map(csvCell).join(',');
const sendCsv = (res, filename, rows) => {
  // \uFEFF (BOM) — taaki Excel me Hindi text sahi dikhe
  const body = '\uFEFF' + rows.map(csvRow).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
};

router.get('/export/entries.csv', requireAdmin, async (req, res) => {
  try {
    const [farmers, entries] = await Promise.all([
      Farmer.find(),
      Entry.find().sort({ date: 1, createdAt: 1 })
    ]);
    const byId = Object.fromEntries(farmers.map((f) => [String(f._id), f]));
    const rows = [
      ['किसान', 'मोबाइल', 'तारीख', 'फसल', 'जगह/खेत', 'घंटे', 'मिनट', 'रेट (₹/घंटा)', 'राशि (₹)']
    ];
    entries.forEach((e) => {
      const f = byId[String(e.farmerId)];
      rows.push([
        f ? f.name : '(हटाया गया)',
        f ? f.phone : '',
        e.date,
        e.crop,
        e.place || '',
        e.hours,
        e.minutes,
        e.rate,
        e.cost
      ]);
    });
    sendCsv(res, 'sichai-entries.csv', rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/payments.csv', requireAdmin, async (req, res) => {
  try {
    const [farmers, payments] = await Promise.all([
      Farmer.find(),
      Payment.find().sort({ date: 1, createdAt: 1 })
    ]);
    const byId = Object.fromEntries(farmers.map((f) => [String(f._id), f]));
    const rows = [['किसान', 'मोबाइल', 'तारीख', 'जमा राशि (₹)']];
    payments.forEach((p) => {
      const f = byId[String(p.farmerId)];
      rows.push([f ? f.name : '(हटाया गया)', f ? f.phone : '', p.date, p.amount]);
    });
    sendCsv(res, 'sichai-payments.csv', rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/farmers.csv', requireAdmin, async (req, res) => {
  try {
    const [farmers, entries, payments] = await Promise.all([
      Farmer.find().sort({ name: 1 }),
      Entry.find(),
      Payment.find()
    ]);
    const rows = [['किसान', 'मोबाइल', 'कुल एंट्री', 'कुल सिंचाई (₹)', 'कुल जमा (₹)', 'बकाया (₹)']];
    farmers.forEach((f) => {
      const es = entries.filter((e) => String(e.farmerId) === String(f._id));
      const ps = payments.filter((p) => String(p.farmerId) === String(f._id));
      const cost = es.reduce((s, e) => s + e.cost, 0);
      const paid = ps.reduce((s, p) => s + p.amount, 0);
      rows.push([f.name, f.phone, es.length, round2(cost), round2(paid), round2(cost - paid)]);
    });
    sendCsv(res, 'sichai-farmers-summary.csv', rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/backup.json', requireAdmin, async (req, res) => {
  try {
    const [farmers, entries, payments, rates] = await Promise.all([
      Farmer.find(),
      Entry.find(),
      Payment.find(),
      Rate.find()
    ]);
    const backup = { exportedAt: new Date().toISOString(), farmers, entries, payments, rates };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sichai-backup.json"');
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
