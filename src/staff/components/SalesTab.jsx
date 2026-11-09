import { useState } from "react";
import { fmt } from "../../lib/format";

const RANGES = [
  ["today", "Today"],
  ["week", "Last 7 days"],
  ["all", "All time"],
];

export default function SalesTab({ orders }) {
  const [range, setRange] = useState("today");

  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  const t0 = d0.getTime();
  const from = range === "today" ? t0 : range === "week" ? t0 - 6 * 864e5 : 0;
  const os = orders.filter((o) => o.ts >= from);

  const rev = os.reduce((t, o) => t + o.total, 0);
  const cost = os.reduce((t, o) => t + o.cost, 0);
  const profit = rev - cost;
  const n = os.length;

  const items = {};
  os.forEach((o) =>
    o.lines.forEach((l) => {
      const x = items[l.name] || (items[l.name] = { q: 0, p: 0 });
      x.q += l.qty;
      x.p += (l.unitPrice - l.unitCost) * l.qty;
    })
  );
  const rows = Object.entries(items);
  const top = (key) =>
    [...rows]
      .sort((a, b) => b[1][key] - a[1][key])
      .slice(0, 5)
      .map(([name, x]) => (
        <div className="row" key={name}>
          <span>{name}</span>
          <b>{key === "q" ? x.q + " sold" : fmt(x.p)}</b>
        </div>
      ));

  const buckets = {};
  os.forEach((o) => {
    const d = new Date(o.ts);
    const h = d.getHours();
    const key = range === "today" ? h : d.toDateString();
    const b =
      buckets[key] ||
      (buckets[key] = {
        label: range === "today" ? (h % 12 || 12) + (h < 12 ? "a" : "p") : d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        ts: o.ts,
        rev: 0,
        profit: 0,
      });
    b.rev += o.total;
    b.profit += o.total - o.cost;
  });
  const bars = Object.values(buckets)
    .sort((a, b) => a.ts - b.ts)
    .slice(-14);
  const max = Math.max(1, ...bars.map((b) => b.rev));

  const Tile = ({ label, value }) => (
    <div className="tile">
      {label}
      <b>{value}</b>
    </div>
  );

  return (
    <>
      <div className="bar2">
        <h2>Sales and profit</h2>
        <div className="seg">
          {RANGES.map(([k, label]) => (
            <button key={k} className="btn" aria-pressed={range === k} onClick={() => setRange(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tiles">
        <Tile label="Revenue" value={fmt(rev)} />
        <Tile label="Cost" value={fmt(cost)} />
        <Tile label={`Profit (${rev ? Math.round((profit / rev) * 100) : 0}% margin)`} value={fmt(profit)} />
        <Tile label="Orders" value={n} />
        <Tile label="Average order" value={fmt(n ? rev / n : 0)} />
        <Tile label="Profit per order" value={fmt(n ? profit / n : 0)} />
      </div>

      <div className="bar2">
        <h3>{range === "today" ? "By hour" : "By day"}</h3>
      </div>
      {bars.length === 0 ? (
        <p className="sub">No sales in this period.</p>
      ) : (
        <>
          <div className="chart">
            {bars.map((b, i) => (
              <div className="col" key={i}>
                <div className="area">
                  <div className="rb" style={{ height: `${(b.rev / max) * 100}%` }}>
                    <div className="pb" style={{ height: `${b.rev ? (Math.max(0, b.profit) / b.rev) * 100 : 0}%` }} />
                  </div>
                </div>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
          <p className="sub" style={{ marginTop: 8 }}>
            Light bar is revenue. Dark bar is profit.
          </p>
        </>
      )}

      <div className="two2" style={{ marginTop: 24 }}>
        <div>
          <h3>Best sellers</h3>
          {rows.length ? top("q") : <p className="sub">No sales yet.</p>}
        </div>
        <div>
          <h3>Most profitable</h3>
          {rows.length ? top("p") : <p className="sub">No sales yet.</p>}
        </div>
      </div>
    </>
  );
}
