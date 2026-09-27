const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    date: { type: String, required: true }, // yyyy-MM-dd
    crop: { type: String, required: true },
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    rate: { type: Number, required: true },
    cost: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Entry', entrySchema);
