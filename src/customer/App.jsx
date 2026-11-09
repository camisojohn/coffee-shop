import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, configured, shopName } from "../lib/supabase";
import { fmt, pad } from "../lib/format";
import { submitOrder } from "../lib/orders";
import Icon from "../lib/Icons";
import Menu, { MenuSkeleton } from "./components/Menu";
import ItemSheet from "./components/ItemSheet";
import OrderTracker from "./components/OrderTracker";

const IDS_KEY = "cafe_order_ids";
const readIds = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(IDS_KEY) || "[]");
    const old = localStorage.getItem("cafe_last_order_id"); // migrate the old single order
    if (old && !ids.includes(old)) ids.push(old);
    return ids;
  } catch {
    return [];
  }
};
const saveIds = (ids) => {
  localStorage.setItem(IDS_KEY, JSON.stringify(ids.slice(-10))); // remember the last 10
  localStorage.removeItem("cafe_last_order_id");
};

export default function App() {
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState({});
  const [sizes, setSizes] = useState([]);
  const [milks, setMilks] = useState([]);
  const [extras, setExtras] = useState([]);
  const [cat, setCat] = useState("All");

  const [cart, setCart] = useState([]);
  const [sheet, setSheet] = useState(null); // null | "item" | "cart" | "name"
  const [activeItem, setActiveItem] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");

  const [myOrders, setMyOrders] = useState([]); // newest first
  const [view, setView] = useState("menu"); // "menu" | "order"

  const loadMenu = useCallback(async () => {
    const [c, o, m] = await Promise.all([
      supabase.from("categories").select("*").order("pos"),
      supabase.from("options").select("id,kind,name,price,pos").order("pos"),
      supabase.from("menu_items").select("id,name,cat,description,price,image_url,sold_out,pos").order("pos"),
    ]);
    if (c.error || o.error || m.error) throw c.error || o.error || m.error;
    const cats = {};
    c.data.forEach((r) => (cats[r.name] = { size: r.has_size, milk: r.has_milk, extra: r.has_extra }));
    setCategories(cats);
    setSizes(o.data.filter((r) => r.kind === "size"));
    setMilks(o.data.filter((r) => r.kind === "milk"));
    setExtras(o.data.filter((r) => r.kind === "extra"));
    setItems(m.data);
  }, []);

  const refreshMine = useCallback(async () => {
    const ids = readIds();
    if (!ids.length) return [];
    const results = await Promise.all(ids.map((id) => supabase.rpc("get_order", { p_id: id })));
    if (results.some((r) => r.error)) return null; // network hiccup: keep what's on screen
    const orders = [];
    const keep = [];
    results.forEach((r, i) => {
      if (r.data) {
        orders.push(r.data);
        keep.push(ids[i]);
      }
    });
    saveIds(keep);
    orders.sort((a, b) => b.no - a.no);
    const sig = (l) => l.map((o) => o.id + o.status).join();
    setMyOrders((prev) => (sig(prev) === sig(orders) ? prev : orders));
    return orders;
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoadError("This shop isn't connected yet. Add your Supabase URL and key to .env.");
      return;
    }
    (async () => {
      try {
        await loadMenu();
        const mine = await refreshMine();
        if (mine && mine.some((o) => o.status !== "completed")) setView("order"); // returning customer lands on their tracker
        setLoaded(true);
      } catch (e) {
        setLoadError("We can't reach the shop right now. Please refresh in a moment.");
      }
    })();
  }, [loadMenu, refreshMine]);

  // poll: order status every 4s, menu every ~24s
  const tick = useRef(0);
  useEffect(() => {
    if (!configured || !loaded) return;
    const id = setInterval(async () => {
      tick.current += 1;
      await refreshMine();
      if (tick.current % 6 === 0 && sheet === null) {
        try {
          await loadMenu();
        } catch (e) {
          /* keep last known menu on transient errors */
        }
      }
    }, 4000);
    return () => clearInterval(id);
  }, [loaded, sheet, loadMenu, refreshMine]);

  const openItem = (item) => {
    if (item.sold_out) return;
    setActiveItem(item);
    setSheet("item");
  };
  const closeSheet = () => setSheet(null);

  const cartCount = cart.reduce((t, l) => t + l.qty, 0);
  const cartTotal = cart.reduce((t, l) => t + l.unitPrice * l.qty, 0);

  // Rule 20: bump the cart bar whenever something is added
  const [bump, setBump] = useState(0);
  const prevCount = useRef(0);
  useEffect(() => {
    if (cartCount > prevCount.current) setBump((b) => b + 1);
    prevCount.current = cartCount;
  }, [cartCount]);

  const placeOrder = async (name, payment) => {
    if (!name) {
      setPlaceError("Please enter your name so we know who the order is for.");
      return;
    }
    setPlacing(true);
    setPlaceError("");
    try {
      const data = await submitOrder({ name, payment, cart });
      saveIds([...readIds(), data.id]);
      setMyOrders((prev) => [data, ...prev]);
      setCart([]);
      closeSheet();
      setView("order");
      window.scrollTo(0, 0);
    } catch (e) {
      setPlaceError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  const orderAgain = () => {
    setView("menu");
    setCat("All");
    window.scrollTo(0, 0);
  };

  const active = myOrders.filter((o) => o.status !== "completed");
  const tracking = view === "menu" && myOrders.length > 0;

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="bar">
            <span className="brand">{shopName}</span>
            {tracking && (
              <button className="pill" onClick={() => setView("order")}>
                <Icon name="receipt" />
                {active.length === 1 ? (
                  <>Track order <span className="code">{pad(active[0].no)}</span></>
                ) : active.length > 1 ? (
                  <>Track {active.length} orders</>
                ) : (
                  "My orders"
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="wrap">
        {loadError && <p className="sub" style={{ marginTop: 48 }}>{loadError}</p>}

        {!loadError && !loaded && <MenuSkeleton />}

        {!loadError && loaded && view === "menu" && (
          <>
            <Menu
              items={items}
              categories={categories}
              cat={cat}
              setCat={setCat}
              onOpen={openItem}
              heading="Order ahead, pick up at the counter"
              intro="Choose your drink, tell us your name, and we'll call it out when it's ready."
            />
            <footer className="foot">
              <a href="/staff.html">Staff</a>
            </footer>
          </>
        )}

        {!loadError && loaded && view === "order" && myOrders.length > 0 && (
          <>
            {myOrders.map((o) => (
              <OrderTracker key={o.id} order={o} />
            ))}
            <div className="done" style={{ paddingTop: 0 }}>
              <button className="cta" onClick={orderAgain}>
                <span>Order something else</span>
              </button>
            </div>
          </>
        )}
      </main>

      {view === "menu" && cartCount > 0 && !sheet && (
        <div className="cartbar">
          <button key={bump} className="cta" onClick={() => setSheet("cart")}>
            <span>
              View order · <span className="num">{cartCount}</span> {cartCount === 1 ? "item" : "items"}
            </span>
            <span className="num">{fmt(cartTotal)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
          <ItemSheet
            mode={sheet}
            item={activeItem}
            categories={categories}
            sizes={sizes}
            milks={milks}
            extras={extras}
            cart={cart}
            setCart={setCart}
            onClose={closeSheet}
            onGoName={() => setSheet("name")}
            onBackToCart={() => {
              setPlaceError("");
              setSheet("cart");
            }}
            onPlace={placeOrder}
            placing={placing}
            placeError={placeError}
          />
        </div>
      )}
    </>
  );
}