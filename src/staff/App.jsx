import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, configured, shopName } from "../lib/supabase";
import { parseName, pad } from "../lib/format";
import Login from "./components/Login";
import OrdersTab from "./components/OrdersTab";
import MenuTab from "./components/MenuTab";
import InventoryTab from "./components/InventoryTab";
import SalesTab from "./components/SalesTab";
import NewOrderTab from "./components/NewOrderTab";

const TABS = [
  ["orders", "Orders"],
  ["new", "Take order"],
  ["menu", "Menu"],
  ["inv", "Inventory"],
  ["sales", "Sales"],
];

const mapOrder = (r) => ({
  id: r.id,
  no: r.no,
  name: parseName(r.customer_name).name,
  payment: parseName(r.customer_name).payment,
  lines: r.lines,
  total: +r.total,
  cost: +r.cost,
  status: r.status,
  ts: Date.parse(r.created_at),
});

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("active");
  const [toast, setToast] = useState("");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState({});
  const [sizes, setSizes] = useState([]);
  const [milks, setMilks] = useState([]);
  const [extras, setExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadShop = useCallback(async () => {
    const [m, c, o] = await Promise.all([
      supabase.from("menu_items").select("*").order("pos"),
      supabase.from("categories").select("*").order("pos"),
      supabase.from("options").select("*").order("pos"),
    ]);
    if (m.error || c.error || o.error) throw m.error || c.error || o.error;
    setItems(m.data);
    const cats = {};
    c.data.forEach((r) => (cats[r.name] = { size: r.has_size, milk: r.has_milk, extra: r.has_extra }));
    setCategories(cats);
    setSizes(o.data.filter((r) => r.kind === "size"));
    setMilks(o.data.filter((r) => r.kind === "milk"));
    setExtras(o.data.filter((r) => r.kind === "extra"));
  }, []);

  const loadOrders = useCallback(async () => {
    const [i, o] = await Promise.all([
      supabase.from("inventory").select("*").order("name"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (!i.error) setInventory(i.data);
    if (!o.error) setOrders(o.data.map(mapOrder));
  }, []);

  const reload = useCallback(async () => {
    try {
      await Promise.all([loadShop(), loadOrders()]);
    } catch {
      flash("Couldn't refresh. Check your connection.");
    }
  }, [loadShop, loadOrders]);

  const channelRef = useRef(null);
  useEffect(() => {
    if (!session) return;
    reload();
    channelRef.current = supabase
      .channel("staff-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadOrders)
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [session, reload, loadOrders]);

  const setStatus = async (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      flash("Couldn't update the order.");
      loadOrders();
    }
  };

  const signOut = () => supabase.auth.signOut();

  const onPlaced = (order) => {
    flash("Order " + pad(order.no) + " sent to the queue.");
    loadOrders();
    setFilter("active");
    setTab("orders");
  };

  if (!configured) {
    return (
      <div className="wrap">
        <p className="sub" style={{ marginTop: 48 }}>
          This shop isn't connected yet. Add your Supabase URL and key to .env.
        </p>
      </div>
    );
  }
  if (session === undefined) {
    return (
      <div className="wrap">
        <div className="sk" style={{ height: 24, width: 160, marginTop: 48 }} aria-label="Loading" />
      </div>
    );
  }
  if (!session) return <Login />;

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="bar">
            <span className="brand">{shopName} Staff</span>
            <div className="tabs">
              {TABS.map(([k, label]) => (
                <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>
                  {label}
                </button>
              ))}
              <button className="chip signout" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="adm">
        {tab === "orders" && <OrdersTab orders={orders} filter={filter} setFilter={setFilter} onSetStatus={setStatus} />}
        {tab === "new" && (
          <NewOrderTab items={items} categories={categories} sizes={sizes} milks={milks} extras={extras} onPlaced={onPlaced} flash={flash} />
        )}
        {tab === "menu" && (
          <MenuTab items={items} categories={categories} sizes={sizes} milks={milks} extras={extras} inventory={inventory} reload={reload} flash={flash} />
        )}
        {tab === "inv" && <InventoryTab inventory={inventory} reload={reload} flash={flash} />}
        {tab === "sales" && <SalesTab orders={orders} />}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
