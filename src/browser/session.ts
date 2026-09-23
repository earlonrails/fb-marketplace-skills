import { chromium, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import { StrategyConfig } from '../types.js';

export class BrowserSession {
  private context: BrowserContext | null = null;
  private config: StrategyConfig;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  async init(): Promise<{ context: BrowserContext; page: Page }> {
    if (!fs.existsSync(this.config.userDataDir)) {
      fs.mkdirSync(this.config.userDataDir, { recursive: true });
    }

    this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
      headless: this.config.headless,
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const page = this.context.pages()[0] || (await this.context.newPage());
    return { context: this.context, page };
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }
}
