import React from "react";
import { fmtNum } from "../utils";

// ---------- सिंचाई ka table — bilkul pehle jaisa (घंटे aur मिनट alag columns) ----------
// onEdit / onDelete diye jaayein to har row me ✎ ✕ buttons dikhte hain (admin screen),
// nahi to simple table (print aur kisan wala page).
export function SichaiTable({
  rows,
  emptyText = "कोई एंट्री नहीं",
  onEdit,
  onDelete,
}) {
  const withActions = !!(onEdit || onDelete);
  const totalHours = rows.reduce((s, e) => s + e.hours + e.minutes / 60, 0);
  const totalCost = rows.reduce((s, e) => s + e.cost, 0);
  return (
    <table className="entries-sichai">
      <thead>
        <tr>
          <th>तारीख</th>
          <th>फसल</th>
          <th>जगह</th>
          <th>घंटे</th>
          <th>मिनट</th>
          <th>रेट</th>
          <th>पैसा (₹)</th>
          {withActions && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e._id}>
            <td>{e.date}</td>
            <td>{e.crop}</td>
            <td>{e.place}</td>
            <td>{e.hours}</td>
            <td>{e.minutes}</td>
            <td>{e.rate}</td>
            <td>{e.cost.toFixed(2)}</td>
            {withActions && (
              <td className="row-actions">
                {onEdit && (
                  <button className="edit-btn" onClick={() => onEdit(e)}>
                    ✎
                  </button>
                )}
                {onDelete && (
                  <button
                    className="delete-btn"
                    onClick={() => onDelete(e._id)}
                  >
                    ✕
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={withActions ? 8 : 7} className="empty">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="total-row">
            <td colSpan="3">कुल ({rows.length} एंट्री)</td>
            <td colSpan="2">{totalHours.toFixed(1)} घंटे</td>
            <td colSpan={withActions ? 3 : 2}>₹{totalCost.toFixed(2)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// ---------- ईख पेराई ka alag table — तारीख, नाद, रेट, पैसा (जगह/खेत nahi) ----------
export function PeraiTable({
  rows,
  emptyText = "कोई पेराई एंट्री नहीं",
  onEdit,
  onDelete,
}) {
  const withActions = !!(onEdit || onDelete);
  const totalNad = rows.reduce((s, e) => s + (Number(e.nad) || 0), 0);
  const totalCost = rows.reduce((s, e) => s + e.cost, 0);
  return (
    <table className="entries-perai">
      <thead>
        <tr>
          <th>तारीख</th>
          <th>नाद</th>
          <th>रेट (₹/नाद)</th>
          <th>पैसा (₹)</th>
          {withActions && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e._id}>
            <td>{e.date}</td>
            <td>{fmtNum(e.nad)}</td>
            <td>{e.rate}</td>
            <td>{e.cost.toFixed(2)}</td>
            {withActions && (
              <td className="row-actions">
                {onEdit && (
                  <button className="edit-btn" onClick={() => onEdit(e)}>
                    ✎
                  </button>
                )}
                {onDelete && (
                  <button
                    className="delete-btn"
                    onClick={() => onDelete(e._id)}
                  >
                    ✕
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={withActions ? 5 : 4} className="empty">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="total-row">
            <td>कुल ({rows.length} एंट्री)</td>
            <td>{fmtNum(totalNad)} नाद</td>
            <td colSpan={withActions ? 3 : 2}>₹{totalCost.toFixed(2)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// ---------- कुल सिंचाई | (ईख पेराई) | कुल जमा | बकाया ----------
// Agar ईख पेराई ka paisa 0 hai to line bilkul pehle jaisi dikhti hai (पेराई wala hissa chhup jata hai).
const NORMAL_LABELS = {
  sichai: "कुल सिंचाई",
  perai: "ईख पेराई",
  paid: "कुल जमा",
  due: "बकाया",
};
export const RANGE_LABELS = {
  sichai: "कुल सिंचाई",
  perai: "कुल ईख पेराई",
  paid: "कुल जमा",
  due: "कुल बकाया",
};

export function SummaryBar({
  sichai,
  perai,
  paid,
  due,
  labels = NORMAL_LABELS,
}) {
  return (
    <div className="summary-bar">
      {labels.sichai}: ₹{sichai.toFixed(2)} &nbsp;|&nbsp;{" "}
      {perai > 0 && (
        <>
          {labels.perai}: ₹{perai.toFixed(2)} &nbsp;|&nbsp;{" "}
        </>
      )}
      {labels.paid}: ₹{paid.toFixed(2)} &nbsp;|&nbsp; {labels.due}: ₹
      {due.toFixed(2)}
    </div>
  );
}
