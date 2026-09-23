import { Page } from 'playwright';
import { ContentOptimization, ListingItem, PricingAnalysis, StrategyConfig } from '../types.js';

export class ListingUpdater {
  static async updateListing(
    page: Page,
    item: ListingItem,
    pricing?: PricingAnalysis,
    content?: ContentOptimization,
    config?: StrategyConfig
  ): Promise<{ success: boolean; message: string }> {
    const isDryRun = config?.dryRun ?? true;

    console.log(`\n📝 Processing update for listing [${item.id}]: "${item.title}"`);

    if (pricing) {
      console.log(`   Price Change: $${pricing.currentPrice} ➡️  $${pricing.recommendedPrice} (Recommendation: ${pricing.recommendation})`);
    }

    if (content) {
      console.log(`   New Title: "${content.recommendedTitle}"`);
    }

    if (isDryRun) {
      console.log(`   🛡️ [DRY RUN ACTIVE] Skipping live DOM mutations for item ${item.id}.`);
      return { success: true, message: 'Dry run completed - no live changes made.' };
    }

    const editUrl = item.editUrl || `https://www.facebook.com/marketplace/edit/?listing_id=${item.id}`;
    console.log(`🌐 Navigating to edit URL: ${editUrl}`);

    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    try {
      // 1. Update Price if pricing provided
      if (pricing && pricing.recommendedPrice !== pricing.currentPrice) {
        const priceInput = page.locator('input[aria-label="Price"], label[aria-label="Price"] input');
        if ((await priceInput.count()) > 0) {
          await priceInput.first().click();
          await priceInput.first().fill(pricing.recommendedPrice.toString());
          console.log(`   ✅ Price updated in form to $${pricing.recommendedPrice}`);
        } else {
          console.log(`   ⚠️ Price input field not found on DOM.`);
        }
      }

      // 2. Update Title if content provided
      if (content && content.recommendedTitle !== content.originalTitle) {
        const titleInput = page.locator('input[aria-label="Title"], label[aria-label="Title"] input');
        if ((await titleInput.count()) > 0) {
          await titleInput.first().click();
          await titleInput.first().fill(content.recommendedTitle);
          console.log(`   ✅ Title updated in form to "${content.recommendedTitle}"`);
        }
      }

      // 3. Update Description if content provided
      if (content && content.recommendedDescription) {
        const descInput = page.locator('textarea[aria-label="Description"], label[aria-label="Description"] textarea');
        if ((await descInput.count()) > 0) {
          await descInput.first().click();
          await descInput.first().fill(content.recommendedDescription);
          console.log(`   ✅ Description updated in form.`);
        }
      }

      // 4. Click Save / Update Button
      const saveBtn = page.locator('div[aria-label="Save"], div[aria-label="Update"], div[role="button"]:has-text("Save"), div[role="button"]:has-text("Update")');
      if ((await saveBtn.count()) > 0) {
        await saveBtn.first().click();
        await page.waitForTimeout(4000);
        console.log(`   🎉 Successfully saved updates for item ${item.id}!`);
        return { success: true, message: 'Listing updated successfully.' };
      } else {
        console.log(`   ⚠️ Save button not found. Changes staged in DOM.`);
        return { success: false, message: 'Save button not detected on DOM.' };
      }
    } catch (err: any) {
      console.error(`   ❌ Failed to update listing ${item.id}:`, err.message);
      return { success: false, message: err.message };
    }
  }
}
