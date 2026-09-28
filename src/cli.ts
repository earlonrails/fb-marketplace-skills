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
    await runPipeline({ action: 'scan', config, targetItemId: options.item });
  });

  // Command: update-price (Default action)
  addCommonOptions(
    program
      .command('update-price', { isDefault: true })
      .description('Check market comps and update listing prices to competitive pricing (Default action)')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'price', config, targetItemId: options.item });
  });

  // Command: update-title
  addCommonOptions(
    program
      .command('update-title')
      .description('Optimize titles of user listings for search reach')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'title', config, targetItemId: options.item });
  });

  // Command: update-description
  addCommonOptions(
    program
      .command('update-description')
      .description('Format and polish listing descriptions')
  ).action(async (options) => {
    const config = resolveConfig(options);
    await runPipeline({ action: 'description', config, targetItemId: options.item });
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
    await runPipeline({ action: 'full', config, targetItemId: options.item });
  });

  return program;
}

async function runPipeline({
  action,
  config,
  targetItemId,
}: {
  action: 'scan' | 'price' | 'title' | 'description' | 'renew' | 'full';
  config: StrategyConfig;
  targetItemId?: string;
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

    let listings = await ListingsScraper.getActiveListings(page);

    if (targetItemId) {
      listings = listings.filter((l) => l.id === targetItemId);
      console.log(`🎯 Filtered for target item ID ${targetItemId}: ${listings.length} found.`);
    }

    if (listings.length === 0) {
      console.log('ℹ️ No active listings found to optimize.');
      return;
    }

    console.log(`\n📋 Processing ${listings.length} listing(s)...`);

    for (const item of listings) {
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
