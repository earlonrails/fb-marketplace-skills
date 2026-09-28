---
name: fb-marketplace-listing-optimizer
command: /fb-marketplace-listing-optimizer
aliases:
  - /fb-optimizer
  - /fb-marketplace
description: Automated Facebook Marketplace listing price audit, renewal, and content optimization skill. Uses Playwright browser session to scrape active listings, compare market prices, renew eligible listings, and optimize titles, descriptions, and prices.
version: 1.1.0
---

# 🛍️ Facebook Marketplace Listing Optimizer Skill

This skill allows AI agents to inspect, price-check against market comps, renew eligible items, and optimize Facebook Marketplace listings directly via slash commands.

---

## ⚡ Slash Command Reference

Invoke using `/fb-marketplace-listing-optimizer` or the shorter aliases `/fb-optimizer` / `/fb-marketplace`:

```text
/fb-marketplace <action> [options]
```

### Supported Subcommands

| Slash Command | Action Description | CLI Executable |
| :--- | :--- | :--- |
| `/fb-marketplace login` | Check FB auth status or open login prompt | `npm run login` |
| `/fb-marketplace scan` | Scrape listings & market comps (Audit Mode) | `npm run scan` |
| `/fb-marketplace renew` | Renew active listings to boost Marketplace reach | `npm run renew` |
| `/fb-marketplace price` | Calculate & update listing prices to market comps | `npm run update-price` |
| `/fb-marketplace title` | Polish titles for search reach & clarity | `npm run update-title` |
| `/fb-marketplace description` | Format item descriptions with bullet points & terms | `npm run update-description` |
| `/fb-marketplace full` | Execute full pipeline (Renew + Price + Title + Description + Tags) | `npm run fully-optimize` |

---

## 🛠️ Command Flags & Options

- `--live`: Apply live changes on Facebook Marketplace (default is dry-run mode).
- `--offset <percent>`: Custom percentage offset relative to median comp (default: `-5` for 5% below median).
- `--item <id>`: Target a specific Facebook Marketplace listing ID.
- `--headed`: Launch visible browser window.

---

## 🤖 AI Agent Execution Protocol

When the user issues a slash command (e.g., `/fb-marketplace renew` or `/fb-optimizer full --live`), the assistant MUST follow this execution workflow:

### Step 1: Parse Command & Options
Extract action (`scan`, `login`, `renew`, `price`, `title`, `description`, `full`) and flags (`--live`, `--offset`, `--item`).

### Step 2: Execute CLI Engine
Run the corresponding command in `/home/kevin/code/fb-marketplace-listing-optimizer`:

```bash
# Example for renewing active listings:
npm run renew

# Example for full optimization with live updates:
npm run fully-optimize -- --live

# Example for price update with custom offset:
npm run start -- update-price --offset -10
```

### Step 3: Format & Present Results
Present the audit or optimization results in a clean Markdown summary table:

| Listing Title | Item ID | Current Price | Market Comp Median | Target Price | Renewal Status | Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Golf Guard Hard Golf Travel Case | `6887062956` | $65 | $83 | **$79** | 🟢 Renewed | ⚡ FULL OPTIMIZED |
| Yakima Fork Mount Bike Trays | `1665135783` | $50 | $35 | **$33** | ℹ️ Not Eligible | ⚡ FULL OPTIMIZED |

### Step 4: Live Update Safeguard Prompt
If running in dry-run mode and updates are recommended, present the proposed changes and ask:
> "Would you like me to apply these updates live to Facebook Marketplace? Reply with **`/fb-marketplace full --live`** to confirm."
