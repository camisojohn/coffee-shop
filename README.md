# Brew & Co — React version

Same shop, same Supabase backend, now as a React app built with Vite. It
builds to two separate pages that you deploy as one site:

- `/` — the customer ordering page (for phones). Nothing on it links to
  the staff page.
- `/staff.html` — the staff dashboard (for a laptop/desktop). Orders, Menu,
  Inventory and Sales, behind a real email/password sign-in.

If you already ran `supabase-setup.sql` from the plain-HTML version, this
project uses the exact same database — no SQL changes needed.

## 1. Install

```
npm install
```

## 2. Connect Supabase

```
cp .env.example .env
```

Open `.env` and fill in your project's values from **Project Settings > Data
API** in the Supabase dashboard:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SHOP_NAME=Brew & Co
```

`.env` is not committed to version control (see `.gitignore`) and is only
read at build time — Vite bakes these values into the built files.

## 3. Run it locally

```
npm run dev
```

This opens the customer page at `http://localhost:5173/`. Open
`http://localhost:5173/staff.html` yourself for the staff dashboard (or run
`npm run dev:staff`).

## 4. Build for deployment

```
npm run build
```

This produces a `dist/` folder containing `index.html`, `staff.html`, and
their JS/CSS bundles. Upload the **contents of `dist/`** to any static host
(Netlify, Vercel, GitHub Pages, Cloudflare Pages). The customer page is your
site's root URL; give staff the same domain with `/staff.html` appended.

Before your first deploy of a real shop, remember to:
- In Supabase, under Authentication, turn **off** "Allow new users to sign
  up", then add your staff accounts manually under Users.
- In Menu > Clear all orders (staff dashboard), remove any test orders you
  placed while trying things out.

## Project layout

```
src/
  lib/
    supabase.js     Supabase client, shared by both apps
    format.js        currency + small formatting helpers
    theme.css         shared design tokens (colors, type, base styles)
  customer/
    App.jsx, App.css, main.jsx
    components/
      Menu.jsx        the browsing grid
      ItemSheet.jsx    options, cart, and checkout — one sliding sheet
      OrderTracker.jsx confirmation + live status
  staff/
    App.jsx, App.css, main.jsx
    components/
      Login.jsx
      OrdersTab.jsx
      MenuTab.jsx      + ItemEditor.jsx (add/edit item, photo upload)
      InventoryTab.jsx
      SalesTab.jsx
```

## What's different from the plain-HTML version

Functionally, nothing — same menu, cart, checkout, order tracking, staff
login, menu/inventory/sales management, and photo uploads, talking to the
same `place_order` / `get_order` / `clear_orders` functions in Supabase.
What changed is how it's built: components instead of hand-written DOM
updates, and the staff dashboard now gets instant order updates over a
realtime subscription instead of polling every few seconds (the customer
page still polls its own order every 4 seconds, since only staff are signed
in for realtime access).
