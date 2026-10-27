import { Page } from 'playwright';
import { ListingItem } from '../types.js';

export class ListingsScraper {
  static async getActiveListings(page: Page): Promise<ListingItem[]> {
    console.log('📦 Fetching active seller listings from FB Marketplace...');

    try {
      await page.goto('https://www.facebook.com/marketplace/you/selling', {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await page.waitForTimeout(4000);
    } catch (err: any) {
      console.log(`⚠️ Navigation warning: ${err.message}`);
    }

    // Ensure we are on "Your listings" view
    try {
      const yourListingsTab = page.locator('span:has-text("Your listings"), a[href*="you/selling"]:has-text("Your listings")');
      if ((await yourListingsTab.count()) > 0) {
        await yourListingsTab.first().click().catch(() => {});
        await page.waitForTimeout(2000);
      }
    } catch (_) {}

    // Scroll down progressively to load all 80+ listing cards
    console.log('📜 Scrolling seller dashboard to load all active listing cards...');
    let previousHeight = 0;
    let noChangeCount = 0;

    for (let i = 0; i < 25; i++) {
      const currentHeight = await page.evaluate(() => {
        window.scrollBy(0, 1800);
        return document.body.scrollHeight;
      });
      await page.waitForTimeout(1200);

      if (currentHeight === previousHeight) {
        noChangeCount++;
        if (noChangeCount >= 3 && i > 8) break;
      } else {
        noChangeCount = 0;
      }
      previousHeight = currentHeight;
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    const listings: ListingItem[] = await page.evaluate(() => {
      const results: ListingItem[] = [];
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();

      // Find all elements containing "Mark as sold" or "clicks on listing" or "Active · Listed"
      const allDivs = Array.from(document.querySelectorAll('div, section, article'));

      for (const el of allDivs) {
        const text = (el.textContent || '').trim();

        // Check if this container is a Seller Listing Card
        const isCard =
          (text.includes('Mark as sold') || text.includes('clicks on listing') || text.includes('Active · Listed')) &&
          text.includes('$') &&
          !text.includes('Reach buyers nationwide') && // Exclude right sidebar promo banner
          !text.includes('Keep your listings up to date'); // Exclude top info banner

        if (!isCard) continue;

        // Exclude sold or out-of-stock listings from active listings
        const isSold =
          text.includes('Relist this item') ||
          text.includes('Marked as sold') ||
          text.includes('Out of Stock') ||
          text.includes('Out of stock') ||
          text.includes('Mark as in stock');
        if (isSold) continue;

        // Ensure we are operating on the tightest card container (not a huge wrapper)
        const childCards = Array.from(el.querySelectorAll('div')).filter((child) => {
          const t = child.textContent || '';
          return (t.includes('Mark as sold') || t.includes('clicks on listing')) && t.includes('$');
        });

        if (childCards.length > 1) continue; // Skip parent containers, keep leaf card node

        // Extract ID from any link inside the card container
        const links = Array.from(el.querySelectorAll('a'));
        let id = '';
        let itemUrl = '';
        let editUrl = '';

        for (const l of links) {
          const href = l.href || '';
          const matchItem = href.match(/\/marketplace\/item\/(\d+)/);
          const matchEdit = href.match(/listing_id=(\d+)|\/edit\/\?.*id=(\d+)/);

          if (matchItem) {
            id = matchItem[1];
            itemUrl = `https://www.facebook.com/marketplace/item/${id}/`;
            editUrl = `https://www.facebook.com/marketplace/edit/?listing_id=${id}`;
            break;
          } else if (matchEdit) {
            id = matchEdit[1] || matchEdit[2];
            itemUrl = `https://www.facebook.com/marketplace/item/${id}/`;
            editUrl = `https://www.facebook.com/marketplace/edit/?listing_id=${id}`;
            break;
          }
        }

        // Parse Title & Price from text
        // Card text structure: "[Title]$[Price]Active · Listed on..."
        let title = '';
        let price = 0;

        // 1. Extract Price ($XX or $X,XXX)
        const priceMatch = text.match(/\$([0-9]{1,3}(?:,[0-9]{3})*|\d+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        // 2. Extract Title (text preceding the $ symbol)
        if (text.includes('$')) {
          const rawTitle = text.split('$')[0].trim();
          title = rawTitle
            .replace(/^Tip:\s*Renew your listing\?\s*/i, '')
            .replace(/^Tip:\s*Improve the description\s*/i, '')
            .replace(/^Just listed/i, '')
            .replace(/Keep your listings.*/i, '')
            .replace(/Your listings.*/i, '')
            .trim();
        }

        // Fallback title from spans if needed
        if (!title) {
          const spans = Array.from(el.querySelectorAll('span[dir="auto"], div'))
            .map((s) => (s.textContent || '').trim())
            .filter((t) => t.length > 2 && !t.startsWith('$') && !t.includes('Active') && !t.includes('Mark as sold') && !t.includes('Relist') && !t.includes('Out of'));
          if (spans.length > 0) {
            title = spans[0]
              .replace(/^Tip:\s*Renew your listing\?\s*/i, '')
              .replace(/^Tip:\s*Improve the description\s*/i, '')
              .trim();
          }
        }

        if (!title || title.length < 2 || title.includes('Reach buyers nationwide') || title.includes('Marketplace profile')) {
          continue;
        }

        // Synthesize ID if link was missing in DOM view
        if (!id) {
          id = `item_${Math.abs(
            title.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
          )}`;
          itemUrl = `https://www.facebook.com/marketplace/you/selling`;
          editUrl = `https://www.facebook.com/marketplace/you/selling`;
        }

        const uniqueKey = `${title}_${price}`;
        if (seenTitles.has(uniqueKey)) continue;
        seenTitles.add(uniqueKey);
        if (id && !id.startsWith('item_')) seenIds.add(id);

        results.push({
          id,
          title,
          price,
          currency: 'USD',
          url: itemUrl,
          editUrl,
          status: 'active',
        });
      }

      return results;
    });

    console.log(`✅ Found ${listings.length} active seller listing(s).`);

    if (listings.length === 0) {
      console.log('⚠️ Debug Info: Current Page URL:', page.url());
      const pageTitle = await page.title().catch(() => '');
      console.log('⚠️ Debug Info: Page Title:', pageTitle);
    }

    return listings;
  }

  static async getSoldListings(page: Page): Promise<ListingItem[]> {
    console.log('📦 Fetching sold & out-of-stock seller listings from FB Marketplace...');

    try {
      if (!page.url().includes('/marketplace/you/selling')) {
        await page.goto('https://www.facebook.com/marketplace/you/selling', {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });
        await page.waitForTimeout(4000);
      }
    } catch (err: any) {
      console.log(`⚠️ Navigation warning: ${err.message}`);
    }

    // Scroll down progressively to load all listing cards
    console.log('📜 Scrolling seller dashboard to load sold listing cards...');
    let previousHeight = 0;
    let noChangeCount = 0;

    for (let i = 0; i < 25; i++) {
      const currentHeight = await page.evaluate(() => {
        window.scrollBy(0, 1800);
        return document.body.scrollHeight;
      });
      await page.waitForTimeout(1000);

      if (currentHeight === previousHeight) {
        noChangeCount++;
        if (noChangeCount >= 3 && i > 8) break;
      } else {
        noChangeCount = 0;
      }
      previousHeight = currentHeight;
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    const soldListings: ListingItem[] = await page.evaluate(() => {
      const results: ListingItem[] = [];
      const seenTitles = new Set<string>();
      const seenIds = new Set<string>();

      const allDivs = Array.from(document.querySelectorAll('div, section, article'));

      for (const el of allDivs) {
        const text = (el.textContent || '').trim();

        // Check if this container is a Sold / Out-of-Stock Listing Card
        const isSoldCard =
          (text.includes('Relist this item') ||
            text.includes('Mark as in stock') ||
            text.includes('Out of Stock') ||
            text.includes('Out of stock') ||
            text.includes('Marked as sold')) &&
          text.includes('$') &&
          !text.includes('Reach buyers nationwide') &&
          !text.includes('Keep your listings up to date');

        if (!isSoldCard) continue;

        // Ensure we are operating on the tightest card container (not a parent container)
        const childCards = Array.from(el.querySelectorAll('div')).filter((child) => {
          const t = child.textContent || '';
          return (
            (t.includes('Relist this item') ||
              t.includes('Mark as in stock') ||
              t.includes('Out of Stock') ||
              t.includes('Out of stock') ||
              t.includes('Marked as sold')) &&
            t.includes('$')
          );
        });

        if (childCards.length > 1) continue;

        // Extract ID from any link inside the card container
        const links = Array.from(el.querySelectorAll('a'));
        let id = '';
        let itemUrl = '';

        for (const l of links) {
          const href = l.href || '';
          const matchItem = href.match(/\/marketplace\/item\/(\d+)/);
          const matchEdit = href.match(/listing_id=(\d+)|\/edit\/\?.*id=(\d+)/);

          if (matchItem) {
            id = matchItem[1];
            itemUrl = `https://www.facebook.com/marketplace/item/${id}/`;
            break;
          } else if (matchEdit) {
            id = matchEdit[1] || matchEdit[2];
            itemUrl = `https://www.facebook.com/marketplace/item/${id}/`;
            break;
          }
        }

        // Parse Title & Price
        let title = '';
        let price = 0;

        const priceMatch = text.match(/\$([0-9]{1,3}(?:,[0-9]{3})*|\d+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        if (text.includes('$')) {
          const rawTitle = text.split('$')[0].trim();
          title = rawTitle
            .replace(/^Tip:\s*Renew your listing\?\s*/i, '')
            .replace(/^Tip:\s*Improve the description\s*/i, '')
            .replace(/^Just listed/i, '')
            .replace(/Keep your listings.*/i, '')
            .replace(/Your listings.*/i, '')
            .trim();
        }

        // Fallback title from spans if needed
        if (!title) {
          const spans = Array.from(el.querySelectorAll('span[dir="auto"], div'))
            .map((s) => (s.textContent || '').trim())
            .filter((t) => t.length > 2 && !t.startsWith('$') && !t.includes('Relist') && !t.includes('Out of') && !t.includes('Marked as sold'));
          if (spans.length > 0) {
            title = spans[0]
              .replace(/^Tip:\s*Renew your listing\?\s*/i, '')
              .replace(/^Tip:\s*Improve the description\s*/i, '')
              .trim();
          }
        }

        if (!title || title.length < 2 || title.includes('Reach buyers nationwide') || title.includes('Marketplace profile')) {
          continue;
        }

        if (!id) {
          id = `item_${Math.abs(
            title.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
          )}`;
          itemUrl = `https://www.facebook.com/marketplace/you/selling`;
        }

        const uniqueKey = `${title}_${price}`;
        if (seenTitles.has(uniqueKey)) continue;
        seenTitles.add(uniqueKey);
        if (id && !id.startsWith('item_')) seenIds.add(id);

        results.push({
          id,
          title,
          price,
          currency: 'USD',
          url: itemUrl,
          status: 'sold',
        });
      }

      return results;
    });

    console.log(`✅ Found ${soldListings.length} sold / out-of-stock seller listing(s).`);
    return soldListings;
  }
}
