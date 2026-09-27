const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
