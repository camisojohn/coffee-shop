import { useEffect, useRef, useState } from "react";
import { fmt, placeholderIcon } from "../../lib/format";
import Icon from "../../lib/Icons";
import PaymentQR from "../../lib/PaymentQR";

function Option({ opt, active, onClick }) {
  return (
    <button className="opt" aria-pressed={active} onClick={onClick}>
      {opt.name}
      {opt.price ? <small className="num">+{fmt(opt.price)}</small> : null}
    </button>
  );
}

// One sheet, three modes: choosing options for an item, reviewing the cart,
// and checkout (name + payment). `variant="staff"` is used on the staff
// "Take order" screen so staff can order for walk-in customers.
export default function ItemSheet({
  mode,
  item,
  categories,
  sizes,
  milks,
  extras,
  cart,
  setCart,
  onClose,
  onGoName,
  onBackToCart,
  onPlace,
  placing,
  placeError,
  variant = "customer",
}) {
  const staff = variant === "staff";
  const cf = item ? categories[item.cat] || {} : {};
  const fresh = () => ({
    size: cf.size ? sizes[1]?.name || sizes[0]?.name || null : null,
    milk: cf.milk ? milks[0]?.name || null : null,
    extras: [],
    qty: 1,
  });
  const [sel, setSel] = useState(fresh);
  const [name, setName] = useState("");
  const [payment, setPayment] = useState("counter"); // "counter" | "qr"
  const nameRef = useRef(null);

  useEffect(() => {
    if (mode === "item") setSel(fresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, mode]);

  useEffect(() => {
    if (mode === "name") setTimeout(() => nameRef.current?.focus(), 50);
  }, [mode]);

  const calc = () => {
    if (!item) return { p: 0, c: 0 };
    let p = item.price,
      c = item.cost || 0;
    const add = (list, n) => {
      const o = list.find((x) => x.name === n);
      if (o) {
        p += o.price;
        c += o.cost;
      }
    };
    if (sel.size) add(sizes, sel.size);
    if (sel.milk) add(milks, sel.milk);
    sel.extras.forEach((n) => add(extras, n));
    return { p, c };
  };

  const toggleExtra = (n) =>
    setSel((s) => ({ ...s, extras: s.extras.includes(n) ? s.extras.filter((x) => x !== n) : [...s.extras, n] }));

  const addToCart = () => {
    const { p, c } = calc();
    const opts = [sel.size, sel.milk && sel.milk + " milk", ...sel.extras].filter(Boolean).join(", ");
    setCart((prev) => {
      const i = prev.findIndex((l) => l.id === item.id && l.opts === opts);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + sel.qty };
        return next;
      }
      return [
        ...prev,
        { id: item.id, name: item.name, opts, qty: sel.qty, unitPrice: p, unitCost: c, size: sel.size, milk: sel.milk, extras: sel.extras },
      ];
    });
    onClose();
  };

  const changeLine = (i, d) =>
    setCart((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + d };
      return next.filter((l) => l.qty > 0);
    });

  const total = cart.reduce((t, l) => t + l.unitPrice * l.qty, 0);

  const head = (title, sub) => (
    <div className="sh-head">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      <button className="x" aria-label="Close" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  );

  if (mode === "item" && item) {
    const t = calc();
    return (
      <div className="sheet" role="dialog" aria-modal="true" aria-label={item.name}>
        {/* Rule 6: show the actual product */}
        {item.image_url && (
          <div className="hero-wrap">
            <img className="hero" src={item.image_url} alt="" />
            <button className="x" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
        )}
        {item.image_url ? (
          <div className="sh-head" style={{ paddingBottom: 0 }}>
            <div>
              <h2>{item.name}</h2>
              {item.description && <p>{item.description}</p>}
            </div>
          </div>
        ) : (
          head(item.name, item.description)
        )}
        <div className="sh-body">
          {cf.size && (
            <div className="grp">
              <h3>Size</h3>
              <div className="opts">
                {sizes.map((o) => (
                  <Option key={o.id} opt={o} active={sel.size === o.name} onClick={() => setSel((s) => ({ ...s, size: o.name }))} />
                ))}
              </div>
            </div>
          )}
          {cf.milk && (
            <div className="grp">
              <h3>Milk</h3>
              <div className="opts">
                {milks.map((o) => (
                  <Option key={o.id} opt={o} active={sel.milk === o.name} onClick={() => setSel((s) => ({ ...s, milk: o.name }))} />
                ))}
              </div>
            </div>
          )}
          {cf.extra && (
            <div className="grp">
              <h3>Extras</h3>
              <div className="opts">
                {extras.map((o) => (
                  <Option key={o.id} opt={o} active={sel.extras.includes(o.name)} onClick={() => toggleExtra(o.name)} />
                ))}
              </div>
            </div>
          )}
          <div className="grp">
            <h3>How many</h3>
            <div className="qty">
              <button aria-label="Fewer" onClick={() => setSel((s) => ({ ...s, qty: Math.max(1, s.qty - 1) }))}>
                <Icon name="minus" />
              </button>
              <b className="num">{sel.qty}</b>
              <button aria-label="More" onClick={() => setSel((s) => ({ ...s, qty: Math.min(20, s.qty + 1) }))}>
                <Icon name="plus" />
              </button>
            </div>
          </div>
        </div>
        <div className="sh-foot">
          <button className="cta" onClick={addToCart}>
            <span>Add to order</span>
            <span className="num">{fmt(t.p * sel.qty)}</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "cart") {
    return (
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Your order">
        {head(staff ? "Order summary" : "Review your order")}
        <div className="sh-body">
          {cart.length === 0 && <p className="sub">Nothing here yet. Pick something from the menu.</p>}
          {cart.map((l, i) => (
            <div className="line" key={i}>
              <div>
                <b>{l.name}</b>
                {l.opts && <small>{l.opts}</small>}
              </div>
              <div className="qty">
                <button aria-label="Fewer" onClick={() => changeLine(i, -1)}>
                  <Icon name="minus" />
                </button>
                <b className="num">{l.qty}</b>
                <button aria-label="More" onClick={() => changeLine(i, 1)}>
                  <Icon name="plus" />
                </button>
              </div>
              <span className="num">{fmt(l.unitPrice * l.qty)}</span>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="sh-foot">
            <button className="cta" onClick={onGoName}>
              <span>Continue</span>
              <span className="num">{fmt(total)}</span>
            </button>
            <button className="ghost" onClick={onClose}>
              Add more items
            </button>
          </div>
        )}
      </div>
    );
  }

  // mode === "name": checkout
  const submit = () => onPlace(name.trim() || (staff ? "Walk-in" : ""), payment);
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Checkout">
      {head(staff ? "Customer and payment" : "Who is this order for?", staff ? "Leave the name empty for a walk-in." : "We'll call this name when it's ready.")}
      <div className="sh-body">
        <input
          ref={nameRef}
          style={{ width: "100%" }}
          maxLength={24}
          placeholder={staff ? "Customer name (optional)" : "Your name"}
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <p className="err">{placeError}</p>

        <div className="grp" style={{ marginTop: 8 }}>
          <h3>Payment</h3>
          <div className="pay">
            <button className="opt" aria-pressed={payment === "counter"} onClick={() => setPayment("counter")}>
              <Icon name="cash" />
              {staff ? "Cash / card" : "Pay at counter"}
            </button>
            <button className="opt" aria-pressed={payment === "qr"} onClick={() => setPayment("qr")}>
              <Icon name="qr" />
              {staff ? "QR payment" : "Pay online"}
            </button>
          </div>
          {payment === "qr" && <PaymentQR total={total} />}
        </div>

        <div className="grp">
          {cart.map((l, i) => (
            <div className="row" key={i}>
              <span>
                {l.qty} × {l.name}
              </span>
              <span className="num">{fmt(l.unitPrice * l.qty)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sh-foot">
        <button className={"cta" + (placing ? " busy" : "")} disabled={placing} onClick={submit}>
          <span>{placing ? "Sending order" : payment === "qr" ? "I've paid, place order" : "Place order"}</span>
          {!placing && <span className="num">{fmt(total)}</span>}
        </button>
        <button className="ghost" onClick={onBackToCart}>
          Back to order
        </button>
      </div>
    </div>
  );
}
