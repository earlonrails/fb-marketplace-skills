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

  static async renewListing(
    page: Page,
    item: ListingItem,
    config?: StrategyConfig
  ): Promise<{ success: boolean; message: string }> {
    const isDryRun = config?.dryRun ?? true;

    console.log(`\n🔄 Processing renewal for listing [${item.id}]: "${item.title}"`);

    if (isDryRun) {
      console.log(`   🛡️ [DRY RUN ACTIVE] Staging renewal check for item "${item.title}" (ID: ${item.id}).`);
      return { success: true, message: 'Dry run completed - renewal staged.' };
    }

    try {
      // Find card container matching item title or ID
      const card = page.locator(`div:has-text("${item.title}")`).filter({ hasText: 'Renew' });
      const renewBtn = card.locator('div[role="button"]:has-text("Renew"), span:has-text("Renew")');

      if ((await renewBtn.count()) > 0 && (await renewBtn.first().isEnabled())) {
        await renewBtn.first().click();
        await page.waitForTimeout(2000);
        console.log(`   🎉 Successfully renewed listing "${item.title}"!`);
        return { success: true, message: 'Listing renewed successfully.' };
      } else {
        console.log(`   ℹ️ Item "${item.title}" is not currently eligible for renewal.`);
        return { success: false, message: 'Not eligible for renewal yet.' };
      }
    } catch (err: any) {
      console.error(`   ❌ Failed to renew listing ${item.id}:`, err.message);
      return { success: false, message: err.message };
    }
  }

  static async deleteListing(
    page: Page,
    item: ListingItem,
    config?: StrategyConfig
  ): Promise<{ success: boolean; message: string }> {
    const isDryRun = config?.dryRun ?? true;

    console.log(`\n🗑️ Processing deletion for sold listing [${item.id}]: "${item.title}"`);

    if (isDryRun) {
      console.log(`   🛡️ [DRY RUN ACTIVE] Staging deletion for sold item "${item.title}" (ID: ${item.id}).`);
      return { success: true, message: 'Dry run completed - deletion staged.' };
    }

    try {
      const cleanTitle = item.title.replace(/["'\\]/g, '').trim();
      const shortTitle = cleanTitle.slice(0, 25);

      // 1. Locate the "More options" button for this item, scrolling down if needed
      let moreBtn = page.locator(`div[aria-label*="More options for ${shortTitle}"]`);
      if ((await moreBtn.count()) === 0) {
        const card = page.locator(`div:has-text("${shortTitle}")`).filter({ hasText: 'Relist' });
        if ((await card.count()) > 0) {
          moreBtn = card.first().locator('div[aria-label*="More options"]');
        }
      }

      if ((await moreBtn.count()) === 0) {
        for (let scroll = 0; scroll < 25; scroll++) {
          await page.evaluate(() => window.scrollBy(0, 1500));
          await page.waitForTimeout(600);
          moreBtn = page.locator(`div[aria-label*="More options for ${shortTitle}"]`);
          if ((await moreBtn.count()) > 0) break;

          const card = page.locator(`div:has-text("${shortTitle}")`).filter({ hasText: 'Relist' });
          if ((await card.count()) > 0) {
            moreBtn = card.first().locator('div[aria-label*="More options"]');
            if ((await moreBtn.count()) > 0) break;
          }
        }
      }

      // If still not found, scroll to top and try once more
      if ((await moreBtn.count()) === 0) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);
        for (let scroll = 0; scroll < 25; scroll++) {
          moreBtn = page.locator(`div[aria-label*="More options for ${shortTitle}"]`);
          if ((await moreBtn.count()) > 0) break;

          const card = page.locator(`div:has-text("${shortTitle}")`).filter({ hasText: 'Relist' });
          if ((await card.count()) > 0) {
            moreBtn = card.first().locator('div[aria-label*="More options"]');
            if ((await moreBtn.count()) > 0) break;
          }
          await page.evaluate(() => window.scrollBy(0, 1500));
          await page.waitForTimeout(600);
        }
      }

      if ((await moreBtn.count()) === 0) {
        console.log(`   ⚠️ Could not find "More options" button for "${item.title}".`);
        return { success: false, message: 'More options button not found.' };
      }

      const targetMoreBtn = moreBtn.first();
      await targetMoreBtn.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await targetMoreBtn.click();
      await page.waitForTimeout(1000);

      // 2. Click "Delete listing" in the popup menu
      const deleteMenuItem = page.locator(
        'div[role="menuitem"]:has-text("Delete listing"), span:has-text("Delete listing")'
      );
      if ((await deleteMenuItem.count()) === 0) {
        console.log(`   ⚠️ "Delete listing" option not found in menu for "${item.title}".`);
        return { success: false, message: 'Delete listing menuitem not found.' };
      }

      await deleteMenuItem.first().click();
      await page.waitForTimeout(1500);

      // 3. Handle confirmation dialog ("Delete listing" modal)
      const dialog = page.locator('div[role="dialog"]').filter({ hasText: 'Delete listing' });
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      const deleteButtons = dialog.locator('div[role="button"]:has-text("Delete"), button:has-text("Delete")');
      const btnCount = await deleteButtons.count();
      let clickedDelete = false;

      for (let i = 0; i < btnCount; i++) {
        const btn = deleteButtons.nth(i);
        if (await btn.isVisible()) {
          await btn.click();
          clickedDelete = true;
          break;
        }
      }

      if (!clickedDelete) {
        console.log(`   ⚠️ Visible "Delete" confirmation button not found in modal for "${item.title}".`);
        return { success: false, message: 'Confirmation delete button not found.' };
      }

      await page.waitForTimeout(3000);

      // Dismiss any follow-up feedback survey or confirmation dialog
      try {
        const dialogs = page.locator('div[role="dialog"]');
        if ((await dialogs.count()) > 0) {
          const surveyOption = page.locator(
            'div[role="dialog"] div[role="radio"], div[role="dialog"] input[type="radio"]'
          );
          if ((await surveyOption.count()) > 0) {
            await surveyOption.first().click().catch(() => {});
            await page.waitForTimeout(500);
            const nextBtn = page.locator(
              'div[role="dialog"] div[role="button"]:has-text("Next"), div[role="dialog"] button:has-text("Next")'
            );
            if ((await nextBtn.count()) > 0 && (await nextBtn.first().isVisible())) {
              await nextBtn.first().click().catch(() => {});
              await page.waitForTimeout(1000);
            }
          }

          const closeBtn = page.locator(
            'div[role="dialog"] div[aria-label="Close"], div[role="dialog"] div[role="button"]:has-text("Cancel"), div[role="dialog"] div[role="button"]:has-text("Done")'
          );
          if ((await closeBtn.count()) > 0 && (await closeBtn.first().isVisible())) {
            await closeBtn.first().click().catch(() => {});
            await page.waitForTimeout(1000);
          }
        }
      } catch (_) {}

      console.log(`   🎉 Successfully deleted sold listing "${item.title}"!`);
      return { success: true, message: 'Sold listing permanently deleted.' };
    } catch (err: any) {
      console.error(`   ❌ Failed to delete listing ${item.id}:`, err.message);
      return { success: false, message: err.message };
    }
  }
}
