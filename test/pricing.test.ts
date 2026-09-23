import { ListingItem, MarketComp, StrategyConfig } from '../src/types.js';
import { PricingOptimizer } from '../src/optimizer/pricing.js';
import { ContentOptimizer } from '../src/optimizer/content.js';

const mockItem: ListingItem = {
  id: '1001',
  title: 'sony wh-1000xm4 noise cancelling headphones',
  price: 250,
  url: 'https://facebook.com/marketplace/item/1001',
};

const mockComps: MarketComp[] = [
  { title: 'Sony WH-1000XM4 Headphones', price: 200, url: 'http://example.com/1' },
  { title: 'Sony WH1000XM4 Black', price: 210, url: 'http://example.com/2' },
  { title: 'Sony WH-1000XM4 Like New', price: 220, url: 'http://example.com/3' },
  { title: 'Sony XM4 Headphones', price: 190, url: 'http://example.com/4' },
];

const mockConfig: StrategyConfig = {
  targetOffsetPercent: -5,
  pricingStrategy: 'median-offset',
  minReservePricePercent: 50,
  dryRun: true,
  headless: true,
  userDataDir: './.fb_profile',
};

console.log('🧪 Running unit tests for PricingOptimizer and ContentOptimizer...');

const pricingResult = PricingOptimizer.analyzePricing(mockItem, mockComps, mockConfig);
console.log('Pricing Analysis Result:', {
  originalPrice: pricingResult.currentPrice,
  medianPrice: pricingResult.medianPrice,
  recommendedPrice: pricingResult.recommendedPrice,
  recommendation: pricingResult.recommendation,
});

if (pricingResult.recommendedPrice < pricingResult.currentPrice && pricingResult.recommendation === 'LOWER') {
  console.log('✅ PricingOptimizer correctly calculates lower competitive target price!');
} else {
  console.error('❌ PricingOptimizer failed target price check');
  process.exit(1);
}

const contentResult = ContentOptimizer.optimizeContent(mockItem);
console.log('Content Optimization Result:', {
  recommendedTitle: contentResult.recommendedTitle,
  recommendedTags: contentResult.recommendedTags,
});

if (contentResult.recommendedTitle.includes('Great Condition') && contentResult.recommendedTags.length > 0) {
  console.log('✅ ContentOptimizer correctly formatted title and tags!');
} else {
  console.error('❌ ContentOptimizer test failed');
  process.exit(1);
}

console.log('🎉 All unit tests passed successfully!');
