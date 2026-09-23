import path from 'path';
import dotenv from 'dotenv';
import { StrategyConfig } from './types.js';

dotenv.config();

export const DEFAULT_CONFIG: StrategyConfig = {
  targetOffsetPercent: Number(process.env.TARGET_OFFSET_PERCENT || -5), // 5% below median comp
  pricingStrategy: (process.env.PRICING_STRATEGY as any) || 'median-offset',
  minReservePricePercent: Number(process.env.MIN_RESERVE_PRICE_PERCENT || 50), // 50% floor of original listing price
  dryRun: process.env.DRY_RUN === 'true',
  headless: process.env.HEADLESS === 'true',
  userDataDir: path.resolve(process.cwd(), process.env.USER_DATA_DIR || '.fb_profile'),
};
