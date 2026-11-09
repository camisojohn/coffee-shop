import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const shopName = import.meta.env.VITE_SHOP_NAME || "Coffee shop";

// True once real credentials are in .env; lets the UI show a clear setup
// message instead of a wall of network errors when they're missing.
export const configured = Boolean(url && key && !url.includes("YOUR-PROJECT"));

export const supabase = configured ? createClient(url, key) : null;
