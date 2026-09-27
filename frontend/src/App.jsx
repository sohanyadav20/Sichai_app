import React, { useEffect, useState, useCallback } from 'react';
import {
  getFarmers,
  addFarmerApi,
  deleteFarmerApi,
  getEntries,
  addEntryApi,
  deleteEntryApi,
  getPayments,
  addPaymentApi,
  deletePaymentApi,
  getSummary,
  getFarmerByPhone,
  adminLogin,
  setAdminKey
} from './api';

const CROPS = ['गेहूं', 'धान', 'बेहन', 'गन्ना', 'चरी', 'सरसो', 'पलेवा', 'पिछला', 'सब्जी', 'अन्य'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ================= Farmer self-service view (phone lookup + print) =================
// Isse sirf farmer ka apna record dikhta hai, koi admin controls nahi.
// Iska link: <site-url>/?view=farmer
function FarmerRecordView() {
  const [phone, setPhone] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    setError('');
    if (!phone.trim()) {
      setError('कृपया मोबाइल नंबर डालें।');
      return;
    }
    setLoading(true);
    try {
      const f = await getFarmerByPhone(phone.trim());
      const [e, p, s] = await Promise.all([
        getEntries(f._id),
        getPayments(f._id),
        getSummary(f._id)
      ]);
      setFarmer(f);
      setEntries(e);
      setPayments(p);
      setSummary(s);
    } catch (err) {
      setFarmer(null);
      setError(err.response?.data?.error || 'इस मोबाइल नंबर से कोई रिकॉर्ड नहीं मिला।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farmer-view">
      <div className="farmer-view-box no-print">
        <h1>सिंचाई पंप रजिस्टर</h1>
        <p>अपना मोबाइल नंबर डालकर अपना रिकॉर्ड देखें / प्रिंट करें</p>
        <div className="farmer-view-search">
          <input
            type="tel"
            placeholder="मोबाइल नंबर"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <button onClick={handleLookup} disabled={loading}>
            {loading ? 'खोज रहे हैं...' : 'रिकॉर्ड देखें'}
          </button>
        </div>
        {error && <p className="farmer-view-error">{error}</p>}
      </div>

      {farmer && (
        <div className="farmer-view-report">
          <div className="no-print">
            <button className="print-btn" onClick={() => window.print()}>
              🖨️ प्रिंट करें
            </button>
          </div>

          <h2>{farmer.name}</h2>
          <p>मोबाइल: {farmer.phone}</p>
          <p>तारीख: {todayStr()}</p>

          <h3>सिंचाई रिकॉर्ड</h3>
          <table>
            <thead>
              <tr>
                <th>तारीख</th>
                <th>फसल</th>
                <th>घंटे</th>
                <th>मिनट</th>
                <th>रेट</th>
                <th>पैसा (₹)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id}>
                  <td>{e.date}</td>
                  <td>{e.crop}</td>
                  <td>{e.hours}</td>
                  <td>{e.minutes}</td>
                  <td>{e.rate}</td>
                  <td>{e.cost.toFixed(2)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">
                    कोई एंट्री नहीं
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h3>भुगतान</h3>
          <table>
            <thead>
              <tr>
                <th>तारीख</th>
                <th>जमा राशि (₹)</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{p.date}</td>
                  <td>{p.amount.toFixed(2)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="2" className="empty">
                    कोई भुगतान नहीं
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="summary-bar">
            Total Sichai: ₹{summary.totalCost.toFixed(2)} &nbsp;|&nbsp; Total Paid: ₹
            {summary.totalPaid.toFixed(2)} &nbsp;|&nbsp; Due: ₹{summary.due.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('view');

  if (mode === 'farmer') {
    return <FarmerRecordView />;
  }

  return <AdminGate />;
}

// ================= Admin password gate =================
// Jab tak sahi password na de, AdminApp bilkul nahi dikhega.
// Password sirf is browser tab ki session tak yaad rehta hai (band karke khologe to phir maangega).
function AdminGate() {
  const [unlocked, setUnlocked] = useState(() => {
    const saved = sessionStorage.getItem('adminKey');
    if (saved) {
      setAdminKey(saved);
      return true;
    }
    return false;
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!password.trim()) {
      setError('पासवर्ड डालें।');
      return;
    }
    setLoading(true);
    try {
      await adminLogin(password.trim());
      sessionStorage.setItem('adminKey', password.trim());
      setAdminKey(password.trim());
      setUnlocked(true);
    } catch (err) {
      setError('गलत पासवर्ड।');
    } finally {
      setLoading(false);
    }
  };

  if (unlocked) {
    return <AdminApp />;
  }

  return (
    <div className="farmer-view">
      <div className="farmer-view-box">
        <h1>सिंचाई पंप रजिस्टर</h1>
        <p>एडमिन पैनल — पासवर्ड डालें</p>
        <div className="farmer-view-search">
          <input
            type="password"
            placeholder="पासवर्ड"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} disabled={loading}>
            {loading ? 'जांच रहे हैं...' : 'लॉगिन करें'}
          </button>
        </div>
        {error && <p className="farmer-view-error">{error}</p>}
      </div>
    </div>
  );
}

function AdminApp() {
  const [farmers, setFarmers] = useState([]);
  const [activeFarmer, setActiveFarmer] = useState(null);
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newFarmerPhone, setNewFarmerPhone] = useState('');

  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalCost: 0, totalPaid: 0, due: 0 });

  const [entryForm, setEntryForm] = useState({
    date: todayStr(),
    crop: CROPS[0],
    hours: 0,
    minutes: 0,
    rate: 60
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [message, setMessage] = useState('');

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadFarmers = useCallback(async () => {
    const data = await getFarmers();
    setFarmers(data);
  }, []);

  const loadFarmerData = useCallback(async (farmerId) => {
    if (!farmerId) {
      setEntries([]);
      setPayments([]);
      setSummary({ totalCost: 0, totalPaid: 0, due: 0 });
      return;
    }
    const [e, p, s] = await Promise.all([
      getEntries(farmerId),
      getPayments(farmerId),
      getSummary(farmerId)
    ]);
    setEntries(e);
    setPayments(p);
    setSummary(s);
  }, []);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  useEffect(() => {
    loadFarmerData(activeFarmer?._id);
  }, [activeFarmer, loadFarmerData]);

  // ---- Farmer actions ----
  const handleAddFarmer = async () => {
    if (!newFarmerName.trim()) {
      showMessage('किसान का नाम लिखें।');
      return;
    }
    if (!newFarmerPhone.trim()) {
      showMessage('मोबाइल नंबर लिखें।');
      return;
    }
    try {
      const farmer = await addFarmerApi(newFarmerName.trim(), newFarmerPhone.trim());
      setNewFarmerName('');
      setNewFarmerPhone('');
      await loadFarmers();
      setActiveFarmer(farmer);
    } catch (err) {
      showMessage(err.response?.data?.error || 'त्रुटि हुई।');
    }
  };

  const handleDeleteFarmer = async (farmer) => {
    if (!window.confirm(`${farmer.name} को हटाएं? इनकी सारी एंट्री भी मिट जाएंगी।`)) return;
    await deleteFarmerApi(farmer._id);
    if (activeFarmer?._id === farmer._id) setActiveFarmer(null);
    await loadFarmers();
  };

  // ---- Entry actions ----
  const handleAddEntry = async () => {
    if (!activeFarmer) {
      showMessage('पहले लिस्ट से एक किसान चुनें।');
      return;
    }
    try {
      await addEntryApi(activeFarmer._id, entryForm);
      setEntryForm((f) => ({ ...f, hours: 0, minutes: 0, rate: 60 }));
      await loadFarmerData(activeFarmer._id);
    } catch (err) {
      showMessage(err.response?.data?.error || 'त्रुटि हुई।');
    }
  };

  const handleDeleteEntry = async (id) => {
    await deleteEntryApi(id);
    await loadFarmerData(activeFarmer._id);
  };

  // ---- Payment actions ----
  const handleAddPayment = async () => {
    if (!activeFarmer) {
      showMessage('पहले लिस्ट से एक किसान चुनें।');
      return;
    }
    try {
      await addPaymentApi(activeFarmer._id, paymentAmount);
      setPaymentAmount('');
      await loadFarmerData(activeFarmer._id);
    } catch (err) {
      showMessage(err.response?.data?.error || 'त्रुटि हुई।');
    }
  };

  const handleDeletePayment = async (id) => {
    await deletePaymentApi(id);
    await loadFarmerData(activeFarmer._id);
  };

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>सिंचाई पंप रजिस्टर</h1>
      </header>

      {message && <div className="toast no-print">{message}</div>}

      <div className="main-layout">
        {/* Left: Farmer list */}
        <aside className="sidebar no-print">
          <h2>किसान सूची</h2>
          <div className="add-row" style={{ flexDirection: 'column', gap: '6px' }}>
            <input
              type="text"
              placeholder="नया किसान नाम"
              value={newFarmerName}
              onChange={(e) => setNewFarmerName(e.target.value)}
            />
            <input
              type="tel"
              placeholder="मोबाइल नंबर"
              value={newFarmerPhone}
              onChange={(e) => setNewFarmerPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFarmer()}
            />
            <button onClick={handleAddFarmer}>+ जोड़ें</button>
          </div>

          <a
            className="farmer-link"
            href="?view=farmer"
            target="_blank"
            rel="noreferrer"
          >
            🔗 किसान के लिए लिंक (रिकॉर्ड देखें)
          </a>
          <ul className="farmer-list">
            {farmers.map((f) => (
              <li
                key={f._id}
                className={activeFarmer?._id === f._id ? 'active' : ''}
                onClick={() => setActiveFarmer(f)}
              >
                <span>{f.name}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFarmer(f);
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
            {farmers.length === 0 && <li className="empty">कोई किसान नहीं</li>}
          </ul>
        </aside>

        {/* Right: Entry + Payment */}
        <main className="content">
          {!activeFarmer ? (
            <div className="placeholder">बाईं तरफ से एक किसान चुनें</div>
          ) : (
            <>
              <div className="farmer-header no-print">
                <h2>{activeFarmer.name} — सिंचाई एंट्री</h2>
                <button className="print-btn" onClick={() => window.print()}>
                  🖨️ पूरा रिकॉर्ड प्रिंट करें
                </button>
              </div>

              {/* Print hone par yeh title dikhega (screen par nahi) */}
              <div className="print-only-header">
                <h1>सिंचाई पंप रजिस्टर</h1>
                <h2>{activeFarmer.name}</h2>
                {activeFarmer.phone && <p>मोबाइल: {activeFarmer.phone}</p>}
                <p>तारीख: {todayStr()}</p>
              </div>

              <div className="card no-print">
                <h3>नई सिंचाई एंट्री</h3>
                <div className="form-grid">
                  <label>
                    तारीख
                    <input
                      type="date"
                      value={entryForm.date}
                      onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </label>
                  <label>
                    फसल
                    <select
                      value={entryForm.crop}
                      onChange={(e) => setEntryForm((f) => ({ ...f, crop: e.target.value }))}
                    >
                      {CROPS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    घंटे
                    <input
                      type="number"
                      min="0"
                      value={entryForm.hours}
                      onChange={(e) => setEntryForm((f) => ({ ...f, hours: e.target.value }))}
                    />
                  </label>
                  <label>
                    मिनट
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={entryForm.minutes}
                      onChange={(e) => setEntryForm((f) => ({ ...f, minutes: e.target.value }))}
                    />
                  </label>
                  <label>
                    रेट (₹/घंटा)
                    <input
                      type="number"
                      min="0"
                      value={entryForm.rate}
                      onChange={(e) => setEntryForm((f) => ({ ...f, rate: e.target.value }))}
                    />
                  </label>
                </div>
                <button className="primary" onClick={handleAddEntry}>
                  एंट्री जोड़ें
                </button>
              </div>

              <div className="card">
                <h3>सिंचाई रिकॉर्ड</h3>
                <table>
                  <thead>
                    <tr>
                      <th>तारीख</th>
                      <th>फसल</th>
                      <th>घंटे</th>
                      <th>मिनट</th>
                      <th>रेट</th>
                      <th>पैसा (₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e._id}>
                        <td>{e.date}</td>
                        <td>{e.crop}</td>
                        <td>{e.hours}</td>
                        <td>{e.minutes}</td>
                        <td>{e.rate}</td>
                        <td>{e.cost.toFixed(2)}</td>
                        <td>
                          <button className="delete-btn" onClick={() => handleDeleteEntry(e._id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty">
                          कोई एंट्री नहीं
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>पैसा जमा (भुगतान)</h3>
                <div className="add-row no-print">
                  <input
                    type="number"
                    placeholder="राशि ₹"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                  />
                  <button onClick={handleAddPayment}>पैसा जमा करें</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>तारीख</th>
                      <th>जमा राशि (₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td>{p.date}</td>
                        <td>{p.amount.toFixed(2)}</td>
                        <td>
                          <button className="delete-btn" onClick={() => handleDeletePayment(p._id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="3" className="empty">
                          कोई भुगतान नहीं
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="summary-bar">
                Total Sichai: ₹{summary.totalCost.toFixed(2)} &nbsp;|&nbsp; Total Paid: ₹
                {summary.totalPaid.toFixed(2)} &nbsp;|&nbsp; Due: ₹{summary.due.toFixed(2)}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
