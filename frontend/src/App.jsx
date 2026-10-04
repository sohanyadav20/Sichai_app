import React, { useEffect, useState, useCallback } from "react";
import {
  getFarmers,
  addFarmerApi,
  updateFarmerApi,
  deleteFarmerApi,
  getEntries,
  addEntryApi,
  updateEntryApi,
  deleteEntryApi,
  getPayments,
  addPaymentApi,
  deletePaymentApi,
  getSummary,
  getFarmerByPhone,
  adminLogin,
  setAuthToken,
  AUTH_KEY,
  getDashboard,
  getRates,
} from "./api";
import { todayStr, rateForDate } from "./utils";
import RatesView from "./views/RatesView";
import ReportsView from "./views/ReportsView";
import BackupView from "./views/BackupView";
import UsersView from "./views/UsersView";

const CROPS = [
  "गेहूं",
  "धान",
  "बेहन",
  "गन्ना",
  "चरी",
  "सरसो",
  "प्याज",
  "आलु",
  "लहसुन",
  "घास",
  "पलेवा",
  "पिछला",
  "सब्जी",
  "अन्य",
];

// Upar wali navigation (admin panel ke tabs)
const NAV = [
  { key: "farmers", label: "👥 किसान" },
  { key: "dashboard", label: "📊 डैशबोर्ड" },
  { key: "reports", label: "📈 रिपोर्ट" },
  { key: "rates", label: "💰 रेट" },
  { key: "backup", label: "🗄️ बैकअप" },
  { key: "users", label: "👤 यूज़र" },
];

// Farmer ke phone number se WhatsApp reminder link banao (Indian number assume kiya)
function buildWhatsAppLink(phone, name, due) {
  const digits = (phone || "").replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  const message = `नमस्ते ${name} जी, आपका सिंचाई पंप का बकाया ₹${due.toFixed(
    2,
  )} है। कृपया जल्द भुगतान करें। धन्यवाद। -सोहन यादव`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

const THEME_KEY = "sichai-theme";

// Dark/light theme — poore app (admin aur kisan वाला page) में इस्तेमाल होता है।
// Pehli baar system ki setting dekh leta hai, uske baad jo chuno wahi yaad rehta hai (is browser me).
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {
      /* ignore */
    }
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return [theme, toggleTheme];
}

function ThemeToggle({ theme, toggleTheme, className = "" }) {
  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      title="थीम बदलें"
    >
      {theme === "dark" ? "☀️ लाइट" : "🌙 डार्क"}
    </button>
  );
}

// ================= Farmer self-service view (phone lookup + print) =================
// Isse sirf farmer ka apna record dikhta hai, koi admin controls nahi.
// Iska link: <site-url>/?view=farmer
function FarmerRecordView({ theme, toggleTheme }) {
  const [phone, setPhone] = useState("");
  const [farmer, setFarmer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    setError("");
    if (!phone.trim()) {
      setError("कृपया मोबाइल नंबर डालें।");
      return;
    }
    setLoading(true);
    try {
      const f = await getFarmerByPhone(phone.trim());
      const [e, p, s] = await Promise.all([
        getEntries(f._id),
        getPayments(f._id),
        getSummary(f._id),
      ]);
      setFarmer(f);
      setEntries(e);
      setPayments(p);
      setSummary(s);
    } catch (err) {
      setFarmer(null);
      setError(
        err.response?.data?.error || "इस मोबाइल नंबर से कोई रिकॉर्ड नहीं मिला।",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farmer-view">
      <div className="farmer-view-box no-print">
        <ThemeToggle
          theme={theme}
          toggleTheme={toggleTheme}
          className="theme-toggle-corner"
        />
        <h1>सिंचाई पंप रजिस्टर</h1>
        <p>अपना मोबाइल नंबर डालकर अपना रिकॉर्ड देखें / प्रिंट करें</p>
        <div className="farmer-view-search">
          <input
            type="tel"
            placeholder="मोबाइल नंबर"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          />
          <button onClick={handleLookup} disabled={loading}>
            {loading ? "खोज रहे हैं..." : "रिकॉर्ड देखें"}
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
                <th>जगह</th>
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
                  <td>{e.place}</td>
                  <td>{e.hours}</td>
                  <td>{e.minutes}</td>
                  <td>{e.rate}</td>
                  <td>{e.cost.toFixed(2)}</td>
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
            {entries.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan="3">कुल ({entries.length} एंट्री)</td>
                  <td colSpan="2">
                    {entries
                      .reduce((s, e) => s + e.hours + e.minutes / 60, 0)
                      .toFixed(1)}{" "}
                    घंटे
                  </td>
                  <td colSpan="2">
                    ₹{entries.reduce((s, e) => s + e.cost, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
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
            Total Sichai: ₹{summary.totalCost.toFixed(2)} &nbsp;|&nbsp; Total
            Paid: ₹{summary.totalPaid.toFixed(2)} &nbsp;|&nbsp; Due: ₹
            {summary.due.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get("view");
  const [theme, toggleTheme] = useTheme();

  if (mode === "farmer") {
    return <FarmerRecordView theme={theme} toggleTheme={toggleTheme} />;
  }

  return <AdminGate theme={theme} toggleTheme={toggleTheme} />;
}

// ================= Admin login gate =================
// Sahi login ke bina AdminApp bilkul nahi dikhega.
// Login sirf is browser tab ki session tak yaad rehta hai (band karke khologe to phir maangega).
function AdminGate({ theme, toggleTheme }) {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
      if (saved && saved.token) {
        setAuthToken(saved.token);
        return saved;
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!password.trim()) {
      setError("पासवर्ड डालें।");
      return;
    }
    setLoading(true);
    try {
      const data = await adminLogin(username.trim(), password);
      const saved = {
        token: data.token,
        username: data.username,
        role: data.role,
      };
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(saved));
      setAuthToken(saved.token);
      setPassword("");
      setAuth(saved);
    } catch (err) {
      setError(
        err.response?.data?.error || "लॉगिन नहीं हो पाया। दोबारा कोशिश करें।",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthToken(null);
    setAuth(null);
  };

  if (auth) {
    return (
      <AdminApp
        auth={auth}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="farmer-view">
      <div className="farmer-view-box">
        <ThemeToggle
          theme={theme}
          toggleTheme={toggleTheme}
          className="theme-toggle-corner"
        />
        <h1>सिंचाई पंप रजिस्टर</h1>
        <p>एडमिन पैनल — लॉगिन करें</p>
        <div className="farmer-view-search">
          <input
            type="text"
            placeholder="यूज़रनेम (मालिक के लिए खाली छोड़ें)"
            value={username}
            autoCapitalize="none"
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <input
            type="password"
            placeholder="पासवर्ड"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button onClick={handleLogin} disabled={loading}>
            {loading ? "जांच रहे हैं..." : "लॉगिन करें"}
          </button>
        </div>
        {error && <p className="farmer-view-error">{error}</p>}
      </div>
    </div>
  );
}

function AdminApp({ auth, onLogout, theme, toggleTheme }) {
  const [view, setView] = useState("farmers"); // farmers | dashboard | reports | rates | backup | users
  const [farmers, setFarmers] = useState([]);
  const [activeFarmer, setActiveFarmer] = useState(null);
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerPhone, setNewFarmerPhone] = useState("");

  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalCost: 0,
    totalPaid: 0,
    due: 0,
  });

  const [entryForm, setEntryForm] = useState({
    date: todayStr(),
    crop: CROPS[0],
    place: "",
    hours: 0,
    minutes: 0,
    rate: 60,
  });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [message, setMessage] = useState("");

  const [editingFarmerId, setEditingFarmerId] = useState(null);
  const [farmerEditName, setFarmerEditName] = useState("");
  const [farmerEditPhone, setFarmerEditPhone] = useState("");

  const [datePreset, setDatePreset] = useState("all"); // 'all' | 'thisMonth' | 'lastMonth' | 'custom'
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashSearch, setDashSearch] = useState("");
  const [dashOnlyDue, setDashOnlyDue] = useState(false);

  const [rates, setRates] = useState([]);
  const [rateManual, setRateManual] = useState(false); // user ne rate haath se badla to auto-fill band

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const loadFarmers = useCallback(async () => {
    const data = await getFarmers();
    setFarmers(data);
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (err) {
      showMessage("डैशबोर्ड लोड नहीं हो पाया।");
    } finally {
      setDashboardLoading(false);
    }
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
      getSummary(farmerId),
    ]);
    setEntries(e);
    setPayments(p);
    setSummary(s);
  }, []);

  const loadRates = useCallback(async () => {
    try {
      setRates(await getRates());
    } catch (err) {
      /* rate na mile to default 60 chalega */
    }
  }, []);

  useEffect(() => {
    loadFarmers();
    loadRates();
  }, [loadFarmers, loadRates]);

  // Nayi entry me tareekh ke hisaab se rate apne-aap bharo (rate history se)
  useEffect(() => {
    if (editingEntryId || rateManual) return;
    const auto = rateForDate(rates, entryForm.date);
    setEntryForm((f) => (Number(f.rate) === auto ? f : { ...f, rate: auto }));
  }, [rates, entryForm.date, editingEntryId, rateManual]);

  useEffect(() => {
    loadFarmerData(activeFarmer?._id);
  }, [activeFarmer, loadFarmerData]);

  useEffect(() => {
    if (view === "dashboard") {
      loadDashboard();
    }
  }, [view, loadDashboard]);

  const openFarmerFromDashboard = (farmerId) => {
    const f = farmers.find((x) => x._id === farmerId);
    if (f) {
      setActiveFarmer(f);
      setView("farmers");
    }
  };

  // ---- Date range filter ke liye from/to nikaalo ----
  const getDateRange = () => {
    const now = new Date();
    if (datePreset === "thisMonth") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const to = todayStr();
      return { from, to };
    }
    if (datePreset === "lastMonth") {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      const to = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
      return { from, to };
    }
    if (datePreset === "custom") {
      return { from: customFrom || "0000-01-01", to: customTo || "9999-12-31" };
    }
    return { from: "0000-01-01", to: "9999-12-31" };
  };

  const { from: filterFrom, to: filterTo } = getDateRange();
  const filteredEntries = entries.filter(
    (e) => e.date >= filterFrom && e.date <= filterTo,
  );
  const filteredTotal = filteredEntries.reduce((s, e) => s + e.cost, 0);
  const filteredHours = filteredEntries.reduce(
    (s, e) => s + e.hours + e.minutes / 60,
    0,
  );

  // ---- Farmer edit actions ----
  const handleStartEditFarmer = (farmer) => {
    setEditingFarmerId(farmer._id);
    setFarmerEditName(farmer.name);
    setFarmerEditPhone(farmer.phone || "");
  };

  const handleCancelEditFarmer = () => {
    setEditingFarmerId(null);
    setFarmerEditName("");
    setFarmerEditPhone("");
  };

  const handleSaveFarmerEdit = async () => {
    if (!farmerEditName.trim() || !farmerEditPhone.trim()) {
      showMessage("नाम और मोबाइल नंबर दोनों लिखें।");
      return;
    }
    try {
      const updated = await updateFarmerApi(
        editingFarmerId,
        farmerEditName.trim(),
        farmerEditPhone.trim(),
      );
      await loadFarmers();
      if (activeFarmer?._id === editingFarmerId) {
        setActiveFarmer(updated);
      }
      handleCancelEditFarmer();
      showMessage("किसान की जानकारी अपडेट हो गई।");
    } catch (err) {
      showMessage(err.response?.data?.error || "त्रुटि हुई।");
    }
  };

  // ---- Farmer actions ----
  const handleAddFarmer = async () => {
    if (!newFarmerName.trim()) {
      showMessage("किसान का नाम लिखें।");
      return;
    }
    if (!newFarmerPhone.trim()) {
      showMessage("मोबाइल नंबर लिखें।");
      return;
    }
    try {
      const farmer = await addFarmerApi(
        newFarmerName.trim(),
        newFarmerPhone.trim(),
      );
      setNewFarmerName("");
      setNewFarmerPhone("");
      await loadFarmers();
      setActiveFarmer(farmer);
    } catch (err) {
      showMessage(err.response?.data?.error || "त्रुटि हुई।");
    }
  };

  const handleDeleteFarmer = async (farmer) => {
    if (
      !window.confirm(
        `${farmer.name} को हटाएं? इनकी सारी एंट्री भी मिट जाएंगी।`,
      )
    )
      return;
    await deleteFarmerApi(farmer._id);
    if (activeFarmer?._id === farmer._id) setActiveFarmer(null);
    await loadFarmers();
  };

  // ---- Entry actions (add ya edit, dono isi form se) ----
  const handleSaveEntry = async () => {
    if (!activeFarmer) {
      showMessage("पहले लिस्ट से एक किसान चुनें।");
      return;
    }
    try {
      if (editingEntryId) {
        await updateEntryApi(editingEntryId, entryForm);
        showMessage("एंट्री अपडेट हो गई।");
      } else {
        await addEntryApi(activeFarmer._id, entryForm);
      }
      setEntryForm({
        date: todayStr(),
        crop: CROPS[0],
        place: "",
        hours: 0,
        minutes: 0,
        rate: rateForDate(rates, todayStr()),
      });
      setEditingEntryId(null);
      setRateManual(false);
      await loadFarmerData(activeFarmer._id);
    } catch (err) {
      showMessage(err.response?.data?.error || "त्रुटि हुई।");
    }
  };

  const handleStartEditEntry = (entry) => {
    setEditingEntryId(entry._id);
    setEntryForm({
      date: entry.date,
      crop: entry.crop,
      place: entry.place || "",
      hours: entry.hours,
      minutes: entry.minutes,
      rate: entry.rate,
    });
  };

  const handleCancelEditEntry = () => {
    setEditingEntryId(null);
    setRateManual(false);
    setEntryForm({
      date: todayStr(),
      crop: CROPS[0],
      place: "",
      hours: 0,
      minutes: 0,
      rate: rateForDate(rates, todayStr()),
    });
  };

  const handleDeleteEntry = async (id) => {
    await deleteEntryApi(id);
    if (editingEntryId === id) handleCancelEditEntry();
    await loadFarmerData(activeFarmer._id);
  };

  // ---- Payment actions ----
  const handleAddPayment = async () => {
    if (!activeFarmer) {
      showMessage("पहले लिस्ट से एक किसान चुनें।");
      return;
    }
    try {
      await addPaymentApi(activeFarmer._id, paymentAmount);
      setPaymentAmount("");
      await loadFarmerData(activeFarmer._id);
    } catch (err) {
      showMessage(err.response?.data?.error || "त्रुटि हुई।");
    }
  };

  const handleDeletePayment = async (id) => {
    await deletePaymentApi(id);
    await loadFarmerData(activeFarmer._id);
  };

  // ---- Dashboard search / filter ----
  const dashQuery = dashSearch.trim().toLowerCase();
  const visibleDashFarmers = dashboard
    ? dashboard.farmers.filter((f) => {
        if (dashOnlyDue && !(f.due > 0)) return false;
        if (!dashQuery) return true;
        return (
          (f.name || "").toLowerCase().includes(dashQuery) ||
          (f.phone || "")
            .replace(/\s/g, "")
            .includes(dashQuery.replace(/\s/g, ""))
        );
      })
    : [];

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-header-top">
          <h1>सिंचाई पंप रजिस्टर</h1>
          <div className="header-user">
            <span>
              👤 {auth.username}
              {auth.role === "owner" ? " (मालिक)" : ""}
            </span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <button className="logout-btn" onClick={onLogout}>
              लॉगआउट
            </button>
          </div>
        </div>
        <nav className="main-nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={view === n.key ? "nav-btn active" : "nav-btn"}
              onClick={() => setView(n.key)}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      {message && <div className="toast no-print">{message}</div>}

      <div className="main-layout">
        {/* Left: Farmer list (sirf "किसान" tab me) */}
        {view === "farmers" && (
          <aside className="sidebar no-print">
            <h2>किसान सूची</h2>
            <div
              className="add-row"
              style={{ flexDirection: "column", gap: "6px" }}
            >
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
                onKeyDown={(e) => e.key === "Enter" && handleAddFarmer()}
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
              {farmers.map((f) =>
                editingFarmerId === f._id ? (
                  <li key={f._id} className="farmer-edit-row">
                    <input
                      type="text"
                      value={farmerEditName}
                      onChange={(e) => setFarmerEditName(e.target.value)}
                      placeholder="नाम"
                    />
                    <input
                      type="tel"
                      value={farmerEditPhone}
                      onChange={(e) => setFarmerEditPhone(e.target.value)}
                      placeholder="मोबाइल नंबर"
                    />
                    <div className="farmer-edit-actions">
                      <button onClick={handleSaveFarmerEdit}>सेव करें</button>
                      <button
                        className="cancel-btn"
                        onClick={handleCancelEditFarmer}
                      >
                        रद्द करें
                      </button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={f._id}
                    className={activeFarmer?._id === f._id ? "active" : ""}
                    onClick={() => setActiveFarmer(f)}
                  >
                    <span>{f.name}</span>
                    <span className="farmer-row-actions">
                      <button
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditFarmer(f);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFarmer(f);
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ),
              )}
              {farmers.length === 0 && (
                <li className="empty">कोई किसान नहीं</li>
              )}
            </ul>
          </aside>
        )}

        {/* Right: Entry + Payment */}
        <main className="content">
          {view === "reports" ? (
            <ReportsView theme={theme} />
          ) : view === "rates" ? (
            <RatesView rates={rates} onChanged={loadRates} />
          ) : view === "backup" ? (
            <BackupView />
          ) : view === "users" ? (
            <UsersView auth={auth} />
          ) : view === "dashboard" ? (
            <div className="dashboard">
              <h2>📊 डैशबोर्ड — सबका बकाया एक नज़र में</h2>
              {dashboardLoading && <p>लोड हो रहा है...</p>}
              {dashboard && (
                <>
                  <div className="dashboard-totals">
                    <div className="dash-stat">
                      <span className="dash-label">कुल सिंचाई</span>
                      <span className="dash-value">
                        ₹{dashboard.grandTotalCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="dash-stat">
                      <span className="dash-label">कुल जमा</span>
                      <span className="dash-value">
                        ₹{dashboard.grandTotalPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="dash-stat dash-due">
                      <span className="dash-label">कुल बकाया</span>
                      <span className="dash-value">
                        ₹{dashboard.grandTotalDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="dash-toolbar">
                    <input
                      type="search"
                      className="dash-search"
                      placeholder="🔍 किसान का नाम या मोबाइल नंबर खोजें"
                      value={dashSearch}
                      onChange={(e) => setDashSearch(e.target.value)}
                    />
                    <label className="dash-check">
                      <input
                        type="checkbox"
                        checked={dashOnlyDue}
                        onChange={(e) => setDashOnlyDue(e.target.checked)}
                      />
                      सिर्फ बकाया वाले
                    </label>
                    <span className="dash-count">
                      {visibleDashFarmers.length} / {dashboard.farmers.length}{" "}
                      किसान
                    </span>
                  </div>

                  <div className="dashboard-list">
                    {visibleDashFarmers.map((f) => (
                      <div
                        key={f._id}
                        className={`dash-card ${f.due > 0 ? "due-pos" : "due-clear"}`}
                        onClick={() => openFarmerFromDashboard(f._id)}
                      >
                        <div className="dash-card-top">
                          <span className="dash-name">{f.name}</span>
                          <span
                            className={`dash-badge ${f.due > 0 ? "badge-due" : "badge-clear"}`}
                          >
                            {f.due > 0
                              ? `₹${f.due.toFixed(2)} बकाया`
                              : "सब भुगतान हो गया"}
                          </span>
                        </div>
                        <div className="dash-card-bottom">
                          <span>{f.entryCount} एंट्री</span>
                          <span>सिंचाई: ₹{f.totalCost.toFixed(2)}</span>
                          <span>जमा: ₹{f.totalPaid.toFixed(2)}</span>
                          {f.due > 0 && f.phone && (
                            <a
                              className="dash-whatsapp"
                              href={buildWhatsAppLink(f.phone, f.name, f.due)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📲 रिमाइंडर
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {visibleDashFarmers.length === 0 && (
                      <p className="empty">
                        {dashboard.farmers.length === 0
                          ? "अभी कोई किसान नहीं है।"
                          : "कोई किसान नहीं मिला।"}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : !activeFarmer ? (
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
                <h1>सिंचाई सिचाई विवरण</h1>
                <h1>Irrigation Details</h1>
                <h2>{activeFarmer.name}</h2>
                {activeFarmer.phone && <p>मोबाइल: {activeFarmer.phone}</p>}
                <p>तारीख: {todayStr()}</p>
              </div>

              <div className="card no-print">
                <h3>
                  {editingEntryId ? "एंट्री सुधारें" : "नई सिंचाई एंट्री"}
                </h3>
                <div className="form-grid">
                  <label>
                    तारीख
                    <input
                      type="date"
                      value={entryForm.date}
                      onChange={(e) =>
                        setEntryForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    फसल
                    <select
                      value={entryForm.crop}
                      onChange={(e) =>
                        setEntryForm((f) => ({ ...f, crop: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setEntryForm((f) => ({ ...f, hours: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    मिनट
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={entryForm.minutes}
                      onChange={(e) =>
                        setEntryForm((f) => ({ ...f, minutes: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    जगह / खेत का नाम
                    <input
                      type="text"
                      placeholder="जैसे: उत्तर वाला खेत"
                      value={entryForm.place}
                      onChange={(e) =>
                        setEntryForm((f) => ({ ...f, place: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    रेट (₹/घंटा)
                    <input
                      type="number"
                      min="0"
                      value={entryForm.rate}
                      onChange={(e) => {
                        setRateManual(true);
                        setEntryForm((f) => ({ ...f, rate: e.target.value }));
                      }}
                    />
                  </label>
                </div>
                <button className="primary" onClick={handleSaveEntry}>
                  {editingEntryId ? "अपडेट करें" : "एंट्री जोड़ें"}
                </button>
                {editingEntryId && (
                  <button
                    className="cancel-btn"
                    onClick={handleCancelEditEntry}
                  >
                    रद्द करें
                  </button>
                )}
              </div>

              <div className="card">
                <h3>सिंचाई रिकॉर्ड</h3>
                <div className="date-filter-row no-print">
                  <button
                    className={
                      datePreset === "all" ? "filter-btn active" : "filter-btn"
                    }
                    onClick={() => setDatePreset("all")}
                  >
                    सभी
                  </button>
                  <button
                    className={
                      datePreset === "thisMonth"
                        ? "filter-btn active"
                        : "filter-btn"
                    }
                    onClick={() => setDatePreset("thisMonth")}
                  >
                    इस महीने
                  </button>
                  <button
                    className={
                      datePreset === "lastMonth"
                        ? "filter-btn active"
                        : "filter-btn"
                    }
                    onClick={() => setDatePreset("lastMonth")}
                  >
                    पिछले महीने
                  </button>
                  <button
                    className={
                      datePreset === "custom"
                        ? "filter-btn active"
                        : "filter-btn"
                    }
                    onClick={() => setDatePreset("custom")}
                  >
                    तारीख चुनें
                  </button>
                </div>
                {datePreset === "custom" && (
                  <div className="date-filter-row no-print">
                    <label>
                      से
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                      />
                    </label>
                    <label>
                      तक
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                      />
                    </label>
                  </div>
                )}
                <table>
                  <thead>
                    <tr>
                      <th>तारीख</th>
                      <th>फसल</th>
                      <th>जगह</th>
                      <th>घंटे</th>
                      <th>मिनट</th>
                      <th>रेट</th>
                      <th>पैसा (₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e) => (
                      <tr key={e._id}>
                        <td>{e.date}</td>
                        <td>{e.crop}</td>
                        <td>{e.place}</td>
                        <td>{e.hours}</td>
                        <td>{e.minutes}</td>
                        <td>{e.rate}</td>
                        <td>{e.cost.toFixed(2)}</td>
                        <td className="row-actions">
                          <button
                            className="edit-btn"
                            onClick={() => handleStartEditEntry(e)}
                          >
                            ✎
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteEntry(e._id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                      <tr>
                        <td colSpan="8" className="empty">
                          कोई एंट्री नहीं
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredEntries.length > 0 && (
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="3">
                          {datePreset !== "all" ? "चुनी हुई अवधि का " : ""}कुल (
                          {filteredEntries.length} एंट्री)
                        </td>
                        <td colSpan="2">{filteredHours.toFixed(1)} घंटे</td>
                        <td colSpan="2">₹{filteredTotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  )}
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
                    onKeyDown={(e) => e.key === "Enter" && handleAddPayment()}
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
                          <button
                            className="delete-btn"
                            onClick={() => handleDeletePayment(p._id)}
                          >
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

              <div className="summary-bar-row no-print">
                <div className="summary-bar">
                  Total Sichai: ₹{summary.totalCost.toFixed(2)} &nbsp;|&nbsp;
                  Total Paid: ₹{summary.totalPaid.toFixed(2)} &nbsp;|&nbsp; Due:
                  ₹{summary.due.toFixed(2)}
                </div>
                {summary.due > 0 && activeFarmer.phone && (
                  <a
                    className="whatsapp-btn"
                    href={buildWhatsAppLink(
                      activeFarmer.phone,
                      activeFarmer.name,
                      summary.due,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    📲 WhatsApp रिमाइंडर भेजें
                  </a>
                )}
              </div>
              <div className="summary-bar print-only-summary">
                Total Sichai: ₹{summary.totalCost.toFixed(2)} &nbsp;|&nbsp;
                Total Paid: ₹{summary.totalPaid.toFixed(2)} &nbsp;|&nbsp; Due: ₹
                {summary.due.toFixed(2)}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
