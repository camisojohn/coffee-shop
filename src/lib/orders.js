import { supabase } from "./supabase";
import { tagName } from "./format";

// Shared by the customer page and the staff "Take order" screen.
// Returns the order row, or throws an Error whose message is safe to show.
export async function submitOrder({ name, payment, cart }) {
  const { data, error } = await supabase.rpc("place_order", {
    p_name: tagName(name, payment),
    p_lines: cart.map((l) => ({ id: l.id, size: l.size, milk: l.milk, extras: l.extras, qty: l.qty })),
  });
  if (error || !data) {
    console.error("place_order failed", error);
    const e = new Error(
      /unavailable/.test(error?.message || "")
        ? "One of the items just sold out. Please check the cart."
        : "The order couldn't be sent. Check the connection and try again."
    );
    e.raw = error;
    throw e;
  }
  return data;
}
