import { useState } from "react";
import { fmt } from "../../lib/format";
import { submitOrder } from "../../lib/orders";
import Menu from "../../customer/components/Menu";
import ItemSheet from "../../customer/components/ItemSheet";

// Staff ordering for customers who can't or don't want to use the app.
// Same menu, same options, same place_order function as the customer page.
export default function NewOrderTab({ items, categories, sizes, milks, extras, onPlaced, flash }) {
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState([]);
  const [sheet, setSheet] = useState(null); // null | "item" | "cart" | "name"
  const [activeItem, setActiveItem] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");

  const count = cart.reduce((t, l) => t + l.qty, 0);
  const total = cart.reduce((t, l) => t + l.unitPrice * l.qty, 0);

  const place = async (name, payment) => {
    setPlacing(true);
    setPlaceError("");
    try {
      const order = await submitOrder({ name, payment, cart });
      setCart([]);
      setSheet(null);
      setCat("All");
      onPlaced(order);
    } catch (e) {
      setPlaceError(e.message);
      if (e.raw?.code === "42501" || /permission/i.test(e.raw?.message || "")) {
        flash("Staff accounts need permission to place orders. See the note in the setup instructions.");
      }
    } finally {
      setPlacing(false);
    }
  };

  const close = () => setSheet(null);

  return (
    <>
      <div className="pos-head">
        <h2>Take an order for a customer</h2>
      </div>
      <p className="sub">Pick the items, add their name, and choose how they're paying. The order goes straight to the Orders tab.</p>

      <Menu
        items={items}
        categories={categories}
        cat={cat}
        setCat={setCat}
        onOpen={(item) => {
          if (item.sold_out) return;
          setActiveItem(item);
          setSheet("item");
        }}
      />

      {count > 0 && !sheet && (
        <div className="cartbar">
          <button className="cta" onClick={() => setSheet("cart")}>
            <span>
              Review order · <span className="num">{count}</span> {count === 1 ? "item" : "items"}
            </span>
            <span className="num">{fmt(total)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
          <ItemSheet
            variant="staff"
            mode={sheet}
            item={activeItem}
            categories={categories}
            sizes={sizes}
            milks={milks}
            extras={extras}
            cart={cart}
            setCart={setCart}
            onClose={close}
            onGoName={() => setSheet("name")}
            onBackToCart={() => {
              setPlaceError("");
              setSheet("cart");
            }}
            onPlace={place}
            placing={placing}
            placeError={placeError}
          />
        </div>
      )}
    </>
  );
}
