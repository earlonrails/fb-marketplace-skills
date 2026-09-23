import { ListingItem, MarketComp, PricingAnalysis, StrategyConfig } from '../types.js';

export class PricingOptimizer {
  static analyzePricing(
    item: ListingItem,
    comps: MarketComp[],
    config: StrategyConfig
  ): PricingAnalysis {
    if (!comps || comps.length === 0) {
      return {
        itemId: item.id,
        originalTitle: item.title,
        currentPrice: item.price,
        compCount: 0,
        minPrice: item.price,
        maxPrice: item.price,
        medianPrice: item.price,
        recommendedPrice: item.price,
        priceDiff: 0,
        recommendation: 'KEEP',
        comps: [],
      };
    }

    // Filter extreme outliers (e.g. accessories or unrelated items priced drastically off)
    const validPrices = comps
      .map((c) => c.price)
      .filter((p) => p >= item.price * 0.2 && p <= item.price * 4.0)
      .sort((a, b) => a - b);

    const activePrices = validPrices.length > 0 ? validPrices : comps.map((c) => c.price).sort((a, b) => a - b);

    const minPrice = activePrices[0];
    const maxPrice = activePrices[activePrices.length - 1];

    // Calculate median
    const mid = Math.floor(activePrices.length / 2);
    const medianPrice =
      activePrices.length % 2 !== 0
        ? activePrices[mid]
        : Math.round((activePrices[mid - 1] + activePrices[mid]) / 2);

    let targetPrice = medianPrice;

    if (config.pricingStrategy === 'median-offset') {
      const multiplier = 1 + config.targetOffsetPercent / 100;
      targetPrice = Math.round(medianPrice * multiplier);
    } else if (config.pricingStrategy === 'lowest') {
      targetPrice = Math.max(1, minPrice - 1);
    } else if (config.pricingStrategy === 'average') {
      const avg = activePrices.reduce((sum, val) => sum + val, 0) / activePrices.length;
      targetPrice = Math.round(avg);
    }

    // Enforce reserve price floor
    const reserveFloor = Math.round(item.price * (config.minReservePricePercent / 100));
    if (targetPrice < reserveFloor) {
      console.log(`⚠️ Calculated target $${targetPrice} was below reserve floor ($${reserveFloor}). Adjusting to floor.`);
      targetPrice = reserveFloor;
    }

    const priceDiff = targetPrice - item.price;
    let recommendation: 'LOWER' | 'RAISE' | 'KEEP' = 'KEEP';
    if (priceDiff < -2) {
      recommendation = 'LOWER';
    } else if (priceDiff > 2) {
      recommendation = 'RAISE';
    }

    return {
      itemId: item.id,
      originalTitle: item.title,
      currentPrice: item.price,
      compCount: activePrices.length,
      minPrice,
      maxPrice,
      medianPrice,
      recommendedPrice: targetPrice,
      priceDiff,
      recommendation,
      comps,
    };
  }
}
