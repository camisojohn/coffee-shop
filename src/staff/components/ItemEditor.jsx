import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { fmt, placeholderIcon } from "../../lib/format";

// Shrinks a photo client-side before upload so menu photos load fast on a phone.
function toJpegBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("could not read image"))), "image/jpeg", 0.82);
    };
    img.onerror = () => reject(new Error("could not read image"));
    img.src = url;
  });
}

const imagePath = (url) => {
  const i = (url || "").indexOf("/menu-images/");
  return i < 0 ? null : url.slice(i + 13).split("?")[0];
};

export default function ItemEditor({ item, categories, inventory, onClose, onSaved, flash }) {
  const isNew = !item;
  const catNames = Object.keys(categories);
  const [name, setName] = useState(item?.name || "");
  const [cat, setCat] = useState(item?.cat || catNames[0] || "");
  const [desc, setDesc] = useState(item?.description || "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [cost, setCost] = useState(item?.cost ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url || null);
  const [blob, setBlob] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [uses, setUses] = useState(() => {
    const u = item?.uses || [];
    return [0, 1].map((i) => u[i] || { inv: "", qty: "" });
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = blob ? URL.createObjectURL(blob) : imageUrl;

  const pickFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b = await toJpegBlob(file);
      setBlob(b);
      setRemoveImage(false);
    } catch {
      flash("That photo couldn't be read. Try a JPG or PNG.");
    }
  };

  const save = async () => {
    if (!name.trim()) return setError("Enter a name for the item.");
    if (price === "" || +price < 0) return setError("Enter a selling price.");
    if (cost === "" || +cost < 0) return setError("Enter what it costs you to make (0 if unknown).");
    setSaving(true);
    setError("");
    let url = imageUrl;
    try {
      if (blob) {
        const path = crypto.randomUUID() + ".jpg";
        const up = await supabase.storage.from("menu-images").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (up.error) throw up.error;
        url = supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
      } else if (removeImage) {
        url = null;
      }
      const row = {
        name: name.trim(),
        cat,
        description: desc.trim(),
        price: +price,
        cost: +cost,
        image_url: url,
        uses: uses.filter((u) => u.inv && +u.qty > 0).map((u) => ({ inv: u.inv, qty: +u.qty })),
      };
      const r = isNew ? await supabase.from("menu_items").insert(row) : await supabase.from("menu_items").update(row).eq("id", item.id);
      if (r.error) throw r.error;
      if (item?.image_url && item.image_url !== url) {
        const p = imagePath(item.image_url);
        if (p) supabase.storage.from("menu-images").remove([p]);
      }
    } catch (e) {
      setSaving(false);
      setError("Couldn't save: " + (e.message || "please try again."));
      return;
    }
    onSaved();
  };

  const profit = price !== "" && cost !== "" ? +price - +cost : null;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sh-head">
          <h2>{isNew ? "Add item" : "Edit item"}</h2>
          <button className="x" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sh-body form">
          <label>Photo</label>
          <div className="pic">
            <span className="ic2 big">{preview ? <img src={preview} alt="" /> : placeholderIcon(cat)}</span>
            <div className="seg">
              <label className="btn" style={{ margin: 0, display: "inline-flex", alignItems: "center", cursor: "pointer", fontWeight: 400 }}>
                Choose photo
                <input type="file" accept="image/*" hidden onChange={pickFile} />
              </label>
              {preview && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setBlob(null);
                    setImageUrl(null);
                    setRemoveImage(true);
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <label>
            Name
            <input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Section
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {catNames.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Description
            <input maxLength={80} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
          <div className="two">
            <label>
              Cost to make
              <input type="number" min="0" step="any" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
            <label>
              Selling price
              <input type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
          <p className={"sub" + (profit !== null && profit < 0 ? " low" : "")} style={{ margin: "8px 0 0" }}>
            {profit === null
              ? ""
              : profit < 0
              ? "Warning: the cost is higher than the price, so this item loses money."
              : `Profit ${fmt(profit)} per item (${price ? Math.round((profit / price) * 100) : 0}% margin)`}
          </p>

          <label>Uses from inventory, per item sold</label>
          {uses.map((u, i) => (
            <div className="two" style={{ marginTop: 6 }} key={i}>
              <select
                value={u.inv}
                onChange={(e) => setUses((prev) => prev.map((x, j) => (j === i ? { ...x, inv: e.target.value } : x)))}
              >
                <option value="">None</option>
                {inventory.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Amount"
                value={u.qty}
                onChange={(e) => setUses((prev) => prev.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
              />
            </div>
          ))}
          <p className="err">{error}</p>
        </div>
        <div className="sh-foot">
          <button className="cta" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save item"}
          </button>
        </div>
      </div>
    </div>
  );
}
