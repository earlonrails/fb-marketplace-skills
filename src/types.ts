export interface ListingItem {
  id: string;
  title: string;
  price: number;
  currency?: string;
  description?: string;
  category?: string;
  location?: string;
  views?: number;
  saves?: number;
  url: string;
  editUrl?: string;
}

export interface MarketComp {
  title: string;
  price: number;
  location?: string;
  url: string;
}

export interface PricingAnalysis {
  itemId: string;
  originalTitle: string;
  currentPrice: number;
  compCount: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  recommendedPrice: number;
  priceDiff: number;
  recommendation: 'LOWER' | 'RAISE' | 'KEEP';
  comps: MarketComp[];
}

export interface ContentOptimization {
  itemId: string;
  originalTitle: string;
  recommendedTitle: string;
  originalDescription: string;
  recommendedDescription: string;
  recommendedTags: string[];
}

export interface OptimizationResult {
  item: ListingItem;
  pricing?: PricingAnalysis;
  content?: ContentOptimization;
  updated: boolean;
  errors?: string[];
}

export interface StrategyConfig {
  targetOffsetPercent: number; // e.g. -5 for 5% below median comp
  pricingStrategy: 'median-offset' | 'lowest' | 'average';
  minReservePricePercent: number; // Prevent dropping price below e.g. 50% of original
  dryRun: boolean;
  headless: boolean;
  userDataDir: string;
}
