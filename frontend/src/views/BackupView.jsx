import React, { useState } from 'react';
import { downloadFile } from '../api';
import { todayStr } from '../utils';

const ITEMS = [
  {
    key: 'farmers',
    icon: '👥',
    title: 'किसान-वार सारांश (Excel/CSV)',
    desc: 'हर किसान का मोबाइल, कुल सिंचाई, कुल जमा और बकाया।',
    path: '/export/farmers.csv',
    file: 'sichai-farmers-summary'
  },
  {
    key: 'entries',
    icon: '💧',
    title: 'सारी सिंचाई एंट्री (Excel/CSV)',
    desc: 'तारीख, फसल, घंटे, रेट और राशि — सब किसानों की।',
    path: '/export/entries.csv',
    file: 'sichai-entries'
  },
  {
    key: 'payments',
    icon: '💵',
    title: 'सारे भुगतान (Excel/CSV)',
    desc: 'किसने कब कितना पैसा जमा किया।',
    path: '/export/payments.csv',
    file: 'sichai-payments'
  },
  {
    key: 'backup',
    icon: '🗄️',
    title: 'पूरा बैकअप (JSON)',
    desc: 'किसान, एंट्री, भुगतान और रेट — पूरा डेटा एक फाइल में। सुरक्षित जगह रखें।',
    path: '/export/backup.json',
    file: 'sichai-backup'
  }
];

export default function BackupView() {
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const handleDownload = async (item) => {
    setError('');
    setBusyKey(item.key);
    try {
      const ext = item.path.endsWith('.json') ? 'json' : 'csv';
      await downloadFile(item.path, `${item.file}-${todayStr()}.${ext}`);
    } catch (err) {
      setError('डाउनलोड नहीं हो पाया। दोबारा कोशिश करें।');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <div className="page-view">
      <h2>🗄️ बैकअप / एक्सपोर्ट</h2>
      <p className="hint">
        CSV फाइल Excel में सीधे खुलती है (हिंदी भी सही दिखती है)। "पूरा बैकअप" महीने में एक बार ज़रूर
        डाउनलोड करके अपने पास रखें।
      </p>
      <div className="backup-grid">
        {ITEMS.map((item) => (
          <div className="card backup-card" key={item.key}>
            <div className="backup-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
            <button onClick={() => handleDownload(item)} disabled={busyKey === item.key}>
              {busyKey === item.key ? 'तैयार हो रहा है...' : '⬇️ डाउनलोड करें'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="farmer-view-error">{error}</p>}
    </div>
  );
}
