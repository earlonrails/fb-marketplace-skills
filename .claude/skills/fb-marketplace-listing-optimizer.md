---
name: fb-marketplace-listing-optimizer
command: /fb-marketplace-listing-optimizer
aliases:
  - /fb-optimizer
  - /fb-marketplace
description: Automated Facebook Marketplace listing price audit and optimization skill. Uses Playwright browser session to scrape active listings, compare market prices, and optimize titles, descriptions, and prices.
version: 1.0.0
---

# 🛍️ Facebook Marketplace Listing Optimizer Skill

This skill allows AI agents to inspect, price-check against market comps, and optimize Facebook Marketplace listings directly via slash commands.

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
| `/fb-marketplace price` | Calculate & update listing prices to market comps | `npm run update-price` |
| `/fb-marketplace title` | Polish titles for search reach & clarity | `npm run update-title` |
| `/fb-marketplace description` | Format item descriptions with bullet points & terms | `npm run update-description` |
| `/fb-marketplace full` | Execute full listing optimization pipeline | `npm run fully-optimize` |

---

## 🛠️ Command Flags & Options

- `--live`: Apply live changes on Facebook Marketplace (default is dry-run mode).
- `--offset <percent>`: Custom percentage offset relative to median comp (default: `-5` for 5% below median).
- `--item <id>`: Target a specific Facebook Marketplace listing ID.
- `--headed`: Launch visible browser window.

---

## 🤖 AI Agent Execution Protocol

When the user issues a slash command (e.g., `/fb-marketplace scan` or `/fb-optimizer price --live`), the assistant MUST follow this execution workflow:

### Step 1: Parse Command & Options
Extract action (`scan`, `login`, `price`, `title`, `description`, `full`) and flags (`--live`, `--offset`, `--item`).

### Step 2: Execute CLI Engine
Run the corresponding command in `/home/kevin/code/fb-marketplace-listing-optimizer`:

```bash
# Example for /fb-marketplace scan:
npm run scan

# Example for /fb-marketplace price --live:
npm run start -- update-price --live

# Example for /fb-marketplace price --offset -10:
npm run start -- update-price --offset -10
```

### Step 3: Format & Present Results
Present the audit or optimization results in a clean Markdown summary table:

| Listing Title | Item ID | Current Price | Market Comp Median | Target Price | Diff | Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Sony WH-1000XM4 Headphones | `1001` | $250 | $205 | **$195** | -$55 | 🟢 LOWER |

### Step 4: Live Update Safeguard Prompt
If running in dry-run mode and price updates are recommended, present the proposed changes and ask:
> "Would you like me to apply these updates live to Facebook Marketplace? Reply with **`/fb-marketplace price --live`** to confirm."
