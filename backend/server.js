require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
// Render jaise hosting ke peeche asli IP (login limiter ke liye) sahi milne ke liye
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sichai_register';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('Sichai Register API चल रहा है');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
