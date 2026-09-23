import { Page } from 'playwright';

export class AuthManager {
  static async checkStatus(page: Page): Promise<{ isLoggedIn: boolean; currentUrl: string }> {
    console.log('🔍 Checking Facebook login status via session cookies...');

    // 1. Check cookies for Facebook user session ID (c_user)
    const cookies = await page.context().cookies();
    const hasSessionCookie = cookies.some((c) => (c.name === 'c_user' || c.name === 'xs') && c.value.length > 0);

    if (!hasSessionCookie) {
      console.log('ℹ️ No active Facebook session cookie (c_user) found.');
      return { isLoggedIn: false, currentUrl: page.url() };
    }

    try {
      await page.goto('https://www.facebook.com/marketplace/you/selling', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.waitForTimeout(2000);
    } catch (err: any) {
      console.log(`ℹ️ Selling page navigation note: ${err.message}`);
    }

    const url = page.url();
    const isLoggedIn =
      !url.includes('facebook.com/login') &&
      !url.includes('facebook.com/index.php') &&
      !url.includes('checkpoint') &&
      (await page.locator('input[name="email"], input[name="pass"]').count()) === 0;

    return { isLoggedIn, currentUrl: url };
  }

  static async promptLogin(page: Page): Promise<boolean> {
    console.log('\n=============================================================');
    console.log('🔑 ATTENTION: Facebook Login Required!');
    console.log('Please log into your Facebook account in the browser window.');
    console.log('Once logged in and redirected to Marketplace, press ENTER here.');
    console.log('=============================================================\n');

    try {
      await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err: any) {
      console.log(`ℹ️ Login page navigation note: ${err.message}`);
    }

    // Wait until URL changes back to Facebook home/marketplace or user submits form
    let attempts = 0;
    while (attempts < 90) {
      try {
        const url = page.url();
        const hasInputs = (await page.locator('input[name="email"], input[name="pass"]').count()) > 0;
        if (
          !hasInputs &&
          (url.includes('/marketplace') ||
            (url.includes('facebook.com') && !url.includes('login') && !url.includes('index.php') && !url.includes('checkpoint')))
        ) {
          console.log('✅ Facebook authentication detected successfully!');
          return true;
        }
      } catch (_) {}
      await page.waitForTimeout(2000);
      attempts++;
    }

    return false;
  }
}
