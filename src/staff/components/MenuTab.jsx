import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { fmt, placeholderIcon } from "../../lib/format";
import ItemEditor from "./ItemEditor";

function AddSection({ onClose, onSaved, existing, flash }) {
  const [name, setName] = useState("");
  const [size, setSize] = useState(false);
  const [milk, setMilk] = useState(false);
  const [extra, setExtra] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const n = name.trim();
    if (!n) return setError("Enter a section name.");
    if (existing.includes(n)) return setError("That section already exists.");
    const { error } = await supabase.from("categories").insert({ name: n, has_size: size, has_milk: milk, has_extra: extra });
    if (error) return flash("Couldn't add the section.");
    onSaved();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sh-head">
          <div>
            <h2>Add section</h2>
            <p className="sub" style={{ margin: 0 }}>
              For example: Sandwiches, Smoothies.
            </p>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sh-body form">
          <label>
            Section name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={size} onChange={(e) => setSize(e.target.checked)} />
            Customers can pick a size
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={milk} onChange={(e) => setMilk(e.target.checked)} />
            Customers can pick milk
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={extra} onChange={(e) => setExtra(e.target.checked)} />
            Customers can add extras
          </label>
          <p className="err">{error}</p>
        </div>
        <div className="sh-foot">
          <button className="cta" onClick={save}>
            Add section
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuTab({ items, categories, sizes, milks, extras, inventory, reload, flash }) {
  const [editing, setEditing] = useState(null); // item object | "new" | null
  const [addingSection, setAddingSection] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const toggleSoldOut = async (item) => {
    const { error } = await supabase.from("menu_items").update({ sold_out: !item.sold_out }).eq("id", item.id);
    if (error) flash("Couldn't update the item.");
    else reload();
  };

  const removeItem = async (item) => {
    if (confirmDelete !== item.id) return setConfirmDelete(item.id);
    setConfirmDelete(null);
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
    if (error) return flash("Couldn't delete the item.");
    if (item.image_url) {
      const i = item.image_url.indexOf("/menu-images/");
      if (i >= 0) supabase.storage.from("menu-images").remove([item.image_url.slice(i + 13).split("?")[0]]);
    }
    reload();
  };

  const removeSection = async (name) => {
    const { error } = await supabase.from("categories").delete().eq("name", name);
    if (error) flash("Couldn't remove the section.");
    else reload();
  };

  const updateOption = async (opt, field, value) => {
    const { error } = await supabase
      .from("options")
      .update({ [field]: Math.max(0, +value || 0) })
      .eq("id", opt.id);
    if (error) flash("Couldn't save.");
    else reload();
  };

  const clearOrders = async () => {
    if (!confirmClear) return setConfirmClear(true);
    setConfirmClear(false);
    const { error } = await supabase.rpc("clear_orders");
    if (error) flash("Couldn't clear orders.");
    else reload();
  };

  const opts = [
    ...sizes.map((o) => ["Size", o]),
    ...milks.map((o) => ["Milk", o]),
    ...extras.map((o) => ["Extra", o]),
  ];

  return (
    <>
      <div className="bar2">
        <h2>Menu</h2>
        <div className="seg">
          <button className="btn" onClick={() => setAddingSection(true)}>
            Add section
          </button>
          <button className="btn pri" onClick={() => setEditing("new")}>
            Add item
          </button>
        </div>
      </div>

      {Object.keys(categories).map((k) => {
        const its = items.filter((x) => x.cat === k);
        return (
          <div key={k}>
            <div className="bar2">
              <h3>{k}</h3>
              {its.length === 0 && (
                <button className="btn" onClick={() => removeSection(k)}>
                  Remove section
                </button>
              )}
            </div>
            {its.length === 0 && <p className="sub">No items yet.</p>}
            {its.map((x) => {
              const p = x.price - x.cost;
              return (
                <div className="mrow" key={x.id}>
                  <span className="ic2">{x.image_url ? <img src={x.image_url} alt="" /> : placeholderIcon(x.cat)}</span>
                  <div className="grow">
                    <b>{x.name}</b> {x.sold_out && <span className="low">Sold out</span>}
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      Cost {fmt(x.cost)}, price {fmt(x.price)}, profit{" "}
                      <span className={p < 0 ? "low" : ""}>
                        {fmt(p)} ({x.price ? Math.round((p / x.price) * 100) : 0}%)
                      </span>
                    </small>
                  </div>
                  <div className="seg">
                    <button className="btn" onClick={() => toggleSoldOut(x)}>
                      {x.sold_out ? "Mark available" : "Mark sold out"}
                    </button>
                    <button className="btn" onClick={() => setEditing(x)}>
                      Edit
                    </button>
                    <button className="btn" onClick={() => removeItem(x)}>
                      {confirmDelete === x.id ? "Confirm delete" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="bar2">
        <h3>Size, milk and extra prices</h3>
      </div>
      <p className="sub">Price is added to the item price. Cost is what the add-on costs you.</p>
      {opts.map(([kind, o]) => (
        <div className="mrow" key={o.id}>
          <div className="grow">
            <b>{o.name}</b>
            <small style={{ display: "block", color: "var(--muted)" }}>{kind}</small>
          </div>
          <label style={{ color: "var(--muted)" }}>
            Price{" "}
            <input type="number" min="0" step="any" defaultValue={o.price} onBlur={(e) => updateOption(o, "price", e.target.value)} />
          </label>
          <label style={{ color: "var(--muted)" }}>
            Cost{" "}
            <input type="number" min="0" step="any" defaultValue={o.cost} onBlur={(e) => updateOption(o, "cost", e.target.value)} />
          </label>
        </div>
      ))}

      <div className="bar2">
        <button className="btn" onClick={clearOrders}>
          {confirmClear ? "Confirm: delete all orders" : "Clear all orders"}
        </button>
      </div>

      {editing && (
        <ItemEditor
          item={editing === "new" ? null : editing}
          categories={categories}
          inventory={inventory}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          flash={flash}
        />
      )}
      {addingSection && (
        <AddSection
          existing={Object.keys(categories)}
          onClose={() => setAddingSection(false)}
          onSaved={() => {
            setAddingSection(false);
            reload();
          }}
          flash={flash}
        />
      )}
    </>
  );
}
