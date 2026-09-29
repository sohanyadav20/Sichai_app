const mongoose = require('mongoose');

// Rate history: kis tareekh se kitna rate (₹/ghanta) lagu hua.
const rateSchema = new mongoose.Schema(
  {
    rate: { type: Number, required: true },
    effectiveFrom: { type: String, required: true }, // yyyy-MM-dd
    note: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rate', rateSchema);
