import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminUsers,
  addAdminUserApi,
  resetAdminPasswordApi,
  deleteAdminUserApi,
  changePasswordApi
} from '../api';

export default function UsersView({ auth }) {
  const isOwner = auth.role === 'owner';
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const load = useCallback(async () => {
    if (!isOwner) return;
    try {
      setUsers(await getAdminUsers());
    } catch (err) {
      flash('error', 'यूज़र लोड नहीं हो पाए।');
    }
  }, [isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    try {
      await addAdminUserApi(username, password);
      setUsername('');
      setPassword('');
      flash('ok', 'नया यूज़र जुड़ गया।');
      await load();
    } catch (err) {
      flash('error', err.response?.data?.error || 'त्रुटि हुई।');
    }
  };

  const handleReset = async (u) => {
    const p = window.prompt(`"${u.username}" का नया पासवर्ड लिखें (कम से कम 4 अक्षर):`);
    if (!p) return;
    try {
      await resetAdminPasswordApi(u._id, p);
      flash('ok', 'पासवर्ड बदल गया।');
    } catch (err) {
      flash('error', err.response?.data?.error || 'त्रुटि हुई।');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`यूज़र "${u.username}" को हटाएं?`)) return;
    await deleteAdminUserApi(u._id);
    await load();
  };

  const handleChangePw = async () => {
    try {
      await changePasswordApi(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      flash('ok', 'आपका पासवर्ड बदल गया।');
    } catch (err) {
      flash('error', err.response?.data?.error || 'त्रुटि हुई।');
    }
  };

  return (
    <div className="page-view">
      <h2>👤 यूज़र / लॉगिन</h2>
      <p className="hint">
        अभी लॉगिन: <strong>{auth.username}</strong> ({isOwner ? 'मालिक' : 'स्टाफ'})
      </p>
      {msg.text && (
        <p className={msg.type === 'ok' ? 'msg-ok' : 'farmer-view-error'}>{msg.text}</p>
      )}

      {isOwner ? (
        <>
          <div className="card">
            <h3>नया स्टाफ यूज़र जोड़ें</h3>
            <div className="form-grid">
              <label>
                यूज़रनेम
                <input
                  type="text"
                  placeholder="जैसे: papa या ramesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                पासवर्ड
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            </div>
            <button className="primary" onClick={handleAdd}>
              यूज़र जोड़ें
            </button>
            <p className="hint">
              स्टाफ यूज़र किसान, एंट्री, भुगतान, रेट, रिपोर्ट और बैकअप सब देख/बदल सकता है — बस नए यूज़र
              बनाना और हटाना सिर्फ मालिक कर सकता है।
            </p>
          </div>

          <div className="card">
            <h3>स्टाफ यूज़र</h3>
            <table>
              <thead>
                <tr>
                  <th>यूज़रनेम</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td className="row-actions">
                      <button className="edit-btn" onClick={() => handleReset(u)}>
                        पासवर्ड बदलें
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(u)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="2" className="empty">
                      अभी कोई स्टाफ यूज़र नहीं है।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <h3>अपना पासवर्ड बदलें</h3>
          <div className="form-grid">
            <label>
              पुराना पासवर्ड
              <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            </label>
            <label>
              नया पासवर्ड
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </label>
          </div>
          <button className="primary" onClick={handleChangePw}>
            पासवर्ड बदलें
          </button>
        </div>
      )}
    </div>
  );
}
