import { fmt, placeholderIcon } from "../../lib/format";

export function MenuSkeleton() {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading menu" style={{ marginTop: 24 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk" />
          <div className="sk" style={{ width: "70%" }} />
          <div className="sk" style={{ width: "40%" }} />
        </div>
      ))}
    </div>
  );
}

export default function Menu({ items, categories, cat, setCat, onOpen, heading, intro }) {
  const cats = Object.keys(categories).filter((c) => items.some((i) => i.cat === c));
  const shown = items.filter((i) => cat === "All" || i.cat === cat);

  return (
    <>
      {heading && <h1 className="h1">{heading}</h1>}
      {intro && <p className="sub">{intro}</p>}

      <div className="chips" style={{ marginTop: heading ? 0 : 16 }}>
        <button className="chip" aria-pressed={cat === "All"} onClick={() => setCat("All")}>
          All
        </button>
        {cats.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {!shown.length && (
        <p className="sub">{items.length ? "Nothing in this section yet." : "The menu is empty right now. Please check back soon."}</p>
      )}

      <div className="grid">
        {shown.map((item) => {
          const withSize = categories[item.cat]?.size;
          return (
            <button key={item.id} className="card" disabled={item.sold_out} onClick={() => onOpen(item)}>
              <span className="ph">
                {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : placeholderIcon(item.cat)}
              </span>
              <span className="meta">
                <span className="nm">{item.name}</span>
                <span className="ds">{item.description}</span>
                <span className={"pr num" + (item.sold_out ? " out" : "")}>
                  {item.sold_out ? "Sold out" : (withSize ? "From " : "") + fmt(item.price)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
