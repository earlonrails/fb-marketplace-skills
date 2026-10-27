import { Command } from 'commander';
import { DEFAULT_CONFIG } from './config.js';
import { BrowserSession } from './browser/session.js';
import { AuthManager } from './browser/auth.js';
import { ListingsScraper } from './scraper/listings.js';
import { CompsScraper } from './scraper/comps.js';
import { PricingOptimizer } from './optimizer/pricing.js';
import { ContentOptimizer } from './optimizer/content.js';
import { ListingUpdater } from './editor/listingUpdater.js';
import { StrategyConfig } from './types.js';

export function createProgram() {
  const program = new Command();

  program
    .name('fb-marketplace-optimizer')
    .description('Automated Facebook Marketplace listing price & content optimizer skill app')
    .version('1.0.0');

  const addCommonOptions = (cmd: Command) => {
    return cmd
      .option('--live', 'Apply live changes on Facebook Marketplace (default is dry-run mode)', false)
      .option('--headed', 'Launch visible browser window', false)
      .option('--offset <percent>', 'Target pricing offset percent relative to median comp (default: -5)', '-5')
      .option('--strategy <type>', 'Pricing strategy: median-offset, lowest, or average', 'median-offset')
      .option('--limit <count>', 'Maximum number of listings to process')
      .option('--item <id>', 'Specific Facebook Marketplace listing ID to process');
  };

  const resolveConfig = (options: any): StrategyConfig => {
    return {
      ...DEFAULT_CONFIG,
      dryRun: !options.live,
      headless: !options.headed,
      targetOffsetPercent: parseFloat(options.offset),
      pricingStrategy: options.strategy || DEFAULT_CONFIG.pricingStrategy,
    };
  };

  // Command: login
  program
    .command('login')
    .description('Check Facebook login session or open interactive browser window to log in')
    .action(async () => {
      const config = { ...DEFAULT_CONFIG, headless: false };
      const session = new BrowserSession(config);
      try {
        const { page } = await session.init();
        const status = await AuthManager.checkStatus(page);
        if (status.isLoggedIn) {
          console.log('🎉 You are logged in to Facebook!');
        } else {
          await AuthManager.promptLogin(page);
        }
      } finally {
        await session.close();
      }
    });

  // Command: scan
  addCommonOptions(
    program
      .command('scan')
      .description('Audit mode: Scrape listings and market comps, outputting pricing report without making changes')
  ).action(async (options) => {
    const config = resolveConfig(options);
    config.dryRun = true; // Always dry-run for scan
    await runPipeline({ action: 'scan', config, targetItemId: options.item, limit: options.limit ? parseInt(options.limit) : undefined });
  });

  // Command: update-price (Default action)
  addCommonOptions(
    program
      .command('update-price', { isDefault: true })
      .description('Check market comps and update listing prices to competitive pricing (Default action)')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'price', config, targetItemId: options.item, limit: options.limit ? parseInt(options.limit) : undefined });
  });

  // Command: update-title
  addCommonOptions(
    program
      .command('update-title')
      .description('Optimize titles of user listings for search reach')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'title', config, targetItemId: options.item, limit: options.limit ? parseInt(options.limit) : undefined });
  });

  // Command: update-description
  addCommonOptions(
    program
      .command('update-description')
      .description('Format and polish listing descriptions')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'description', config, targetItemId: options.item, limit: options.limit ? parseInt(options.limit) : undefined });
  });

  // Command: renew
  addCommonOptions(
    program
      .command('renew')
      .description('Renew active listings to boost Marketplace visibility')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'renew', config, targetItemId: options.item });
  });

  // Command: fully-optimize
  addCommonOptions(
    program
      .command('fully-optimize')
      .description('Execute full optimization: renew eligible listings, update prices, titles, descriptions, and tags')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'full', config, targetItemId: options.item, limit: options.limit ? parseInt(options.limit) : undefined });
  });

  // Command: delete-sold
  addCommonOptions(
    program
      .command('delete-sold')
      .description('Find and permanently delete sold/out-of-stock listings to prevent accidental relisting')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'delete-sold', config, targetItemId: options.item });
  });

  return program;
}

async function runPipeline({
  action,
  config,
  targetItemId,
  limit,
}: {
  action: 'scan' | 'price' | 'title' | 'description' | 'renew' | 'full' | 'delete-sold';
  config: StrategyConfig;
  targetItemId?: string;
  limit?: number;
}) {
  console.log(`\n🚀 Starting FB Marketplace Listing Optimizer [Action: ${action.toUpperCase()}]`);
  console.log(`⚙️  Config: ${config.dryRun ? '🛡️ DRY-RUN MODE (No live changes)' : '⚡ LIVE MODE'}`);
  console.log(`🎯 Target Offset: ${config.targetOffsetPercent}% | Strategy: ${config.pricingStrategy}\n`);

  const session = new BrowserSession(config);

  try {
    const { page } = await session.init();
    const auth = await AuthManager.checkStatus(page);

    if (!auth.isLoggedIn) {
      console.log('⚠️ Not logged in to Facebook. Opening login prompt...');
      const success = await AuthManager.promptLogin(page);
      if (!success) {
        console.error('❌ Authentication failed or timed out. Exiting.');
        return;
      }
    }

    // Specialized handler for deleting sold items
    if (action === 'delete-sold') {
      let soldListings = await ListingsScraper.getSoldListings(page);

      if (targetItemId) {
        soldListings = soldListings.filter(
          (l) => l.id === targetItemId || l.title.toLowerCase().includes(targetItemId.toLowerCase())
        );
        console.log(`🎯 Filtered for target "${targetItemId}": ${soldListings.length} found.`);
      }

      if (soldListings.length === 0) {
        console.log('ℹ️ No sold or out-of-stock listings found.');
        return;
      }

      console.log(`\n📋 Found ${soldListings.length} sold listing(s) to process:`);
      for (const item of soldListings) {
        console.log(`   - [${item.id}] "${item.title}" ($${item.price})`);
      }

      let deletedCount = 0;
      for (const item of soldListings) {
        const result = await ListingUpdater.deleteListing(page, item, config);
        if (result.success) deletedCount++;
      }

      console.log(`\n============================================================`);
      if (config.dryRun) {
        console.log(`🛡️ [DRY RUN COMPLETE] Staged deletion for ${soldListings.length} sold listing(s).`);
        console.log(`👉 To permanently delete these sold listings on Facebook Marketplace, run:`);
        console.log(`   npm run delete-sold -- --live`);
      } else {
        console.log(`🎉 Successfully deleted ${deletedCount}/${soldListings.length} sold listing(s)!`);
      }
      console.log(`============================================================\n`);
      return;
    }

    // Specialized handler for renewing active listings
    if (action === 'renew') {
      console.log('🔄 Scanning Facebook Marketplace for listings eligible for renewal...');

      const isDryRun = config.dryRun;
      const renewedItems: string[] = [];
      const eligibleItems = new Set<string>();

      // Progressive scroll down to discover all renewal buttons
      for (let scroll = 0; scroll < 25; scroll++) {
        const buttons = page.locator(
          'div[role="button"][aria-label^="Renew listing"], button[aria-label^="Renew listing"]'
        );
        const count = await buttons.count();

        for (let i = 0; i < count; i++) {
          const btn = buttons.nth(i);
          const ariaLabel = (await btn.getAttribute('aria-label')) || '';
          const title = ariaLabel.replace(/^Renew listing\s*/i, '').trim();

          if (targetItemId && !title.toLowerCase().includes(targetItemId.toLowerCase())) {
            continue;
          }

          eligibleItems.add(title);

          if (!isDryRun && !renewedItems.includes(title)) {
            try {
              if (await btn.isVisible()) {
                await btn.scrollIntoViewIfNeeded().catch(() => {});
                await page.waitForTimeout(300);
                await btn.click();
                await page.waitForTimeout(1500);
                renewedItems.push(title);
                console.log(`🎉 [${renewedItems.length}] Successfully renewed: "${title}"`);
              }
            } catch (err: any) {
              console.log(`⚠️ Note renewing "${title}": ${err.message}`);
            }
          }
        }

        await page.evaluate(() => window.scrollBy(0, 1500));
        await page.waitForTimeout(700);
      }

      console.log(`\n============================================================`);
      if (isDryRun) {
        console.log(`🛡️ [DRY RUN COMPLETE] Found ${eligibleItems.size} listing(s) eligible for renewal:`);
        Array.from(eligibleItems).forEach((t, idx) => console.log(`   ${idx + 1}. "${t}"`));
        console.log(`👉 To renew these listings live on Facebook Marketplace, run:`);
        console.log(`   npm run renew -- --live`);
      } else {
        console.log(`🎉 Successfully renewed ${renewedItems.length} listing(s) live!`);
        renewedItems.forEach((t, idx) => console.log(`   ${idx + 1}. 🟢 "${t}"`));
      }
      console.log(`============================================================\n`);
      return;
    }

    let listings = await ListingsScraper.getActiveListings(page);

    if (targetItemId) {
      listings = listings.filter((l) => l.id === targetItemId);
      console.log(`🎯 Filtered for target item ID ${targetItemId}: ${listings.length} found.`);
    }

    if (listings.length === 0) {
      console.log('ℹ️ No active listings found to optimize.');
      return;
    }

    if (limit && limit > 0) {
      listings = listings.slice(0, limit);
      console.log(`🔢 Limiting processing to first ${listings.length} listing(s).`);
    }

    console.log(`\n📋 Processing ${listings.length} listing(s)...`);

    for (const item of listings) {
      try {
        console.log(`\n------------------------------------------------------------`);
        console.log(`📦 Listing: "${item.title}" (ID: ${item.id}) | Current Price: $${item.price}`);

        let pricingAnalysis;
        let contentOpt;

        if (['scan', 'price', 'full'].includes(action)) {
          const comps = await CompsScraper.searchMarketplaceComps(page, item.title, 8);
          pricingAnalysis = PricingOptimizer.analyzePricing(item, comps, config);

          console.log(`📊 Market Comps Summary:`);
          console.log(`   - Comps Found: ${pricingAnalysis.compCount}`);
          console.log(`   - Min: $${pricingAnalysis.minPrice} | Max: $${pricingAnalysis.maxPrice} | Median: $${pricingAnalysis.medianPrice}`);
          console.log(`   - Target Recommended Price: $${pricingAnalysis.recommendedPrice} (${pricingAnalysis.recommendation})`);
        }

        if (['title', 'description', 'full'].includes(action)) {
          contentOpt = ContentOptimizer.optimizeContent(item);
        }

        // 1. Process renewal if action is 'renew' or 'full'
        if (['renew', 'full'].includes(action)) {
          await ListingUpdater.renewListing(page, item, config);
        }

        // 2. Process listing content & price updates
        if (!['scan', 'renew'].includes(action)) {
          await ListingUpdater.updateListing(
            page,
            item,
            action === 'title' ? undefined : pricingAnalysis,
            action === 'price' ? undefined : contentOpt,
            config
          );
        }
      } catch (itemErr: any) {
        console.error(`⚠️ Error processing "${item.title}":`, itemErr.message);
      }
    }

    console.log(`\n============================================================`);
    console.log(`🎉 Optimization pipeline completed successfully!`);
    console.log(`============================================================\n`);
  } catch (err: any) {
    console.error('❌ Pipeline error:', err.message);
  } finally {
    await session.close();
  }
}
