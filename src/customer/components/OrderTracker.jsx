import { fmt, pad, parseName } from "../../lib/format";
import Icon from "../../lib/Icons";

const STEPS = [
  ["received", "Received"],
  ["preparing", "Preparing"],
  ["ready", "Ready"],
];
const MSG = {
  received: "We've got your order.",
  preparing: "Your order is being made.",
  ready: "Ready! Please pick it up at the counter.",
  completed: "Enjoy! Thanks for stopping by.",
};

export default function OrderTracker({ order, onAgain }) {
  const idx = order.status === "completed" ? 2 : STEPS.findIndex(([k]) => k === order.status);
  const { name, payment } = parseName(order.name);

  return (
    <div className="done">
      <p className="sub" style={{ margin: 0 }}>
        {name}, your order number is
      </p>
      <div className="no code">{pad(order.no)}</div>

      <div className="steps" role="img" aria-label={"Order status: " + (MSG[order.status] || "")}>
        {STEPS.map(([k, label], i) => (
          <div className={"st" + (i <= idx ? " on" : "")} key={k}>
            <i>
              <Icon name="check" />
            </i>
            {label}
          </div>
        ))}
      </div>
      <p className="msg" aria-live="polite" key={order.status}>
        {MSG[order.status] || ""}
      </p>

      <div className="box">
        {order.lines.map((l, i) => (
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
          <b className="num">{fmt(order.total)}</b>
        </div>
      </div>

      <p className="paid">
        <Icon name={payment === "qr" ? "qr" : "cash"} />
        {payment === "qr" ? "Paying online. Show your confirmation to the staff." : "Pay at the counter when you pick up."}
      </p>

      {onAgain && (
        <button className="cta" onClick={onAgain}>
          <span>Order something else</span>
        </button>
      )}
    </div>
  );
}