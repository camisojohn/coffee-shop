import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function InventoryTab({ inventory, reload, flash }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");
  const [low, setLow] = useState("");

  const update = async (row, field, value) => {
    const { error } = await supabase
      .from("inventory")
      .update({ [field]: Math.max(0, +value || 0) })
      .eq("id", row.id);
    if (error) flash("Couldn't save.");
    else reload();
  };

  const remove = async (row) => {
    const { error } = await supabase.from("inventory").delete().eq("id", row.id);
    if (error) flash("Couldn't remove.");
    else reload();
  };

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase
      .from("inventory")
      .insert({ id: "i" + Date.now(), name: name.trim(), unit: unit.trim() || "pcs", qty: +qty || 0, low: +low || 0 });
    if (error) return flash("Couldn't add the ingredient.");
    setName("");
    setUnit("");
    setQty("");
    setLow("");
    reload();
  };

  return (
    <>
      <div className="bar2">
        <h2>Inventory</h2>
      </div>
      <p className="sub">Orders deduct stock automatically, based on what you set for each menu item.</p>

      {inventory.map((r) => (
        <div className="mrow" key={r.id}>
          <div className="grow">
            <b>{r.name}</b> {r.qty <= r.low && <span className="low">Low stock</span>}
            <small style={{ display: "block", color: "var(--muted)" }}>
              {r.unit}, warn at {r.low}
            </small>
          </div>
          <label style={{ color: "var(--muted)" }}>
            In stock <input type="number" min="0" defaultValue={r.qty} onBlur={(e) => update(r, "qty", e.target.value)} />
          </label>
          <label style={{ color: "var(--muted)" }}>
            Warn at <input type="number" min="0" defaultValue={r.low} onBlur={(e) => update(r, "low", e.target.value)} />
          </label>
          <button className="btn" onClick={() => remove(r)}>
            Remove
          </button>
        </div>
      ))}

      <div className="bar2">
        <h3>Add ingredient</h3>
      </div>
      <div className="mrow">
        <input placeholder="Name" style={{ width: 150 }} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Unit (g, pcs)" style={{ width: 110 }} value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input type="number" min="0" placeholder="In stock" value={qty} onChange={(e) => setQty(e.target.value)} />
        <input type="number" min="0" placeholder="Warn at" value={low} onChange={(e) => setLow(e.target.value)} />
        <button className="btn pri" onClick={add}>
          Add
        </button>
      </div>
    </>
  );
}
