import React, { useState } from 'react';
import { addRateApi, deleteRateApi } from '../api';
import { todayStr, rateForDate, DEFAULT_RATE } from '../utils';

// Rate history: kis tareekh se kitna rate lagu hua. Nayi entry me rate tareekh ke hisaab se apne-aap bharta hai.
export default function RatesView({ rates, onChanged }) {
  const [rate, setRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const today = todayStr();
  const currentRate = rateForDate(rates, today);
  const currentRow = rates.find((r) => r.effectiveFrom <= today && r.rate === currentRate);
  // "अभी लागू" wali row: aaj ya usse pehle ki sabse nayi tareekh
  const activeId = rates
    .filter((r) => r.effectiveFrom <= today)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]?._id;

  const handleAdd = async () => {
    setError('');
    if (!rate || Number(rate) <= 0) {
      setError('सही रेट भरें।');
      return;
    }
    setBusy(true);
    try {
      await addRateApi({ rate: Number(rate), effectiveFrom, note });
      setRate('');
      setNote('');
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'त्रुटि हुई।');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`₹${r.rate} (${r.effectiveFrom} से) वाला रेट हटाएं?`)) return;
    await deleteRateApi(r._id);
    await onChanged();
  };

  return (
    <div className="page-view">
      <h2>💰 रेट इतिहास</h2>

      <div className="dashboard-totals">
        <div className="dash-stat">
          <span className="dash-label">अभी का रेट (₹/घंटा)</span>
          <span className="dash-value">₹{currentRate}</span>
          <span className="dash-label">
            {currentRow ? `${currentRow.effectiveFrom} से लागू` : `डिफ़ॉल्ट (कोई रेट सेट नहीं है: ₹${DEFAULT_RATE})`}
          </span>
        </div>
      </div>

      <div className="card">
        <h3>नया रेट जोड़ें</h3>
        <div className="form-grid">
          <label>
            नया रेट (₹/घंटा)
            <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
          <label>
            इस तारीख से लागू
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </label>
          <label>
            नोट (ज़रूरी नहीं)
            <input
              type="text"
              placeholder="जैसे: डीज़ल महंगा हुआ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <button className="primary" onClick={handleAdd} disabled={busy}>
          रेट जोड़ें
        </button>
        {error && <p className="farmer-view-error">{error}</p>}
        <p className="hint">
          ℹ️ पुरानी एंट्रियों का रेट नहीं बदलता। नई एंट्री में तारीख के हिसाब से रेट अपने-आप भर जाएगा
          (चाहें तो एंट्री में हाथ से बदल भी सकते हैं)।
        </p>
      </div>

      <div className="card">
        <h3>रेट की हिस्ट्री</h3>
        <table>
          <thead>
            <tr>
              <th>लागू होने की तारीख</th>
              <th>रेट (₹/घंटा)</th>
              <th>नोट</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r._id}>
                <td>
                  {r.effectiveFrom}{' '}
                  {r._id === activeId && <span className="dash-badge badge-clear">अभी लागू</span>}
                  {r.effectiveFrom > today && <span className="dash-badge badge-due">आगे से</span>}
                </td>
                <td>₹{r.rate}</td>
                <td>{r.note}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDelete(r)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan="4" className="empty">
                  अभी कोई रेट सेट नहीं है — डिफ़ॉल्ट ₹{DEFAULT_RATE}/घंटा इस्तेमाल हो रहा है।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
