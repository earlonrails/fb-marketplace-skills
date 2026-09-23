# Facebook Marketplace Listing Optimizer

An automated browser skill application powered by **Node.js** and **Playwright** that inspects your active Facebook Marketplace listings, analyzes market competitors, calculates competitive prices, and optimizes listing titles and descriptions.

---

## 🚀 Features & Actions

| Action | Command | Description |
| :--- | :--- | :--- |
| **Login** | `npm run login` | Verifies or establishes a persistent Facebook login session. |
| **Scan (Audit)** | `npm run scan` | Scrapes listings and market comps, outputting a price report without making live edits. |
| **Update Price** *(Default)* | `npm run update-price` | Calculates competitive target price (5% below median comp) and updates listing price. |
| **Update Title** | `npm run update-title` | Refines listing titles with clean capitalization and condition tags for search reach. |
| **Update Description** | `npm run update-description` | Formats descriptions into structured bullet points with terms and highlights. |
| **Fully Optimize** | `npm run fully-optimize` | Executes price, title, description, and search tag optimizations sequentially. |

> 🛡️ **Dry-Run by Default**: All update commands default to **Dry-Run mode** so you can preview changes safely. Add the `--live` flag to execute live updates on Facebook Marketplace.

---

## 🤖 AI Agent Skill Integration (Gemini / Claude / GPT)

This project includes standard AI Agent Skill definitions:

1. **`SKILL.md`**: Standard Agent Skill spec for Claude, Gemini, ChatGPT, Antigravity, and Open Interpreter agents.
2. **Programmatic Function Tool Schema**: Exported via `src/skill/index.ts` (`FB_MARKETPLACE_TOOL_DEFINITION` and `executeFBMarketplaceSkill(params)`).

### Example Import in Node.js AI Agent:
```typescript
import { FB_MARKETPLACE_TOOL_DEFINITION, executeFBMarketplaceSkill } from './src/skill/index.js';

// Pass FB_MARKETPLACE_TOOL_DEFINITION to Gemini / Claude / OpenAI API tools array
// When LLM calls the function:
const result = await executeFBMarketplaceSkill({
  action: 'update-price',
  live: false,
  offset: -5,
});
```

---

## 📥 Prerequisites & Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Clone & Install Dependencies

```bash
cd /home/kevin/code/fb-marketplace-listing-optimizer
npm install
```

### 3. Install Playwright Chromium Browser
```bash
npx playwright install chromium
```

---

## 🔑 Initial Facebook Login Setup

Run the login command once to authenticate with Facebook:

```bash
npm run login
```

If you are not authenticated, Playwright will open a Chromium window. Simply log into Facebook as normal. Your session cookies will be saved locally to `./.fb_profile`, so subsequent runs operate automatically.

---

## 📖 Usage Examples

### Run a Pricing Audit (Scan Mode)
```bash
npm run scan
```

### Preview Price Updates (Dry-Run Mode)
```bash
npm run update-price
```

### Apply Live Price Updates to Facebook
```bash
npm run start -- update-price --live
```

### Target a Specific Item ID
```bash
npm run start -- update-price --item 10023456789 --live
```

### Change Competitive Pricing Strategy
Set a custom pricing target (e.g. 10% below median comp):
```bash
npm run start -- update-price --offset -10 --live
```

---

## ⚙️ Configuration (.env)

Create a `.env` file in the root directory to customize default settings:

```env
# Target percentage offset relative to median comp (default: -5%)
TARGET_OFFSET_PERCENT=-5

# Pricing strategy: median-offset | lowest | average
PRICING_STRATEGY=median-offset

# Reserve price floor percentage (prevents dropping price below e.g. 50% of current price)
MIN_RESERVE_PRICE_PERCENT=50

# Run browser in headed mode (visible window)
HEADLESS=false
```

---

## 🧪 Testing

Run unit tests for the pricing algorithm and content optimizer:

```bash
npm test
```

Build the TypeScript project:
```bash
npm run build
```
