const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Entry = require('../models/Entry');
const Payment = require('../models/Payment');

// ================= Farmers =================
router.get('/farmers', async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/farmers', async (req, res) => {
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

router.delete('/farmers/:id', async (req, res) => {
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

router.post('/farmers/:id/entries', async (req, res) => {
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

router.delete('/entries/:id', async (req, res) => {
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

router.post('/farmers/:id/payments', async (req, res) => {
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

router.delete('/payments/:id', async (req, res) => {
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

module.exports = router;
