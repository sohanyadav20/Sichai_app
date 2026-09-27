# सिंचाई पंप रजिस्टर — MERN Version

Java Swing app का MERN (MongoDB + Express + React + Node) version. Features same हैं:
- हर किसान का अलग रिकॉर्ड
- हर एंट्री में तारीख, फसल, घंटे/मिनट, रेट, पैसा (auto calculate)
- भुगतान (payment) ट्रैकिंग
- Total Sichai / Total Paid / Due summary

## Folder Structure
```
sichai-mern/
  backend/     -> Express + MongoDB API
  frontend/    -> React (Vite) UI
```

## 1) Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # MONGO_URI edit karein agar zaroorat ho
npm run dev             # nodemon se चलेगा (ya npm start)
```

Backend `http://localhost:5000` par चलेगा। MongoDB local में चल रहा होना चाहिए
(`mongodb://127.0.0.1:27017`), ya `.env` में MongoDB Atlas connection string डाल दें:

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/sichai_register
```

## 2) Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:5173` par खुलेगा और `/api` requests को अपने-आप
backend (`localhost:5000`) पर proxy कर देगा (vite.config.js में सेट है)।

## 3) Use कैसे करें
1. बाईं तरफ "नया किसान नाम" डालकर किसान जोड़ें।
2. किसान को list में click करें — active हो जाएगा।
3. तारीख, फसल, घंटे/मिनट, रेट भरकर "एंट्री जोड़ें" दबाएं — पैसा auto calculate होगा।
4. "पैसा जमा करें" से भुगतान add करें।
5. नीचे summary bar में Total Sichai, Total Paid, Due दिखेगा।

## API Endpoints (backend)
| Method | Route | Description |
|---|---|---|
| GET | /api/farmers | सभी किसान |
| POST | /api/farmers | नया किसान |
| DELETE | /api/farmers/:id | किसान + उसकी सारी entries/payments हटाएं |
| GET | /api/farmers/:id/entries | किसान की सिंचाई entries |
| POST | /api/farmers/:id/entries | नई entry जोड़ें |
| DELETE | /api/entries/:id | entry हटाएं |
| GET | /api/farmers/:id/payments | किसान के payments |
| POST | /api/farmers/:id/payments | नया payment जोड़ें |
| DELETE | /api/payments/:id | payment हटाएं |
| GET | /api/farmers/:id/summary | totalCost, totalPaid, due |

## Production Build (Frontend)
```bash
cd frontend
npm run build
```
`dist/` folder बनेगा जिसे backend से static serve किया जा सकता है, या किसी भी
static host (Netlify, Vercel) पर deploy किया जा सकता है — बस `VITE` proxy की
जगह production API URL सेट करना होगा।
