import { Page } from 'playwright';
import { MarketComp } from '../types.js';

export class CompsScraper {
  static async searchMarketplaceComps(page: Page, query: string, maxComps = 10): Promise<MarketComp[]> {
    console.log(`🔎 Searching market comps for: "${query}"...`);
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.facebook.com/marketplace/search/?query=${encodedQuery}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Scroll slightly to trigger image & content lazy-loading
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500);

    const comps: MarketComp[] = await page.evaluate(({ maxComps }) => {
      const items: MarketComp[] = [];
      const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
      const seenUrls = new Set<string>();

      for (const link of links) {
        if (items.length >= maxComps) break;

        const href = (link as HTMLAnchorElement).href;
        if (seenUrls.has(href)) continue;
        seenUrls.add(href);

        const container = link.closest('div[role="article"]') || link.parentElement?.parentElement;
        const text = container ? container.textContent || '' : '';

        const priceMatch = text.match(/\$([0-9,]+)/);
        if (!priceMatch) continue;

        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (isNaN(price) || price === 0) continue; // Filter out $0 or invalid

        const titleSpan = link.querySelector('span:not(:empty)') || link;
        const title = (titleSpan.textContent || '').trim();

        if (title.length > 2) {
          items.push({
            title,
            price,
            url: href,
          });
        }
      }

      return items;
    }, { maxComps });

    console.log(`📊 Found ${comps.length} active comp(s) for "${query}".`);
    return comps;
  }
}
