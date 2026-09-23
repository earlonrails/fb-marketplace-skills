import { BrowserSession } from '../browser/session.js';
import { AuthManager } from '../browser/auth.js';
import { ListingsScraper } from '../scraper/listings.js';
import { CompsScraper } from '../scraper/comps.js';
import { PricingOptimizer } from '../optimizer/pricing.js';
import { ContentOptimizer } from '../optimizer/content.js';
import { ListingUpdater } from '../editor/listingUpdater.js';
import { DEFAULT_CONFIG } from '../config.js';
import { StrategyConfig } from '../types.js';

export interface SkillParams {
  action: 'login' | 'scan' | 'update-price' | 'update-title' | 'update-description' | 'fully-optimize';
  live?: boolean;
  offset?: number;
  itemId?: string;
  headed?: boolean;
}

export const FB_MARKETPLACE_TOOL_DEFINITION = {
  name: 'fb_marketplace_optimizer',
  description:
    'Automated Facebook Marketplace skill to check active items, compare market prices, and optimize prices, titles, descriptions, and tags.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['login', 'scan', 'update-price', 'update-title', 'update-description', 'fully-optimize'],
        description: 'Action to perform.',
      },
      live: {
        type: 'boolean',
        description: 'Set to true to apply live changes on Facebook. Default is false (dry run).',
      },
      offset: {
        type: 'number',
        description: 'Target pricing offset percent relative to median comp (default -5).',
      },
      itemId: {
        type: 'string',
        description: 'Optional specific listing ID to target.',
      },
      headed: {
        type: 'boolean',
        description: 'Set to true to show browser window.',
      },
    },
    required: ['action'],
  },
};

export async function executeFBMarketplaceSkill(params: SkillParams) {
  const config: StrategyConfig = {
    ...DEFAULT_CONFIG,
    dryRun: !params.live,
    headless: !params.headed,
    targetOffsetPercent: params.offset ?? DEFAULT_CONFIG.targetOffsetPercent,
  };

  const session = new BrowserSession(config);

  try {
    const { page } = await session.init();
    const authStatus = await AuthManager.checkStatus(page);

    if (params.action === 'login') {
      if (authStatus.isLoggedIn) {
        return { success: true, message: 'Already authenticated on Facebook.' };
      }
      const loggedIn = await AuthManager.promptLogin(page);
      return { success: loggedIn, message: loggedIn ? 'Login successful.' : 'Login timed out.' };
    }

    if (!authStatus.isLoggedIn) {
      return {
        success: false,
        message: 'Not logged into Facebook. Please run login action first.',
      };
    }

    let listings = await ListingsScraper.getActiveListings(page);

    if (params.itemId) {
      listings = listings.filter((l) => l.id === params.itemId);
    }

    const results = [];

    for (const item of listings) {
      let pricingAnalysis;
      let contentOpt;

      if (['scan', 'update-price', 'fully-optimize'].includes(params.action)) {
        const comps = await CompsScraper.searchMarketplaceComps(page, item.title, 8);
        pricingAnalysis = PricingOptimizer.analyzePricing(item, comps, config);
      }

      if (['update-title', 'update-description', 'fully-optimize'].includes(params.action)) {
        contentOpt = ContentOptimizer.optimizeContent(item);
      }

      let updateRes = { success: true, message: 'Scan complete' };
      if (params.action !== 'scan') {
        updateRes = await ListingUpdater.updateListing(
          page,
          item,
          params.action === 'update-title' ? undefined : pricingAnalysis,
          params.action === 'update-price' ? undefined : contentOpt,
          config
        );
      }

      results.push({
        item,
        pricing: pricingAnalysis,
        content: contentOpt,
        updateStatus: updateRes,
      });
    }

    return {
      success: true,
      action: params.action,
      dryRun: config.dryRun,
      totalProcessed: results.length,
      results,
    };
  } finally {
    await session.close();
  }
}
