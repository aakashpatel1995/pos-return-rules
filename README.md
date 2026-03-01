# POS Return Rules & Routing Engine
### A Shopify POS UI Extension for Enterprise Retailers

---

## What This App Does

This Shopify app adds a **Return Rules Enforcement** tile directly inside the Shopify POS iPad app. When a customer walks in with a return, the cashier taps the tile, enters the order number, and instantly sees:

| Rule | What it checks | Action if triggered |
|------|---------------|-------------------- |
| ⏱ **Return Window** | Is the order past the configured return window? | Block cash refund → Issue Store Credit only |
| 💳 **BNPL Guard** | Was the original order paid with Klarna / Afterpay / Affirm? | Issue Digital Gift Card only |
| 📦 **Inventory Router** | Does the item have "web-only" or "exclusive" product tags? | Don't restock → Put in warehouse return bin |

---

## Project Structure

```
pos-return-rules/
├── shopify.app.toml                          # Shopify app config
├── package.json                              # Root workspace
│
├── extensions/
│   └── pos-return-rules-ui/
│       ├── shopify.extension.toml            # POS UI Extension config
│       ├── package.json
│       └── src/
│           └── ReturnRulesModal.jsx          # 🎯 Main POS extension UI
│
└── app/
    └── routes/
        ├── api.orders.lookup.jsx             # Backend: order lookup API
        └── app.settings.jsx                  # Merchant settings dashboard
```

---

## Getting Started

### Prerequisites
- Shopify Partners account → [partners.shopify.com](https://partners.shopify.com)
- Node.js 18+
- A development store with Shopify POS Pro enabled

### 1. Install Shopify CLI globally
```bash
npm install -g @shopify/cli
```

### 2. Create the app in Partners dashboard
Go to [partners.shopify.com](https://partners.shopify.com) → Apps → Create App  
Copy your **Client ID** and paste it into `shopify.app.toml`

### 3. Install dependencies
```bash
npm install
```

### 4. Start dev server
```bash
shopify app dev
```

This will:
- Start a local tunnel (ngrok)
- Register the POS UI Extension
- Give you a URL to install the app on your dev store

### 5. Configure rules in the Dashboard
Visit `https://your-tunnel-url/app/settings` to configure:
- Return window days (default: 30)
- BNPL provider gateway names
- Warehouse-return product tags

### 6. Install the POS tile
On your iPad with Shopify POS:
1. Go to Settings → Apps
2. Find "POS Return Rules"
3. Add it to your home screen grid

---

## How the Rules Work

### Return Window (Rule 1)
```
Order placed: Jan 1
Customer returns: Feb 15 → 45 days later
Return Window configured: 30 days
Result: ⛔ BLOCKED — Cashier must issue Store Credit
```

### BNPL Guard (Rule 2)
```
Order payment gateway: "klarna"
BNPL list configured: "klarna,afterpay,affirm"
Result: ⚠️ WARNING — Do not refund cash/card. Issue Gift Card.
```

### Inventory Router (Rule 3)
```
Product tags: ["web-only", "fall-2024"]
Warehouse tags configured: "web-only,exclusive"
Result: ⚠️ WARNING — Don't restock. Place in warehouse bin.
```

---

## Enterprise Use Cases

This app was designed for brands like:
- **Canada Goose** — Complex online exclusive SKUs not stocked in-store
- **Gymshark** — High volume of BNPL (Klarna) transactions
- **Allbirds** — Strict 30-day return window across channels

---

## Deploying to Production

```bash
shopify app deploy
```

Then submit through the [Shopify App Store](https://partners.shopify.com) or distribute privately to your merchant organization.

---

## Revenue Model (if listing on App Store)
- **Free trial:** 14 days
- **Growth plan:** $29/month (up to 5 store locations)
- **Enterprise plan:** $99/month (unlimited locations + custom rule engine)
