const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Entry = require('../models/Entry');
const Payment = require('../models/Payment');

// ---- Admin password check ----
// Add/edit/delete karne wale routes ke liye zaroori — header me 'x-admin-key' bhejni hoti hai.
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'गलत एडमिन पासवर्ड।' });
  }
  next();
}

// ---- Login check (frontend password screen ke liye) ----
router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_KEY) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'गलत पासवर्ड।' });
});

// ================= Farmers =================
router.get('/farmers', async (req, res) => {
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

// ---- Phone number se farmer dhoondo (self-service view ke liye) ----
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

router.post('/farmers/:id/entries', requireAdmin, async (req, res) => {
  try {
    const { date, crop, hours, minutes, rate } = req.body;
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const r = Number(rate);

    if (!date || !crop || isNaN(r)) {
      return res.status(400).json({ error: 'सभी फील्ड सही भरें।' });
    }
    if (h === 0 && m === 0) {
      return res.status(400).json({ error: 'कृपया घंटा या मिनट भरें।' });
    }
    if (m >= 60) {
      return res.status(400).json({ error: 'मिनट 60 से कम होना चाहिए।' });
    }

    const cost = Math.round(((h * 60 + m) / 60) * r * 100) / 100;
    const entry = await Entry.create({
      farmerId: req.params.id,
      date,
      crop,
      hours: h,
      minutes: m,
      rate: r,
      cost
    });
    res.status(201).json(entry);
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

// ---- Entry edit karo (galat entry sudharne ke liye) ----
router.put('/entries/:id', requireAdmin, async (req, res) => {
  try {
    const { date, crop, hours, minutes, rate } = req.body;
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const r = Number(rate);

    if (!date || !crop || isNaN(r)) {
      return res.status(400).json({ error: 'सभी फील्ड सही भरें।' });
    }
    if (h === 0 && m === 0) {
      return res.status(400).json({ error: 'कृपया घंटा या मिनट भरें।' });
    }
    if (m >= 60) {
      return res.status(400).json({ error: 'मिनट 60 से कम होना चाहिए।' });
    }

    const cost = Math.round(((h * 60 + m) / 60) * r * 100) / 100;
    const entry = await Entry.findByIdAndUpdate(
      req.params.id,
      { date, crop, hours: h, minutes: m, rate: r, cost },
      { new: true }
    );
    if (!entry) {
      return res.status(404).json({ error: 'एंट्री नहीं मिली।' });
    }
    res.json(entry);
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

// ================= Summary =================
router.get('/farmers/:id/summary', async (req, res) => {
  try {
    const entries = await Entry.find({ farmerId: req.params.id });
    const payments = await Payment.find({ farmerId: req.params.id });
    const totalCost = entries.reduce((s, e) => s + e.cost, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      due: Math.round((totalCost - totalPaid) * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Dashboard =================
// Sabhi farmers ka due status ek saath — sabse zyada due wale sabse upar.
router.get('/dashboard', async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    const allEntries = await Entry.find();
    const allPayments = await Payment.find();

    const rows = farmers.map((f) => {
      const entries = allEntries.filter((e) => String(e.farmerId) === String(f._id));
      const payments = allPayments.filter((p) => String(p.farmerId) === String(f._id));
      const totalCost = entries.reduce((s, e) => s + e.cost, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const due = Math.round((totalCost - totalPaid) * 100) / 100;
      return {
        _id: f._id,
        name: f.name,
        phone: f.phone,
        entryCount: entries.length,
        totalCost: Math.round(totalCost * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        due
      };
    });

    rows.sort((a, b) => b.due - a.due);

    const grandTotalDue = Math.round(rows.reduce((s, r) => s + r.due, 0) * 100) / 100;
    const grandTotalCost = Math.round(rows.reduce((s, r) => s + r.totalCost, 0) * 100) / 100;
    const grandTotalPaid = Math.round(rows.reduce((s, r) => s + r.totalPaid, 0) * 100) / 100;

    res.json({ farmers: rows, grandTotalDue, grandTotalCost, grandTotalPaid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
