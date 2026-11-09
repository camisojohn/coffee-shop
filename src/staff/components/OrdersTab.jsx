import { fmt, pad } from "../../lib/format";
import Icon from "../../lib/Icons";

const ST = [
  ["received", "Received"],
  ["preparing", "Preparing"],
  ["ready", "Ready"],
  ["completed", "Completed"],
];

export default function OrdersTab({ orders, filter, setFilter, onSetStatus }) {
  const active = orders.filter((o) => o.status !== "completed").sort((a, b) => a.ts - b.ts);
  const done = orders
    .filter((o) => o.status === "completed")
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20);
  const list = filter === "done" ? done : active;

  return (
    <>
      <div className="bar2">
        <h2>{filter === "done" ? "Last 20 completed orders" : "Orders to make"}</h2>
        <div className="seg">
          <button className="btn" aria-pressed={filter !== "done"} onClick={() => setFilter("active")}>
            Active ({active.length})
          </button>
          <button className="btn" aria-pressed={filter === "done"} onClick={() => setFilter("done")}>
            Completed
          </button>
        </div>
      </div>
      {filter !== "done" && <p className="sub">Oldest first. Start any order, so a quick drink doesn't have to wait.</p>}

      <div className="ogrid">
        {list.length === 0 && (
          <p className="sub">{filter === "done" ? "No completed orders yet." : "No active orders. New ones appear here automatically."}</p>
        )}
        {list.map((o) => (
          <div className="oc" key={o.id}>
            <div className="bar2" style={{ margin: "0 0 var(--s2)" }}>
              <h3>
                <span className="code">{pad(o.no)}</span> {o.name}
              </h3>
              <span className="num" style={{ color: "var(--muted)" }}>
                {Math.max(0, Math.round((Date.now() - o.ts) / 60000))} min ago
              </span>
            </div>
            <p className={"pay-tag " + o.payment}>
              <Icon name={o.payment === "qr" ? "qr" : "cash"} />
              {o.payment === "qr" ? "Paid by QR. Check your bank app." : "Pays at the counter"}
            </p>
            {o.lines.map((l, i) => (
              <div className="row" key={i}>
                <span>
                  {l.qty} × {l.name}
                  {l.opts ? <small> ({l.opts})</small> : null}
                </span>
                <span className="num">{fmt(l.unitPrice * l.qty)}</span>
              </div>
            ))}
            <div className="row total">
              <b>Total</b>
              <b className="num">{fmt(o.total)}</b>
            </div>
            <div className="seg" style={{ marginTop: "var(--s3)" }}>
              {ST.map(([k, label]) => (
                <button key={k} className="btn" aria-pressed={o.status === k} onClick={() => onSetStatus(o.id, k)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
