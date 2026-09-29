const mongoose = require('mongoose');

// Staff admin users. "Owner" alag hai — wo ADMIN_KEY (environment variable) se login karta hai.
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
