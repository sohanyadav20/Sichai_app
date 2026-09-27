const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farmer', farmerSchema);
