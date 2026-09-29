import React, { useEffect, useState } from 'react';
import { getReportSummary } from '../api';
import { money } from '../utils';

const MONTHS = ['जन', 'फर', 'मार्च', 'अप्र', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];

const short = (v) => {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};

// Chhota sa "nice" maximum nikalo taaki chart ki lines saaf aayein
const niceMax = (v) => {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

function MonthlyChart({ months }) {
  const W = 760;
  const H = 300;
  const left = 46;
  const right = 10;
  const top = 16;
  const bottom = 34;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  const maxVal = niceMax(Math.max(0, ...months.map((m) => Math.max(m.totalCost, m.totalPaid))));
  const groupW = plotW / 12;
  const barW = Math.min(20, groupW / 2.6);
  const y = (v) => top + plotH - (v / maxVal) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxVal);

  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="महीने-वार सिंचाई और जमा">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="#e3e8e3" />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#777">
              {short(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const gx = left + i * groupW + groupW / 2;
          return (
            <g key={m.month}>
              <rect
                x={gx - barW - 1}
                y={y(m.totalCost)}
                width={barW}
                height={top + plotH - y(m.totalCost)}
                fill="#3e6b4f"
                rx="2"
              >
                <title>{`${MONTHS[i]}: सिंचाई ${money(m.totalCost)}`}</title>
              </rect>
              <rect
                x={gx + 1}
                y={y(m.totalPaid)}
                width={barW}
                height={top + plotH - y(m.totalPaid)}
                fill="#2f6fa8"
                rx="2"
              >
                <title>{`${MONTHS[i]}: जमा ${money(m.totalPaid)}`}</title>
              </rect>
              <text x={gx} y={H - 12} textAnchor="middle" fontSize="11" fill="#555">
                {MONTHS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ReportsView() {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getReportSummary(year)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError('रिपोर्ट लोड नहीं हो पाई।');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  if (!data) {
    return (
      <div className="page-view">
        <h2>📈 रिपोर्ट</h2>
        {loading && <p>लोड हो रहा है...</p>}
        {error && <p className="farmer-view-error">{error}</p>}
      </div>
    );
  }

  const yearTotalCost = data.months.reduce((s, m) => s + m.totalCost, 0);
  const yearTotalPaid = data.months.reduce((s, m) => s + m.totalPaid, 0);
  const yearHours = data.months.reduce((s, m) => s + m.hours, 0);
  const maxCrop = Math.max(1, ...data.crops.map((c) => c.totalCost));

  return (
    <div className="page-view">
      <div className="report-head">
        <h2>📈 रिपोर्ट</h2>
        <label className="year-select">
          साल:
          <select value={data.year} onChange={(e) => setYear(Number(e.target.value))}>
            {data.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="farmer-view-error">{error}</p>}

      <div className="dashboard-totals">
        <div className="dash-stat">
          <span className="dash-label">{data.year} की सिंचाई</span>
          <span className="dash-value">{money(yearTotalCost)}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-label">{data.year} में जमा</span>
          <span className="dash-value">{money(yearTotalPaid)}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-label">कुल घंटे</span>
          <span className="dash-value">{yearHours.toFixed(1)}</span>
        </div>
      </div>

      <div className="card">
        <h3>महीने-वार सिंचाई और जमा</h3>
        <div className="chart-legend">
          <span>
            <i style={{ background: '#3e6b4f' }} /> सिंचाई (₹)
          </span>
          <span>
            <i style={{ background: '#2f6fa8' }} /> जमा (₹)
          </span>
        </div>
        <MonthlyChart months={data.months} />
      </div>

      <div className="card">
        <h3>महीने का हिसाब</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>महीना</th>
                <th>एंट्री</th>
                <th>घंटे</th>
                <th>सिंचाई (₹)</th>
                <th>जमा (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m, i) => (
                <tr key={m.month}>
                  <td>{MONTHS[i]}</td>
                  <td>{m.entries}</td>
                  <td>{m.hours.toFixed(1)}</td>
                  <td>{m.totalCost.toFixed(2)}</td>
                  <td>{m.totalPaid.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>कुल</td>
                <td>{data.months.reduce((s, m) => s + m.entries, 0)}</td>
                <td>{yearHours.toFixed(1)}</td>
                <td>{yearTotalCost.toFixed(2)}</td>
                <td>{yearTotalPaid.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>फसल-वार ({data.year})</h3>
        {data.crops.length === 0 && <p className="empty">इस साल कोई एंट्री नहीं है।</p>}
        {data.crops.map((c) => (
          <div className="crop-row" key={c.crop}>
            <div className="crop-name">{c.crop}</div>
            <div className="crop-bar-wrap">
              <div className="crop-bar" style={{ width: `${(c.totalCost / maxCrop) * 100}%` }} />
            </div>
            <div className="crop-val">
              {money(c.totalCost)} <small>({c.hours.toFixed(1)} घं.)</small>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>साल-दर-साल</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>साल</th>
                <th>एंट्री</th>
                <th>घंटे</th>
                <th>सिंचाई (₹)</th>
                <th>जमा (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.yearly.map((y) => (
                <tr key={y.year}>
                  <td>{y.year}</td>
                  <td>{y.entries}</td>
                  <td>{y.hours.toFixed(1)}</td>
                  <td>{y.totalCost.toFixed(2)}</td>
                  <td>{y.totalPaid.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
